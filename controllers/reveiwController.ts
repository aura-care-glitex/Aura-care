import {NextFunction, Request, Response} from "express";
import AppError from "../utils/AppError";
import {database} from "../middlewares/database";
import jwt from "jsonwebtoken";

export const getAllReviews = async function (req: Request, res: Response, next:NextFunction) {
    try {
        let { data:reviews, error } = await database.from("reviews").select("*");
        if(!(reviews) || reviews.length === 0) {
            return next(new AppError(`No reviews found`, 400));
        }

        if(error){
            return next(new AppError(`Error getting reviews`, 400));
        }

        res.status(200).json({
            status:"success",
            reviews:reviews
        })
    }catch(err){
        return next(new AppError('Internal server error', 500));
    }
}

export const getSingleReview = async function (req:Request, res:Response, next:NextFunction){
    try {
        const { reviewId } = req.params;
        
        if(!reviewId){
            return next(new AppError(`review id is needed`, 400))
        }

        let { data, error } = await database.from("reviews").select("*").eq('id', reviewId);

        if(error){
            return next(new AppError(`Error getting a single review`, 402))
        }

        res.status(200).json({
            status:"success",
            review:data
        })
    }catch(err){
        return next(new AppError(`Internal server error`, 500))
    }
}

export const createReview = async function (req: Request, res: Response, next: NextFunction) {
    try {
        const { review, product_id } = req.body;

        if (!review || !product_id) {
            return next(new AppError("Review and Product ID are required", 400));
        }

        // Extract authorization header
        const authHeaders = req.headers.authorization;
        if (!authHeaders) {
            return next(new AppError("No authorization headers provided", 401));
        }

        const token = authHeaders.split(" ")[1];
        if (!token) {
            return next(new AppError("Invalid authorization header format", 401));
        }

        // Decode JWT Token
        let decodedToken: any;
        try {
            decodedToken = jwt.verify(token, process.env.JWT_SECRET as string);
        } catch (error) {
            return next(new AppError("Invalid or expired token", 403));
        }

        // Fetch user from database
        const { data: user, error: userError } = await database.from("users").select("*").eq("id", decodedToken.id).single();

        if (userError || !user) {
            return next(new AppError("User not found", 404));
        }

        // Insert review into the database
        const { data: createdReview, error: insertError } = await database.from("reviews").insert([{ name: user.username, date: new Date().toISOString(), review, user_id: decodedToken.id, product_id,}]).select("*");

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

export const updateReview = async function (req:Request, res:Response, next:NextFunction){
    try {
        const { reviewId } = req.params;
        const updateBody = req.body

        if (!reviewId) {
            return next(new AppError("Review and Product ID are required", 400));
        }

        // Extract authorization header
        const authHeaders = req.headers.authorization;
        if (!authHeaders) {
            return next(new AppError("No authorization headers provided", 401));
        }

        const token = authHeaders.split(" ")[1];
        if (!token) {
            return next(new AppError("Invalid authorization header format", 401));
        }

        // Decode JWT Token
        let decodedToken: any;
        try {
            decodedToken = jwt.verify(token, process.env.JWT_SECRET as string);
        } catch (error) {
            return next(new AppError("Invalid or expired token", 403));
        }

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
        const { data: user, error: userError } = await database.from("users").select("*").eq("id", decodedToken.id).single();

        if (userError || !user) {
            return next(new AppError("User not found", 404));
        }

        if(user.id != decodedToken.id) {
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

export const deleteReview = async function (req:Request, res:Response, next:NextFunction){
    try {
        const { reviewId } = req.params;

        if (!reviewId) {
            return next(new AppError("Review id is required", 400));
        }

        // Extract authorization header
        const authHeaders = req.headers.authorization;
        if (!authHeaders) {
            return next(new AppError("No authorization headers provided", 401));
        }

        const token = authHeaders.split(" ")[1];
        if (!token) {
            return next(new AppError("Invalid authorization header format", 401));
        }

        // Decode JWT Token
        let decodedToken: any;
        try {
            decodedToken = jwt.verify(token, process.env.JWT_SECRET as string);
        } catch (error) {
            return next(new AppError("Invalid or expired token", 403));
        }

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
        const { data: user, error: userError } = await database.from("users").select("*").eq("id", decodedToken.id).single();

        if (userError || !user) {
            return next(new AppError("User not found", 404));
        }

        if(user.id != decodedToken.id) {
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