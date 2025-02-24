import { NextFunction, Response,Request } from "express";
import AppError from "../utils/AppError";
import {database} from "../middlewares/database";
import {deleteImage, uploadImage} from "../utils/s3Client";
import redis from "../middlewares/redisConfig";
import { decodedToken } from "../middlewares/authorization";

export const getAllProducts = async function (req: Request, res: Response, next:NextFunction) {
    try {
        const key = 'products:all'

        const cachedProducts = await redis.get(key);

        if ( cachedProducts) {
            res.status(200).json({
                status:'success',
                products: JSON.parse(cachedProducts)
            });
            return
        }

        let { data:products, error } = await database.from("products").select('*');
        if(products?.length === 0) {
            return next(new AppError(`No products found`, 400));
        }
        if(error){
            return next(new AppError(`Error getting product`, 400));
        }

        await redis.setex(key, 60, JSON.stringify(products) )

        res.status(200).json({
            status:"success",
            data:products
        })
    }catch(err){
        return next (new AppError("Internal server error", 500))
    }
}

export const createProduct = async (req: any, res: Response, next: NextFunction) => {
    try {

        const userId = await decodedToken(req.token)

        // Fetch the user from the database
        const { data: user, error: userError } = await database.from('users').select('role').eq('id', userId).single();

        if (!user) {
            return next(new AppError(`User not found`, 404)); // User not found error
        }

        if(userError){
            return next(new AppError(`Error getting user`, 404))
        }

        // Check if the user has an "admin" role
        if (user.role !== 'admin') {
            return next(new AppError(`You are not authorized to create a product`, 403));
        }

        const { product_name, brand, size, key_ingredients, skin_type, texture, usage,imageurl ,price,stock_quantity , category} = req.body;

        // Check if all necessary fields are provided
        if (!product_name || !brand || !size || !key_ingredients || !skin_type || !texture || !usage) {
            return next(new AppError(`All product details are required`, 400));
        }

        // Insert the product into the database
        const { data, error } = await database.from('products').insert([{
            product_name,
            brand,
            size,
            key_ingredients,
            skin_type,
            imageurl,
            category,
            price,
            stock_quantity,
            texture,
            usage,
            user_id: userId
        }]).select();

        if (error) {
            return next(new AppError(`Error creating product: ${error.message}`, 500));
        }

        res.status(201).json({
            status: "success",
            data: data,
        });
    } catch (err) {
        return next(new AppError(`Internal server error`, 500));
    }
};

export const getSingleProduct = async function (req:Request, res:Response, next:NextFunction){
    try {
        const { productId } = req.params;

        const key = "single-product";

        const cachedProduct = await redis.get(key);

        if(cachedProduct){
            res.status(200).json({
                status:"success",
                product: JSON.parse(cachedProduct)
            });
            return
        }

        if(!productId){
            return next(new AppError(`Product id is needed`, 401))
        }

        let { data, error } = await database.from("products").select("*").eq("id", productId);

        if(error){
            return next(new AppError(`Error getting a single product`, 401))
        }

        await redis.setex(key, 60, JSON.stringify(data))

        res.status(200).json({
            status:"success",
            data:data
        })
    }catch (err) {
        return next(new AppError(`Internal server error`, 500));
    }
}

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { productId } = req.params;
        const updateData = req.body; // No need for destructuring

        if (!productId) {
            return next(new AppError("Product ID is required", 400));
        }

        // Check if the product exists in the database
        const { data: products, error: productError } = await database
            .from("products")
            .select("*")
            .eq("id", productId);

        if (productError) {
            return next(new AppError(`Error getting product: ${productError.message}`, 500));
        }

        if (!products || products.length === 0) {
            return next(new AppError("Product not found", 404));
        }

        // Validate updateData
        if (Object.keys(updateData).length === 0) {
            return next(new AppError("At least one field must be provided for update", 400));
        }

        // Update product
        const { data, error } = await database
            .from("products")
            .update(updateData)
            .eq("id", productId)
            .select();

        if (error) {
            return next(new AppError(`Error updating product: ${error.message}`, 400));
        }

        res.status(200).json({
            status: "success",
            message: "Product updated successfully",
            updatedProduct: data,
        });
    } catch (err) {
        return next(new AppError("Internal server error", 500));
    }
};


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

        if (!req.file) {
            return next(new AppError("No file uploaded", 400));
        }

        const { data: product, error } = await database.from("products").select("*").eq("id", productId);

        if (error) {
            return next(new AppError(`Database error: ${error.message}`, 500));
        }

        if (!product || product.length === 0) {
            return next(new AppError("Product not found", 404));
        }

        // Upload new image
        const imageUploadResult = await uploadImage(req.file);

        if (!imageUploadResult) {
            return next(new AppError("Error uploading image", 500));
        }

        // Update the product imageUrl in the database
        const { error: updateError } = await database.from("products").update({ imageurl: imageUploadResult.imageUrl }).eq("id", productId);

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
            imageUrl: imageUploadResult.imageUrl
        });

    } catch (err) {
        console.log(err)
        return next(new AppError("Internal server error", 500));
    }
};