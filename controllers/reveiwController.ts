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
        let query = database.from("reviews").select("*").range(offset, offset + limit - 1);

        if (rating) {
            query = query.eq("rating", Number(rating));
        }
        if (search) {
            query = query.ilike("comment", `%${search}%`);
        }

        const cacheKey = `reviews:page-${page}:limit-${limit}:rating-${rating || 'all'}:search-${search || 'none'}`;

        // Check Redis cache
        const cachedReviews = await redis.get(cacheKey);
        if (cachedReviews) {
            res.status(200).json({
                status: "success",
                reviews: JSON.parse(cachedReviews),
                page,
                limit
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
            data: reviews,
            page,
            limit
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

        let { data:review, error } = await database.from("reviews").select("*").eq('id', reviewId);

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
        const { review, product_id } = req.body;

        if (!review || !product_id) {
            return next(new AppError("Review and Product ID are required", 400));
        }

        const userId = await decodedToken(req.token)

        // Fetch user from database
        const { data: user, error: userError } = await database.from("users").select("*").eq("id", userId).single();

        if (userError || !user) {
            return next(new AppError("User not found", 404));
        }

        // Insert review into the database
        const { data: createdReview, error: insertError } = await database.from("reviews").insert([{ name: user.username, date: new Date().toISOString(), review, user_id: userId, product_id,}]).select("*");

        if (insertError) {
            return next(new AppError(`Error creating review`, 500));
        }

        res.status(201).json({
            status: "success",
            message: "Review created successfully",
            review: createdReview
        });

    } catch (err) {
        console.error("Error creating review:", err);
        return next(new AppError("Internal server error", 500));
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
        const { data: review, error: reviewError } = await database.from("reviews").select("*").eq("id", reviewId);

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
        const { data:update, error } = await database.from("reviews").update(updateBody).eq("id", reviewId).select();

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
        const { data: review, error: reviewError } = await database.from("reviews").select("*").eq("id", reviewId);

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
        const { data:update, error } = await database.from("reviews").delete().eq("id", reviewId);

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