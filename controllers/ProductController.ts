import { NextFunction, Response,Request } from "express";
import AppError from "../utils/AppError";
import {database} from "../middlewares/database";
import {deleteImage, uploadImage} from "../utils/s3Client";
import redis from "../middlewares/redisConfig";
import { decodedToken } from "../middlewares/authorization";

export const getAllProducts = async function (req: Request, res: Response, next: NextFunction) {
    try {
        let { page = 1, limit = 10, category, minPrice, maxPrice, search, brand, texture } = req.query;

        // Convert pagination params to numbers
        page = Number(page);
        limit = Number(limit);
        const offset = (page - 1) * limit;

        // Constructing filtering conditions
        let query = database.from("products").select('*').range(offset, offset + limit - 1);

        if (category) {
            query = query.eq('category', category);
        }
        if (brand) {
            query = query.eq('brand', brand);
        }
        if (texture) {
            query = query.eq('texture', texture);
        }
        if (minPrice) {
            query = query.gte('price', Number(minPrice));
        }
        if (maxPrice) {
            query = query.lte('price', Number(maxPrice));
        }
        if (search) {
            query = query.ilike('name', `%${search}%`);
        }

        const key = `products:page-${page}:limit-${limit}:category-${category || 'all'}:price-${minPrice || '0'}-${maxPrice || 'max'}:search-${search || 'none'}`;


        // Fetch total count of categories
        const { count, error: countError } = await database
            .from("products")
            .select("*", { count: "exact", head: true });
    
        if (countError) {
            return next(new AppError(`Error getting total products: ${countError.message}`, 500));
        }

        // Check Redis cache
        const cachedProducts = await redis.get(key);
        if (cachedProducts) {
            res.status(200).json({
                status: 'success',
                products: JSON.parse(cachedProducts),
                page,
                limit,
                totalCount: count
            });
            return
        }

        // Fetch from database
        const { data: products, error } = await query;

        if (!products || products.length === 0) {
            return next(new AppError(`No products found`, 404));
        }
        if (error) {
            return next(new AppError(`Error fetching products`, 400));
        }

        // Store in Redis cache for 60 seconds
        await redis.setex(key, 60, JSON.stringify(products));

        res.status(200).json({
            status: "success",
            data: products,
            page,
            limit,
            totalCount: count
        });

        await redis.setex(key, 60, JSON.stringify(products));

    } catch (err) {
        return next(new AppError("Internal server error", 500));
    }
};

export const createProduct = async (req: any, res: Response, next: NextFunction) => {
    try {
        const userId = await decodedToken(req.token);
        console.log(userId)
        // Fetch the user from the database
        const { data: user, error: userError } = await database.from('users').select('role').eq('id', userId).single();
        console.log(user)

        if (!user) {
            return next(new AppError(`User not found`, 404)); // User not found error
        }

        if(userError){
            return next(new AppError(`Error getting user`, 404))
        }

        const { product_name, brand, size, key_ingredients,description, skin_type, texture, usage,imageurl ,price,stock_quantity ,category} = req.body;

        // Check if all necessary fields are provided
        if (!product_name || !brand || !size || !key_ingredients || !skin_type || !texture || !usage) {
            return next(new AppError(`All product details are required`, 400));
        }

        // Fetch the category ID correctly
        const { data: categoryData, error: categoryError } = await database
            .from("categories")
            .select("id")
            .eq("name", category);

        console.log(categoryData);

        if (categoryError) return next(new AppError(`Error fetching category: ${categoryError.message}`, 500));
        if (!categoryData || categoryData.length === 0) return next(new AppError(`Category not found`, 404)); // Prevents undefined error

        const categoryId = categoryData[0].id;  // Safely extract the UUID

        // Insert the product into the database
        const { data, error } = await database.from('products').insert([{
            product_name,
            brand,
            size,
            key_ingredients,
            skin_type,
            imageurl,
            category,
            category_id: categoryId,  // Use extracted UUID
            price,
            stock_quantity,
            texture,
            usage,
            Description: description
        }]).select();


        if (error) {
            return next(new AppError(`Error creating product: ${error.message}`, 500));
        }

        res.status(201).json({
            status: "success",
            data: data,
        });
    } catch (err) {
        console.log(err)
        return next(new AppError(`Internal server error`, 500));
    }
};

export const getSingleProduct = async function (req:Request, res:Response, next:NextFunction){
    try {
        const { productId } = req.params;

        const key = `single-product-${productId}`;

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
            product:data
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

        const { data: product, error } = await database.from("products").select("*").eq("id", productId).single();

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
        const { error: updateError } = await database.from("products").update({ imageurl: imageUploadResult.imageurl }).eq("id", productId);

        if (updateError) {
            return next(new AppError(`Error updating product image: ${updateError.message}`, 500));
        }

        // Delete old image if it exists
        const oldImageUrl = product?.imageurl;
        console.log(oldImageUrl)

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
            imageUrl: imageUploadResult.imageurl
        });

    } catch (err) {
        console.log(err)
        return next(new AppError("Internal server error", 500));
    }
};