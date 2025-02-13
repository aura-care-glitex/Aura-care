import { NextFunction, Response,Request } from "express";
import AppError from "../utils/AppError";
import {database} from "../middlewares/database";
import {deleteImage, uploadImage} from "../utils/s3Client";
import jwt, {JwtPayload} from "jsonwebtoken";

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

export const createProduct = async (req: any, res: Response, next: NextFunction) => {
    try {
        // Check for authorization header
        const authHeaders = req.headers.authorization;

        if (!authHeaders) {
            return next(new AppError(`Authorization header is required`, 400));
        }

        const token = authHeaders.split(" ")[1];

        if (!token) {
            return next(new AppError(`Token is missing`, 401));
        }

        // Decode token
        const decodedToken: any = jwt.verify(token, process.env.JWT_SECRET as string);

        if (!decodedToken || !decodedToken.id) {
            return next(new AppError(`Invalid token`, 401));
        }

        console.log(decodedToken.id);

        // Fetch the user from the database
        const { data: user, error: userError } = await database.from('users').select('role').eq('id', decodedToken.id).single();

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

        const { product_name, brand, size, key_ingredients, skin_type, texture, usage } = req.body;

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
            texture,
            usage,
            user_id: decodedToken.id
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

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { productId } = req.params;
        const updateData = req.body; // No need for destructuring

        console.log("Received Update Request for Product ID:", productId);
        console.log("Update Data:", updateData);

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