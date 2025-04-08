import { Request, Response, NextFunction } from "express";
import { database } from "../middlewares/database";
import AppError from "../utils/AppError";

// Get all shipping fees (with optional pagination & filtering)
export const getAllShippingFees = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page = 1, limit = 10, location } = req.query;

        const start = (Number(page) - 1) * Number(limit);
        const end = start + Number(limit) - 1;

        let query = database.from("psv_stages").select("*");

        if (location) query = query.ilike("location", `%${location}%`);

        const { data, error } = await query.range(start, end);

        if (error) return next(new AppError("Error fetching shipping fees", 500));

        // Fetch total count of categories
        const { count, error: countError } = await database
            .from("psv_stages")
            .select("*", { count: "exact", head: true });
    
        if (countError) {
            return next(new AppError(`Error getting total products: ${countError.message}`, 500));
        }

        res.status(200).json({ 
            status: "success", 
            data :data,
            page,
            limit,
            totalCount: count
        });
    } catch (err) {
        return next(new AppError("Error fetching shipping fees", 500));
    }
};

// Get a single shipping fee by ID
export const getSingleShippingFee = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const { data, error } = await database
            .from("psv_stages")
            .select("*")
            .eq("id", id)
            .single();

        if (error || !data) return next(new AppError("Shipping fee not found", 404));

        res.status(200).json({ status: "success", data });
    } catch (err) {
        return next(new AppError("Error fetching shipping fee", 500));
    }
};

// Create a new shipping fee
export const createShippingFee = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, delivery_fee } = req.body;

        if (!name || !delivery_fee) return next(new AppError("Location name and delivery fees are required", 400));

        const { data, error } = await database
            .from("psv_stages")
            .insert([{ name, delivery_fee }])
            .select()
            .single();

        if (error) return next(new AppError("Error creating shipping fee", 500));

        res.status(201).json({ status: "success", data });
    } catch (err) {
        return next(new AppError("Error creating shipping fee", 500));
    }
};

// Update a shipping fee by ID
export const updateShippingFee = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { name, delivery_fee } = req.body;

        const { data, error } = await database
            .from("psv_stages")
            .update({ name, delivery_fee })
            .eq("id", id)
            .select()
            .single();

        if (error || !data) return next(new AppError("Shipping fee not found", 404));

        res.status(200).json({ status: "success", data });
    } catch (err) {
        return next(new AppError("Error updating shipping fee", 500));
    }
};

// Delete a shipping fee by ID
export const deleteShippingFee = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const { error } = await database.from("psv_stages").delete().eq("id", id);

        if (error) return next(new AppError("Shipping fee not found", 404));

        res.status(200).json({
            data: null
        }); 
    } catch (err) {
        return next(new AppError("Error deleting shipping fee", 500));
    }
};
