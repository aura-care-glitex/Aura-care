import { NextFunction, Request, Response } from "express";
import AppError from "../utils/AppError";
import { database } from "../middlewares/database";
import { decodedToken } from "../middlewares/authorization";
import redis from "../middlewares/redisConfig";

export const getAllCart = async function (req: any, res: Response, next: NextFunction) {
    try {
        const cartProducts = "cartProductKey:All";

        const cachedCartProduct = await redis.get(cartProducts)

        if(cachedCartProduct){
            res.status(200).json({
                status:"success",
                cartproduct:JSON.parse(cachedCartProduct)
            })
            return
        }

        const userId = await decodedToken(req.token)

        if (!userId) {
            return next(new AppError("userId is required", 401));
        }

        // Get the products from the cart belonging to that user
        const { data: cartItems, error: cartError } = await database
            .from('cart')
            .select("product_id, quantity")
            .eq("user_id", userId);

        if (cartError) {
            return next(new AppError(`Error retrieving cart items: ${cartError.message}`, 401));
        }

        // Extract product IDs
        const productIds = cartItems.map(item => item.product_id);
        if (productIds.length === 0) {
             res.status(200).json({
                status: "success",
                data: []
            });
            return
        }

        // Get the product details from the database
        const { data: products, error: productError } = await database
            .from('products')
            .select("id, product_name, price")
            .in("id", productIds);

        if (productError) {
            return next(new AppError(`Error getting products: ${productError.message}`, 402));
        }

        // Merge product details with cart quantity
        const cartWithDetails = products.map(product => {
            const cartItem = cartItems.find(item => item.product_id === product.id);
            return {
                ...product,
                quantity: cartItem ? cartItem.quantity : 1 // Default to 1 if not found (shouldn't happen)
            };
        });

        // add the product details to the cache
        await redis.setex(cartProducts, 60, JSON.stringify(cartWithDetails));

        res.status(200).json({
            status: "success",
            data: cartWithDetails
        });

    } catch (error) {
        console.error(error);
        return next(new AppError("Internal server error", 500));
    }
};


export const addToCart = async function (req: any, res: Response, next: NextFunction) {
    try {
        const userId = await decodedToken(req.token)

        const { productId, quantity = 1 } = req.body;

        if (!userId || !productId) {
            return next(new AppError("userId and productId are required", 400));
        }

        // Check if the product is already in the cart
        const { data: existingCartItem, error: fetchError } = await database
            .from('cart')
            .select("id, quantity")
            .eq("user_id", userId)
            .eq("product_id", productId)
            .single();

        if (fetchError && fetchError.code !== "PGRST116") { // Ignore "No rows found" error
            return next(new AppError(`Error fetching cart item: ${fetchError.message}`, 500));
        }

        if (existingCartItem) {
            // Update the quantity
            const newQuantity = existingCartItem.quantity + quantity;
            const { error: updateError } = await database
                .from('cart')
                .update({ quantity: newQuantity })
                .eq("id", existingCartItem.id);

            if (updateError) {
                return next(new AppError(`Error updating cart: ${updateError.message}`, 500));
            }
        } else {
            // Insert a new cart item
            const { error: insertError } = await database
                .from('cart')
                .insert([{ user_id: userId, product_id: productId, quantity }]);

            if (insertError) {
                return next(new AppError(`Error adding to cart: ${insertError.message}`, 500));
            }
        }

        res.status(200).json({
            status: "success",
            message: "Product added to cart successfully"
        });

    } catch (error) {
        console.error(error);
        return next(new AppError("Internal server error", 500));
    }
};

export const decrementCartItem = async function (req: any, res: Response, next: NextFunction) {
    try {
        const userId = await decodedToken(req.token)

        const { productId } = req.body;

        if (!userId || !productId) {
            return next(new AppError("userId and productId are required", 400));
        }

        // Retrieve the current quantity of the product in the cart
        const { data: cartItem, error: fetchError } = await database
            .from('cart')
            .select("quantity")
            .eq("user_id", userId)
            .eq("product_id", productId)
            .single();

        if (fetchError) {
            return next(new AppError(`Error retrieving cart item: ${fetchError.message}`, 500));
        }

        if (!cartItem) {
            return next(new AppError("Cart item not found", 404));
        }

        const newQuantity = cartItem.quantity - 1;

        if (newQuantity > 0) {
            // Update the quantity in the cart
            const { error: updateError } = await database
                .from('cart')
                .update({ quantity: newQuantity })
                .eq("user_id", userId)
                .eq("product_id", productId);

            if (updateError) {
                return next(new AppError(`Error updating quantity: ${updateError.message}`, 500));
            }

             res.status(200).json({
                status: "success",
                message: "Quantity decreased successfully",
                quantity: newQuantity
            });
            return
        } else {
            // Remove the item from the cart if quantity is 0
            const { error: deleteError } = await database
                .from('cart')
                .delete()
                .eq("user_id", userId)
                .eq("product_id", productId);

            if (deleteError) {
                return next(new AppError(`Error removing cart item: ${deleteError.message}`, 500));
            }

             res.status(200).json({
                status: "success",
                message: "Product removed from cart"
            });
            return
        }

    } catch (error) {
        console.error(error);
        return next(new AppError("Internal server error", 500));
    }
};


export const deleteCartItem = async function (req: any, res: Response, next: NextFunction) {
    try {
        const userId = await decodedToken(req.token)

        const { productId } = req.body;

        if (!userId || !productId) {
            return next(new AppError("userId and productId are required", 400));
        }

        // Delete the product from the cart
        const { error: deleteError } = await database
            .from('cart')
            .delete()
            .eq("user_id", userId)
            .eq("product_id", productId);

        if (deleteError) {
            return next(new AppError(`Error deleting cart item: ${deleteError.message}`, 500));
        }

        res.status(200).json({
            status: "success",
            message: "Product removed from cart successfully"
        });

    } catch (error) {
        console.error(error);
        return next(new AppError("Internal server error", 500));
    }
};
