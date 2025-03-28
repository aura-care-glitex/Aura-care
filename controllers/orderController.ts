import {NextFunction, Request, Response} from "express";
import AppError from "../utils/AppError";
import {database} from "../middlewares/database";
import { decodedToken } from "../middlewares/authorization";
import redis from "../middlewares/redisConfig";
import OrderItem from "./../utils/types"

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

        // 🔹 Calculate total items bought
        const numberOfItemsBought = cartItems.reduce((sum, item) => sum + item.quantity, 0);

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

        // 🔹 Create ONE ORDER ROW PER PRODUCT
        const orderInserts = orderItems.map(item => ({
            user_id: userId,
            product_id: item.product_id,   // Include product-specific data
            total_price: item.unit_price * item.quantity, // Price for this product's contribution
            number_of_items_bought: numberOfItemsBought,
            delivery_type: deliveryType,
            delivery_stage_id: deliveryType === "PSV" ? stageId : null,
            delivery_location: deliveryType === "PSV" ? stageName : deliveryLocation,
            store_address: deliveryType === "Express Delivery" ? storeAddress : null,
            county: deliveryType === "Outside Nairobi" ? county : null,
            delivery_fee: deliveryFee
        }));
        
        // Insert all product-specific order rows
        const { data: orders, error: orderError } = await database
            .from("orders")
            .insert(orderInserts)
            .select("id");
        
        if (orderError) return next(new AppError(`Error creating orders: ${orderError.message}`, 500));
        
        // Return the first order ID as a reference (or adjust as needed)
        res.status(201).json({
            status: "success",
            message: "Order placed successfully",
            total_price: parseFloat(totalPrice.toFixed(2)),
            delivery_fee: deliveryFee
        });

    } catch (error) {
        console.error(error);
        return next(new AppError("Internal Server Error", 500));
    }
};

export const getAllOrders = async function (req: Request, res: Response, next: NextFunction) {
    try {
        const key = "order_items:all";

        const cachedOrders = await redis.get(key);
        if (cachedOrders) {
            res.status(200).json({
                status: "success",
                data: JSON.parse(cachedOrders),
            });
            return;
        }

        // Fetch orders with user and order details 
        const { data: orders, error } = await database
            .from("order_items")
            .select(`
                id,
                quantity,
                created_at,
                orders:order_id (delivery_type, delivery_location, total_price, number_of_items_bought, status),
                users:user_id (username, phonenumber)
            `);

        if (error) {
            console.error("Database error:", error);
            return next(new AppError("Failed to fetch orders", 500));
        }

        // Format response safely
        const formattedOrders = orders.map(order => ({
            order_id: order.id,
            customer_name: (order.users as any)?.username,
            phonenumber: (order.users as any)?.phonenumber,
            number_of_items_bought: (order.orders as any)?.number_of_items_bought,
            status: (order.orders as any)?.status,
            delivery_options: (order.orders as any)?.delivery_type,
            location: (order.orders as any)?.delivery_location,
            order_cost: (order.orders as any)?.total_price,
            order_date: order.created_at
        }));

        // Calculate the total cost for each order status
        const totals = {
            Pending: 0,
            Dispatched: 0,
            Delivered: 0,
            Cancelled: 0
        };

        formattedOrders.forEach(order => {
            const status = order.status as keyof typeof totals;
            if (totals.hasOwnProperty(status)) {
                totals[status] += order.order_cost || 0;
            }
        });

        // Cache the result for 60 seconds
        await redis.setex(key, 60, JSON.stringify( { orders:formattedOrders, totals }));

        res.status(200).json({
            status: "success",
            data: {
                orders: formattedOrders,
                totals
            },
        });
    } catch (error) {
        console.error(`Error getting all orders:`, error);
        return next(new AppError("Internal server error", 500));
    }
};


export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        // Validate status
        const validStatuses = ["Pending", "Dispatched", "Delivered", "Cancelled"];
        if (!validStatuses.includes(status)) {
            return next(new AppError("Invalid order status", 400));
        }

        // Update order status in the database
        const { error } = await database
            .from("orders")
            .update({ status })
            .eq("id", orderId);

        if (error) return next(new AppError(`Error updating status: ${error.message}`, 500));

        res.status(200).json({
            status: "success",
            message: `Order status updated to ${status}`
        });

    } catch (error) {
        console.error(error);
        return next(new AppError("Internal Server Error", 500));
    }
};



export const singleOrderModule = async function (req: Request, res: Response, next: NextFunction) {
    try {
        const { orderId } = req.params;

        if (!orderId) return next(new AppError("Order ID is required", 400));

        const key = `single_order:${orderId}`;

        // 🔹 Check Redis Cache
        const cachedOrderModule = await redis.get(key);
        if (cachedOrderModule) {
            res.status(200).json({
                status: "success",
                order: JSON.parse(cachedOrderModule),
            });
            return;
        }

        const { data: orderItems, error: orderItemsError } = await database
            .from("order_items")
            .select(`
                order_id,
                product_id,
                quantity,
                unit_price,
                orders!inner(
                    total_price,
                    delivery_fee,
                    delivery_type,
                    delivery_location,
                    user_id,
                    users:user_id(id, username, phonenumber, email)
                ),
                products:product_id(stock_quantity, product_name)
            `)
            .eq("id", orderId);


        if (orderItemsError) {
            console.error("Database error:", orderItemsError);
            return next(new AppError("Failed to fetch order", 500));
        }

        if (!orderItems || orderItems.length === 0) {
            return next(new AppError("Order not found", 404));
        }

        // 🔹 Structure response with all purchased products
        const orderData = {
            order_id: (orderItems[0] as any).order_id,
            user: (orderItems[0] as any).orders?.users ,
            total_price: (orderItems[0] as any).orders?.total_price,
            shipping_fee: (orderItems[0] as any).orders?.delivery_fee,
            grand_total: ((orderItems[0] as any).orders?.total_price ) + ((orderItems[0] as any).orders?.delivery_fee),
            delivery_type: (orderItems[0] as any).orders?.delivery_type,
            delivery_location: (orderItems[0] as any).orders?.delivery_location ,
            products: orderItems.map((item: any) => ({
                product_id: item.product_id,
                quantity: item.quantity,
                price_cost: item.unit_price * item.quantity,
                stock_quantity: item.products?.stock_quantity,
                product_name: item.products?.product_name,
            })),
        };

        // 🔹 Store in Redis for caching
        await redis.set(key, JSON.stringify(orderData), "EX", 60);

        res.status(200).json({
            status: "success",
            order: orderData,
        });

    } catch (error) {
        console.error("Error fetching single order:", error);
        return next(new AppError("Internal server error", 500));
    }
};