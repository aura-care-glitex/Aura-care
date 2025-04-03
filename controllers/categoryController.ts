import { NextFunction, Request, Response } from "express";
import { database } from "../middlewares/database";
import AppError from "../utils/AppError";
import redis from "../middlewares/redisConfig";
import { deleteImage, uploadImage } from "../utils/s3Client";

export const createCategory = async function(req:Request, res:Response, next:NextFunction){
    try {
        const { name, description } = req.body;

        if (!name || !description) {
            return next(new AppError(`Name and description are required`, 404))
        }

        const { data, error } = await database
            .from("categories")
            .insert([{ name, description }])
            .select();

        if (error) throw error;

        res.status(201).json({ message: "Category created successfully", data });
    } catch (error) {
        return next(new AppError(`Internal server error`, 500))
    }
}

export const getAllCategories = async function(req: Request, res: Response, next: NextFunction) {
    try {
        const { page = 1, limit = 10 } = req.query;
        const start = (Number(page) - 1) * Number(limit);
        const end = start + Number(limit) - 1;

        const key = `all-categories-${page}-${limit}`;

        const cachedCategories = await redis.get(key);
        if (cachedCategories) {
            res.status(200).json(JSON.parse(cachedCategories));
            return;
        }

        // Fetch total count of categories
        const { count, error: countError } = await database
            .from("categories")
            .select("*", { count: "exact", head: true });

        if (countError) {
            return next(new AppError(`Error getting total categories: ${countError.message}`, 500));
        }

        // Fetch paginated categories along with their associated products
        const { data, error } = await database
            .from("categories")
            .select("*, products(*)")
            .order("created_at", { ascending: false })
            .range(start, end);

        if (error) {
            return next(new AppError(`Error getting categories: ${error.message}`, 500));
        }

        const response = {
            status: "success",
            data,
            page: Number(page),
            limit: Number(limit),
            totalCount: count
        };

        await redis.setex(key, 60, JSON.stringify(response));

        res.status(200).json(response);
    } catch (error) {
        return next(new AppError(`Internal server error`, 500));
    }
};

export const getSingleCategory = async function(req:Request, res:Response, next:NextFunction){
    try {
        const { id } = req.params;

        const key = `Single-category`;

        const cachedCategory = await redis.get(key);
        if(cachedCategory){
            res.status(200).json({
                status:"success",
                data: JSON.parse(cachedCategory)
            });
            return;
        }
        const { data, error } = await database
            .from("categories")
            .select("*")
            .eq("id", id)
            .single();

        if(error){
            return next(new AppError(`Error getting categories`, 401))
        }

        await redis.setex(key, 60, JSON.stringify(data));

        res.status(200).json({ status: "success", data });
    } catch (error) {
        return next(new AppError(`Internal server error`, 500))
    }
}

export const updateCategory = async function(req:Request, res:Response, next:NextFunction){
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        const { data, error } = await database
            .from("categories")
            .update({ name, description, updated_at: new Date() })
            .eq("id", id)
            .select();

        if(error){
            return next(new AppError(`Error getting categories`, 401))
        }

        res.status(200).json({ message: "Category updated successfully", data });
    } catch (error) {
        return next(new AppError(`Internal server error`, 500))
    }
}

export const deleteCategory = async function(req:Request, res:Response, next:NextFunction){
    try {
        const { id } = req.params;
        const { error } = await database.from("categories").delete().eq("id", id);

        if(error){
            return next(new AppError(`Error getting categories`, 401))
        }

        res.status(200).json({ message: "Category deleted successfully" });
    } catch (error) {
        return next(new AppError(`Internal server error`, 500))
    }
}

export const categoryImage = async function (req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;

        if (!id) {
            return next(new AppError("Category ID is required", 400));
        }

        if (!req.file) {
            return next(new AppError("No file uploaded", 400));
        }

        const { data: category, error } = await database.from("categories").select("*").eq("id", id).single();

        if (error) {
            return next(new AppError(`Database error: ${error.message}`, 500));
        }

        if (!category) {
            return next(new AppError("Category not found", 404));
        }

        // Upload new image
        const imageUploadResult = await uploadImage(req.file);

        if (!imageUploadResult) {
            return next(new AppError("Error uploading image", 500));
        }

        // Update the category imageUrl in the database
        const { error: updateError } = await database.from("categories").update({ imageurl: imageUploadResult.imageurl }).eq("id", id);

        if (updateError) {
            return next(new AppError(`Error updating category image: ${updateError.message}`, 500));
        }

        // Delete old image if it exists
        const oldImageUrl = category.imageurl;
        console.log(oldImageUrl);

        if (oldImageUrl) {
            const oldImageKey = oldImageUrl.split("/").pop();  // Extract the image key from the URL
            if (oldImageKey) {
                try {
                    await deleteImage(oldImageKey);
                    console.log("Old image deleted successfully.");
                } catch (deleteError) {
                    console.warn("Failed to delete old image. Storage may have duplicates.", deleteError);
                }
            }
        }

        res.status(200).json({
            status: "success",
            message: "Category image updated successfully",
            imageUrl: imageUploadResult.imageurl
        });

    } catch (err) {
        console.log(err);
        return next(new AppError("Internal server error", 500));
    }
};