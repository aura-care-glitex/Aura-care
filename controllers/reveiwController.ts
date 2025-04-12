import {NextFunction, Request, Response} from "express";
import AppError from "../utils/AppError";
import {database} from "../middlewares/database";
import redis from "../middlewares/redisConfig";
import { decodedToken } from "../middlewares/authorization";

export const getAllReviews=async function(req: Request, res: Response, next: NextFunction) {
    try {
        let { page = 1, limit = 10, rating, search } = req.query;

        // Convert pagination params to numbers
        page = Number(page);
        limit = Number(limit);
        const offset = (page - 1) * limit;

        // Constructing filtering conditions
        let query = database.from("product_reviews").select("*").range(offset, offset + limit - 1);

        if (rating) {
            query = query.eq("rating", Number(rating));
        }
        if (search) {
            query = query.ilike("comment", `%${search}%`);
        }

        const { count, error: countError } = await database
            .from("product_reviews")
            .select("*", { count: "exact", head: true });

        if (countError) {
            return next(new AppError(`Error getting total reviews: ${countError.message}`, 500));
        }

        const cacheKey = `reviews:page-${page}:limit-${limit}:rating-${rating || 'all'}:search-${search || 'none'}`;

        // Check Redis cache
        const cachedReviews = await redis.get(cacheKey);
        if (cachedReviews) {
            res.status(200).json({
                status: "success",
                reviews: JSON.parse(cachedReviews),
                page,
                limit,
                totalCount: count
            });
            return
        }

        // Fetch from database
        const { data: reviews, error } = await query;

        if (!reviews || reviews.length === 0) {
            return next(new AppError(`No reviews found`, 404));
        }
        if (error) {
            return next(new AppError(`Error fetching reviews`, 400));
        }

        // Store in Redis cache for 60 seconds
        await redis.setex(cacheKey, 60, JSON.stringify(reviews));

        res.status(200).json({
            status: "success",
            reviews: reviews,
            page: Number(page),
            limit: Number(limit),
            totalCount: count
        });

    } catch (err) {
        return next(new AppError("Internal server error", 500));
    }
}

export const getSingleReview = async function (req:Request, res:Response, next:NextFunction){
    try {
        const { reviewId } = req.params;

        const key = 'singleReview'+req.params.reviewId;

        const cachedReview = await redis.get(key);

        if(cachedReview){
            res.status(200).json({
                status:"success",
                review: JSON.parse(cachedReview)
            })
            return
        }
        
        if(!reviewId){
            return next(new AppError(`review id is needed`, 400))
        }

        let { data:review, error } = await database.from("product_reviews").select("*").eq('id', reviewId);

        if(error){
            return next(new AppError(`Error getting a single review`, 402))
        }

        await redis.setex(key, 60, JSON.stringify(review))

        res.status(200).json({
            status:"success",
            review:review
        })
    }catch(err){
        return next(new AppError(`Internal server error`, 500))
    }
}

export const createReview = async function (req: any, res: Response, next: NextFunction) {
  try {
    const { product_id, rating, review } = req.body;

    const user_id = await decodedToken(req.token);

    // Step 1: Check if user has any order containing this product
    const { data: orderItems, error: orderItemsError } = await database
      .from('order_items')
      .select('id, order_id')
      .eq('product_id', product_id);

    if (orderItemsError) throw orderItemsError;
    if (!orderItems || orderItems.length === 0) {
       res.status(400).json({
        status: 'Fail',
        message: 'This product has not been purchased.',
      });
      return
    }

    // Step 2: Check if any of those order_ids belong to this user
    const orderIds = orderItems.map((item) => item.order_id);

    const { data: userOrders, error: userOrdersError } = await database
      .from('orders')
      .select('id')
      .in('id', orderIds)
      .eq('user_id', user_id);

    if (userOrdersError) throw userOrdersError;
    if (!userOrders || userOrders.length === 0) {
       res.status(400).json({
        status: 'Fail',
        message: 'This product has not yet been purchased by you.',
      });
      return
    }

    // Step 3: Get the matching order_item_id
    const orderItemId = orderItems.find((item) => userOrders.find((order) => order.id === item.order_id))?.id;

    if (!orderItemId) {
       res.status(400).json({
        status: 'Fail',
        message: 'No matching order item found.',
      });
      return
    }

    // Step 4: Insert Review
    const { error: reviewError } = await database.from('product_reviews').insert({
      user_id,
      product_id,
      order_item_id: orderItemId,
      rating,
      review,
    });

    if (reviewError) throw reviewError;

    // Step 5: Update average rating for the product
    const { data: allReviews, error: allReviewsError } = await database
      .from('product_reviews')
      .select('rating')
      .eq('product_id', product_id);

    if (allReviewsError) throw allReviewsError;

    const totalRating = allReviews.reduce((sum, item) => sum + item.rating, 0);
    const avgRating = totalRating / allReviews.length;

    await database
      .from('products')
      .update({ average_rating: avgRating })
      .eq('id', product_id);

    res.status(201).json({
      status: 'Success',
      message: 'Review added successfully!',
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: 'Fail',
      message: 'Error adding review.',
    });
  }
};
  

export const updateReview = async function (req:any, res:Response, next:NextFunction){
    try {
        const { reviewId } = req.params;
        const updateBody = req.body

        if (!reviewId) {
            return next(new AppError("Review and Product ID are required", 400));
        }

        const userId = await decodedToken(req.token)

        // get the review from the database
        const { data: review, error: reviewError } = await database.from("product_reviews").select("*").eq("id", reviewId);

        if (reviewError) {
            return next(new AppError(`Error getting product: ${reviewError.message}`, 500));
        }

        if (!review || review.length === 0) {
            return next(new AppError("review not found", 404));
        }

        // check if this user belongs to that review
        // Fetch user from database
        const { data: user, error: userError } = await database.from("users").select("*").eq("id", userId).single();

        if (userError || !user) {
            return next(new AppError("User not found", 404));
        }

        if(user.id != userId) {
            return next(new AppError(`You are not allowed to perform this action`, 402))
        }

        //validate review object
        if(Object.keys(updateBody).length === 0){
            return next(new AppError(`At least one field must be provided`, 404));
        }

        // update the review
        const { data:update, error } = await database.from("product_reviews").update(updateBody).eq("id", reviewId).select();

        if(error){
            return next(new AppError(`Error updating`, 401))
        }

        res.status(200).json({
            status:"success",
            message:"review updated successfully",
            data: update,
        })
    }catch(err){
        return next(new AppError(`Internal server error`, 500));
    }
}

export const deleteReview = async function (req:any, res:Response, next:NextFunction){
    try {
        const { reviewId } = req.params;

        if (!reviewId) {
            return next(new AppError("Review id is required", 400));
        }

        const userId = await decodedToken(req.token)

        // get the review from the database
        const { data: review, error: reviewError } = await database.from("product_reviews").select("*").eq("id", reviewId);

        if (reviewError) {
            return next(new AppError(`Error getting product: ${reviewError.message}`, 500));
        }

        if (!review || review.length === 0) {
            return next(new AppError("review not found", 404));
        }

        // check if this user belongs to that review
        // Fetch user from database
        const { data: user, error: userError } = await database.from("users").select("*").eq("id", userId).single();

        if (userError || !user) {
            return next(new AppError("User not found", 404));
        }

        if(user.id != userId) {
            return next(new AppError(`You are not allowed to perform this action`, 402))
        }

        // delete the review
        const { data:update, error } = await database.from("product_reviews").delete().eq("id", reviewId);

        if(error){
            return next(new AppError(`Error updating`, 401))
        }

        res.status(200).json({
            status:"success",
            message:"review updated successfully",
            data: null,
        })
    }catch(err){
        return next(new AppError(`Internal server error`, 500));
    }
}