import dotenv from "dotenv";
import AppError from "../utils/AppError";
import axios from "axios";
import crypto from "node:crypto"
import {NextFunction, Request, Response} from "express";
import {database} from "../middlewares/database";
import redis from "../middlewares/redisConfig";
import { paymentQueue, paymentQueueEvents } from "../middlewares/queue";
import { decodedToken } from "../middlewares/authorization";

dotenv.config();

export const initializePayment = async function(req: any, res: Response, next: NextFunction) {
    try {
        const { amount, orderItems, deliveryType, stageId, stageName, storeAddress, county, deliveryFee } = req.body;
        const userId = await decodedToken(req.token);

        // Fetch the user's email based on the userId
        const { data: user, error: userError } = await database
            .from('users')
            .select('email')
            .eq('id', userId)
            .single();

        if (!user) {
            return next(new AppError(`User not found`, 404));
        }
        if (userError) {
            return next(new AppError(`Error getting user`, 404));
        }

        // Generate an idempotency key for this transaction to avoid duplicate payments
        const idempotencyKey = crypto.createHash('sha256').update(`${userId}-${amount}`).digest('hex');
        const existingPayment = await redis.get(idempotencyKey);

        if (existingPayment) {
            return next(new AppError(`Duplicate payment detected! Transaction already processed.`, 400));
        }

        // Mark the payment as processing (valid for 5 minutes)
        await redis.set(idempotencyKey, 'Processing', 'EX', 300);

        // Create a temporary "pending" order object in the database
        const { data: orderData, error: orderError } = await database
            .from("orders")
            .insert([{
                user_id: userId,
                total_price: amount + deliveryFee,  // Assuming `amount` is the total product price
                number_of_items_bought: orderItems.length,
                delivery_type: deliveryType,
                delivery_stage_id: deliveryType === "PSV" ? stageId : null,
                delivery_location: deliveryType === "PSV" ? stageName : null,
                store_address: deliveryType === "Express Delivery" ? storeAddress : null,
                county: deliveryType === "Outside Nairobi" ? county : null,
                delivery_fee: deliveryFee,
                order_status: "pending",  // Pending status until payment is successful
            }])
            .select("id")
            .single();

        if (orderError || !orderData || !orderData.id) {
            return next(new AppError("Failed to create pending order", 500));
        }

        // Create order items based on the items in the cart
        const orderId = orderData.id;
        const orderedItemsInserts = orderItems.map((item: { product_id: any; quantity: any; unit_price: any; }) => ({
            order_id: orderId,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price
        }));

        // Insert order items into the database
        const { error: orderedItemsError } = await database
            .from("order_items")
            .insert(orderedItemsInserts);

        if (orderedItemsError) {
            return next(new AppError(`Error inserting ordered items: ${orderedItemsError.message}`, 500));
        }

        // Add payment job to queue, passing the orderData and payment details
        const job = await paymentQueue.add('process-payment', { user, amount, idempotencyKey, orderId, orderData }, { priority: 1 });

        // Wait for the job to finish
        const result = await job.waitUntilFinished(paymentQueueEvents, 3000);

        if (!result.data.authorization_url) {
            throw new Error('Authorization URL not received from Paystack');
        }

        // Respond with the payment URL
        res.status(200).json({
            status: 'success',
            message: 'Payment initialized successfully',
            url: result.data.authorization_url
        });

    } catch (err: any) {
        console.error("💥 Error initializing payment:", err);

        if (err?.stack) console.error("Stack trace:", err.stack);
        if (err?.response) console.error("Response data:", err.response.data);

        return next(new AppError(`Payment processing error`, 500));
    }
};


// verify transactions
export const verifyTransactions = async function (req:Request, res:Response, next:NextFunction) {
    try {
        const { referenceId } = req.params;

        const response = await axios.get(
            `https://api.paystack.co/transaction/verify/${referenceId}`,
            {
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_TEST_SECRET as string}`
                }
            }
        );

        res.status(200).json({
            status:"success",
            data:response.data
        })
    } catch (error:any) {
        console.log(error)
        return next(new AppError(`${error.response.data}`, 500));
    }
}

// List all transactions
export const listTransactions = async function(req:Request, res:Response, next:NextFunction){
    try {
        const response = await axios.get(process.env.PAYSTACK_TRANSACTIONS_URL as string, {
            headers:{
                Authorization: `Bearer ${process.env.PAYSTACK_TEST_SECRET as string}`
            }
        })

        res.status(200).json({
            status:"success",
            payments: response.data
        })
    } catch (error:any) {
        return next(new AppError(`${error.response.data}`, 500))
    }
}

// get a single transaction
export const getSingleTransaction = async function (req:Request, res:Response, next:NextFunction){
    try {
        const { transactionId } = req.params;

        const response = await axios.get(
            `https://api.paystack.co/transaction/${transactionId}`,
            {
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_TEST_SECRET as string}`
                }
            }
        );

        res.status(200).json({
            status:"success",
            data:response.data
        })
    } catch (error:any) {
        return next(new AppError(`${error.response.data}`, 500))
    }
}

// webhook to save successful transactions to the database
export const saveTransaction = async function(req: Request, res: Response, next: NextFunction) {
    try {
        const secret = process.env.PAYSTACK_TEST_SECRET as string;
        const hash = crypto.createHmac("sha512", secret)
                          .update(JSON.stringify(req.body))
                          .digest('hex');

        if (hash !== req.headers["x-paystack-signature"]) {
            return next(new AppError("Invalid signature", 402));
        }

        const event = req.body;

        // Common user lookup logic
        const getUser = async () => {
            const { data: user, error } = await database
                .from("users")
                .select("id")
                .eq("email", event.data.customer.email)
                .single();
            if (error || !user) throw new AppError("User not found", 404);
            return user;
        };

        // Common transaction save logic
        const saveTransactionRecord = async (userId: string, status: string) => {
            const transactionData = {
                email: event.data.customer.email,
                transaction_date: event.data.paid_at || event.data.created_at,
                reference: event.data.reference,
                status: status,
                user_id: userId,
                amount: event.data.amount / 100
            };
            const { error } = await database.from("transactions").insert([transactionData]);
            if (error) throw new AppError("Failed to save transaction", 500);
        };

        // Handle different event types
        if (event.event === "charge.success") {
            // 🔹 Successful payment handling
            const user = await getUser();
            await saveTransactionRecord(user.id, event.data.status);

            // 🔹 Update Order Status
            const { data: order, error: orderError } = await database
                .from("orders")
                .select("id")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .single();

            if (orderError || !order) throw new AppError("Order not found", 404);

            const { error: updateError } = await database
                .from("orders")
                .update({ 
                    order_status: "success",
                    tracking_status: "Pending"
                })
                .eq("id", order.id);

            if (updateError) throw new AppError("Order update failed", 500);

            // 🔹 Clear cart
            await database
                .from("cart")
                .delete()
                .eq("selected_for_checkout", true)
                .eq("user_id", user.id);

            res.status(200).json({
                status: "success",
                message: "Payment processed successfully",
                order_id: order.id
            });

        } else if (event.event === "charge.failed" || event.event === "charge.canceled") {
            // 🔹 Failed/Canceled payment handling
            const user = await getUser();
            await saveTransactionRecord(user.id, event.data.status);

            // 🔹 Find and delete order
            const { data: order, error: orderError } = await database
                .from("orders")
                .select("id")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .single();

            if (orderError) throw new AppError("Error finding order", 500);
            if (!order) throw new AppError("No order to cancel", 404);

            const { error: deleteError } = await database
                .from("orders")
                .delete()
                .eq("id", order.id);

            if (deleteError) throw new AppError("Order cancellation failed", 500);

            res.status(200).json({
                status: "success",
                message: "Order canceled due to payment failure"
            });

        } else {
            return next(new AppError("Unhandled event type", 400));
        }

    } catch (error: any) {
        console.error(error);
        return next(new AppError(`Webhook processing failed: ${error.message}`, 500));
    }
};