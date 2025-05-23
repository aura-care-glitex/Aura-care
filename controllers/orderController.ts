import {NextFunction, Request, Response} from "express";
import AppError from "../utils/AppError";
import {database} from "../middlewares/database";
import { decodedToken } from "../middlewares/authorization";
import redis from "../middlewares/redisConfig";
import type { Order, User, OrderedItem } from "./../utils/types";
import { generateOrderFingerprint } from "../utils/orderFingerprint";


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
            .eq("selected_for_checkout", true)
            .eq("user_id", userId);

        if (cartError) return next(new AppError(`Error fetching cart: ${cartError.message}`, 500));
        if (!cartItems.length) return next(new AppError("No checked cart item found", 400));

        // 🔹 Get Product Prices
        const productIds = cartItems.map(item => item.product_id);
        const { data: products, error: productError } = await database
            .from("products")
            .select("id, price")
            .in("id", productIds);

        if (productError) return next(new AppError(`Error fetching products: ${productError.message}`, 500));

        // 🔹 Calculate Total Price & Order Items
        let totalPrice = 0;
        const orderItems = cartItems.map(item => {
            const product = products.find(p => p.id === item.product_id);
            const unitPrice = product ? product.price : 0;
            totalPrice += unitPrice * item.quantity;

            return { product_id: item.product_id, quantity: item.quantity, unit_price: unitPrice };
        });

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

        if (deliveryType === "Outside Nairobi" && !county) {
            return next(new AppError("County is required for 'Outside Nairobi' deliveries", 400));
        }

        if (deliveryType === "Express Delivery" && !storeAddress) {
            return next(new AppError("Store address is required for 'Express Delivery'", 400));
        }

        totalPrice += deliveryFee;

        // 🔹 Create Order Data
        const orderData = {
            userId,
            totalPrice,
            numberOfItemsBought,
            orderItems,
            deliveryType,
            stageId,
            storeAddress,
            county,
            deliveryLocation,
            deliveryFee,
            stageName
        };

        // 🔹 Final Response
        res.status(201).json({
            status: "success",
            message: "Order placed successfully",
            orderData
        });

    } catch (error) {
        console.error(error);
        return next(new AppError("Internal Server Error", 500));
    }
};

export const getAllOrders = async function (req: Request, res: Response, next: NextFunction) {
    try {
        const { status } = req.query;
        const key = `orders:${status || "all"}`;

        const cachedOrders = await redis.get(key);
        if (cachedOrders) {
            res.status(200).json({
                status: "success",
                ...JSON.parse(cachedOrders),
            });
            return;
        }

        // ✅ Fetch all orders
        const { data: orders, error } = await database
            .from("orders")
            .select(`
                id,
                total_price,
                delivery_fee,
                created_at,
                tracking_status,
                delivery_type,
                delivery_location,
                store_address,
                county,
                users:user_id ( username, phonenumber ),
                order_items ( quantity )
            `) as unknown as { data: Order[]; error: any };

        if (error) {
            console.error("Database error:", error);
            return next(new AppError("Failed to fetch orders", 500));
        }

        // ✅ Initialize totals
        const totals: Record<string, number> = {
            Pending: 0,
            Dispatched: 0,
            Delivered: 0,
            Cancelled: 0
        };

        // ✅ Check if there are no orders at all
        if (!orders || orders.length === 0) {
            res.status(404).json({
                status: "error",
                message: "No orders found",
                totals
            });
            return;
        }

        // ✅ Exclude orders with NULL tracking_status
        const validOrders = orders.filter(order => order.tracking_status !== null);

        // ✅ Compute totals
        validOrders.forEach(order => {
            const orderCost = order.total_price ?? 0;
            if (totals.hasOwnProperty(order.tracking_status)) {
                totals[order.tracking_status] += orderCost;
            }
        });

        // ✅ Filter orders based on status
        const filteredOrders = status
            ? validOrders.filter(order => order.tracking_status === status)
            : validOrders;

        // ✅ Return "No orders found" if there are no orders after filtering
        if (filteredOrders.length === 0) {
            res.status(404).json({
                status: "error",
                message: "No orders found",
                totals
            });
            return;
        }

        // ✅ Format filtered orders
        const formattedOrders = filteredOrders.map(order => ({
            order_id: order.id,
            customer_name: order.users?.username ?? "Unknown",
            phone_number: order.users?.phonenumber ?? "N/A",
            total_items_bought: (order.order_items ?? []).reduce((sum: number, item: { quantity: number }) => sum + (item.quantity ?? 0), 0),
            location: order.delivery_location ?? "N/A",
            delivery_options: order.delivery_type ?? "N/A",
            store_address: order.store_address ?? "N/A",
            county: order.county ?? "N/A",
            order_date: order.created_at,
            order_cost: order.total_price ?? 0,
            tracking_status: order.tracking_status
        }));

        // ✅ Cache response for 60 seconds
        await redis.setex(key, 60, JSON.stringify({ data: formattedOrders, totals }));

        res.status(200).json({
            status: "success",
            data: formattedOrders,
            totals
        });

    } catch (error: any) {
        console.error(`Error getting orders:`, error);
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

        // Check if the order exists
        const { data: existingOrder, error: fetchError } = await database
            .from("orders")
            .select("id")
            .eq("id", orderId)
            .single();

        if (fetchError || !existingOrder) {
            return next(new AppError("Order not found", 404));
        }

        // Update order status in the database
        const { error: updateError } = await database
            .from("orders")
            .update({ tracking_status: status })
            .eq("id", orderId);

        if (updateError) {
            return next(new AppError(`Error updating status: ${updateError.message}`, 500));
        }

        res.status(200).json({
            status: "success",
            message: `Order status updated to ${status}`,
        });

    } catch (error) {
        console.error("Server Error:", error);
        return next(new AppError("Internal Server Error", 500));
    }
};


export const singleOrderModule = async (req: Request, res: Response, next: NextFunction) => {
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

        // Fetch data from the database
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
                    tracking_status,
                    county,
                    store_address,
                    created_at,
                    users:user_id(id, username, phonenumber, email)
                ),
                products:product_id(stock_quantity, product_name, imageurl)
            `)
            .eq("order_id", orderId);

        if (orderItemsError) {
            console.error("Database error:", orderItemsError);
            return next(new AppError("Failed to fetch order", 500));
        }

        if (!orderItems || orderItems.length === 0) {
            return next(new AppError("Order not found", 404));
        }

        // 🔹 Structure response
        const orderData: any = {
            order_id: orderItems[0].order_id,
            user: (orderItems[0].orders as any).users
                ? {
                    id: (orderItems[0].orders as any).users.id || "N/A",
                    username: (orderItems[0].orders as any).users.username || "N/A",
                    email: (orderItems[0].orders as any).users.email || "N/A",
                    phonenumber: (orderItems[0].orders as any).users.phonenumber || "N/A"
                }
                : null,
            order_date: (orderItems[0].orders as any).created_at
                ? new Date((orderItems[0].orders as any).created_at).toLocaleString()
                : "N/A",
            total_price: ((orderItems[0].orders as any).total_price || 0).toFixed(2),
            shipping_fee: (orderItems[0].orders as any).delivery_fee || 0,
            tracking_status: (orderItems[0].orders as any).tracking_status || "N/A",
            grand_total: (
                ((orderItems[0].orders as any).total_price || 0) +
                ((orderItems[0].orders as any).delivery_fee || 0)
            ).toFixed(2),
            delivery_type: (orderItems[0].orders as any).delivery_type || "N/A",
            store_address: (orderItems[0].orders as any).store_address || "N/A",
            county: (orderItems[0].orders as any).county || "N/A",
            delivery_location: (orderItems[0].orders as any).delivery_location || "N/A",
            ordered_items: orderItems.map((item: any) => ({
                product_name: item.products?.product_name || "Unknown",
                imageUrl: item.products?.imageurl || null,
                quantity: item.quantity,
                stock_quantity: item.products?.stock_quantity || 0,
                price_cost: (item.unit_price * item.quantity).toFixed(2),
            }))
        };

        // 🔹 Store in Redis for caching
        await redis.set(key, JSON.stringify(orderData), "EX", 60);

        res.status(200).json({
            status: "success",
            order: orderData,
        });
    } catch (error: any) {
        console.error("Error fetching single order:", error);
        return next(new AppError("Internal server error", 500));
    }
};

