import {NextFunction, Request, Response} from "express";
import AppError from "../utils/AppError";
import {database} from "../middlewares/database";
import { decodedToken } from "../middlewares/authorization";

export const checkout = async (req: any, res: Response, next: NextFunction) => {
    try {
        const userId = await decodedToken(req.token);
        const { deliveryType, stageId, storeAddress, county, deliveryLocation } = req.body;

        if (!userId || !deliveryType) {
            return next(new AppError("User ID and delivery type are required", 400));
        }

        // 🔹 Get Cart Items
        const { data: cartItems, error: cartError } = await database
            .from("cart")
            .select("product_id, quantity")
            .eq("user_id", userId);

        if (cartError) return next(new AppError(`Error fetching cart: ${cartError.message}`, 500));
        if (!cartItems.length) return next(new AppError("Cart is empty", 400));

        // 🔹 Get Product Prices
        const productIds = cartItems.map(item => item.product_id);
        const { data: products, error: productError } = await database
            .from("products")
            .select("id, price")
            .in("id", productIds);

        if (productError) return next(new AppError(`Error fetching products: ${productError.message}`, 500));

        // 🔹 Calculate Total Price
        let totalPrice = 0;
        const orderItems = cartItems.map(item => {
            const product = products.find(p => p.id === item.product_id);
            const unitPrice = product ? product.price : 0;
            totalPrice += unitPrice * item.quantity;

            return { product_id: item.product_id, quantity: item.quantity, unit_price: unitPrice };
        });

        let deliveryFee = 0;
        let stageName = null;
        
        // 🔹 Handle PSV Delivery
        if (deliveryType === "PSV" && stageId) {
            const { data: stage, error: stageError } = await database
                .from("psv_stages")
                .select("delivery_fee, name")
                .eq("id", stageId)
                .single();

            if (stageError) return next(new AppError(`Error fetching stage: ${stageError.message}`, 500));
            if (!stage) return next(new AppError("Invalid PSV stage", 400));

            deliveryFee = stage.delivery_fee;
            stageName = stage.name;
        }

        // 🔹 Handle Outside Nairobi Delivery
        if (deliveryType === "Outside Nairobi" && !county) {
            return next(new AppError("County is required for 'Outside Nairobi' deliveries", 400));
        }

        // 🔹 Handle Express Delivery
        if (deliveryType === "Express Delivery" && !storeAddress) {
            return next(new AppError("Store address is required for 'Express Delivery'", 400));
        }

        totalPrice += deliveryFee; // Add delivery fee to total price

        // 🔹 Create Order
        const { data: order, error: orderError } = await database
            .from("orders")
            .insert([{
                user_id: userId,
                total_price: totalPrice,
                delivery_type: deliveryType,
                delivery_stage_id: deliveryType === "PSV" ? stageId : null,
                delivery_location: deliveryType === "PSV" ? stageName : deliveryLocation,
                store_address: deliveryType === "Express Delivery" ? storeAddress : null,
                county: deliveryType === "Outside Nairobi" ? county : null,
                delivery_fee: deliveryFee
            }])
            .select("id")
            .single();

        if (orderError) return next(new AppError(`Error creating order: ${orderError.message}`, 500));

        res.status(201).json({
            status: "success",
            message: "Order placed successfully",
            order_id: order.id,
            total_price: parseFloat(totalPrice.toFixed(2)),
            delivery_fee: deliveryFee
        });

    } catch (error) {
        console.error(error);
        return next(new AppError("Internal Server Error", 500));
    }
};
