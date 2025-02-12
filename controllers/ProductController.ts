import { NextFunction, Response,Request } from "express";
import AppError from "../utils/AppError";
import {database} from "../middlewares/database";
import {deleteImage, uploadImage} from "../utils/s3Client";

export const getAllProducts = async function (req: Request, res: Response, next:NextFunction) {
    try {
        let { data:products, error } = await database.from("products").select('*');
        if(products?.length === 0) {
            return next(new AppError(`No products found`, 400));
        }
        if(error){
            return next(new AppError(`Error getting product`, 400));
        }

        res.status(200).json({
            status:"success",
            data:products
        })
    }catch(err){
        return next (new AppError("Internal server error", 500))
    }
}

export const createProduct = async function(req:any, res:Response, next:NextFunction){
    try {
        const user_id = req.user.id

        const { product_name, brand, size, key_ingredients, skin_type, texture, usage } = req.body;

        const { data, error } = await database.from('products').insert([{product_name, brand, size, key_ingredients, skin_type, texture, usage, user_id}]).select();

        if(error){
            return next(new AppError(`Error creating a product`, 401))
        }

        res.status(200).json({
            status:"success",
            data:data
        })
    }catch (err) {
        return next(new AppError(`Internal server error`, 500));
    }
}

export const getSingleProduct = async function (req:Request, res:Response, next:NextFunction){
    try {
        const { productId } = req.params;

        if(!productId){
            return next(new AppError(`Product id is needed`, 401))
        }

        let { data, error } = await database.from("products").select("*").eq("id", productId);

        if(error){
            return next(new AppError(`Error getting a single product`, 401))
        }

        res.status(200).json({
            status:"success",
            data:data
        })
    }catch (err) {
        return next(new AppError(`Internal server error`, 500));
    }
}

export const updateProduct = async function (req:Request, res:Response, next:NextFunction){
    try {
        const { productId } = req.params;
        const { updateData } = req.body;

        if(!productId){
            return next(new AppError(`product id is needed`, 400))
        }

        if(Object.keys(updateData).length === 0){
            return next(new AppError(`At least one field should be provided for update`, 400))
        }

        let { error: updateError } = await database.from("products").update(updateData).eq('id', productId);

        if(updateError){
            return next(new AppError(`Error updating a product`, 401))
        }

        res.status(200).json({
            status:"success",
            message: "Product updated successfully"
        })
    }catch (err) {
        return next(new AppError(`Internal server error`, 500))
    }
}

export const deleteProduct = async function(req:Request, res:Response, next:NextFunction){
    try {
        const { productId } = req.params;

        if(!productId){
            return next(new AppError(`Product id is needed`, 401))
        }

        const { error } = await database.from("products").delete().eq('id', productId);
        if(error){
            return next(new AppError(`Error deleting a product`, 400))
        }

        res.status(200).json({
            status:"success",
            message: "product deleted successfully"
        })
    }catch(err){
        return next (new AppError(`Internal server error`, 500))
    }
}

export const productImage = async function (req: Request, res: Response, next: NextFunction) {
    try {
        const { productId } = req.params;

        if (!productId) {
            return next(new AppError("Product ID is required", 400));
        }

        // Check if the product exists in the database
        const { data: product, error } = await database.from("products").select("*").eq("id", productId);

        if (error) {
            return next(new AppError(`Database error: ${error.message}`, 500));
        }

        if (!product || product.length === 0) {
            return next(new AppError("Product not found", 404));
        }

        // Upload new image
        const imageUrl = await uploadImage(req.file);

        if (!imageUrl) {
            return next(new AppError("Error uploading image", 500));
        }

        // Update the product imageUrl in the database
        const { error: updateError } = await database.from("products").update({ imageUrl }).eq("id", productId);

        if (updateError) {
            return next(new AppError(`Error updating product image: ${updateError.message}`, 500));
        }

        // Delete old image if it exists
        const oldImageUrl = product[0].imageUrl;

        if (oldImageUrl) {
            const oldImageKey = oldImageUrl.split("/").pop(); // Extract the image key
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
            message: "Product image updated successfully",
            imageUrl: imageUrl
        });

    } catch (err) {
        return next(new AppError("Internal server error", 500));
    }
};