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
        const { email, amount, productName } = req.body;

        const { data: product, error: productError } = await database
            .from("products")
            .select("id, product_name")
            .eq("product_name", productName)
            .single();

        if (productError || !product) {
            return next(new AppError(`This product does not exist`, 404));
        }

        const userId = await decodedToken(req.token)

        const { data: user, error: userError } = await database.from('users').select('email, shipping_fee ').eq('id', userId).single();
        if (!user) {
            return next(new AppError(`User not found`, 404));
        }
        if (userError) {
            return next(new AppError(`Error getting user`, 404));
        }

        // Generate an idempotency key
        const idempotencyKey = crypto.createHash('sha256').update(`${userId}-${amount}`).digest('hex');
        const existingPayment = await redis.get(idempotencyKey);

        if (existingPayment) {
            return next(new AppError(`Duplicate payment detected! Transaction already processed.`, 400));
        }

        // Mark the payment as processing (valid for 5 minutes)
        await redis.set(idempotencyKey, 'Processing', 'EX', 300);

        // Add payment job to queue
        const job = await paymentQueue.add('process-payment', { user, amount, idempotencyKey, product }, { priority: 1 });

        // wait for the job to finish
        const result = await job.waitUntilFinished(paymentQueueEvents, 3000);

        if (!result.data.authorization_url) {
            throw new Error('Authorization URL not received from Paystack');
        }

        res.status(200).json({
            status: 'success',
            message: 'Payment initialized successfully',
            url: result.data
        });;

    } catch (err: any) {
        console.log(err.message);
        return next(new AppError(`${err.response?.data || 'Payment processing error'}`, 500));
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

        if (event.event !== "charge.success") {
            return next(new AppError("Unhandled event type", 400));
        }

        const { data: user, error: userError } = await database
            .from("users")
            .select("id, delivery_location")
            .eq("email", event.data.customer.email)
            .single();

        if (userError || !user) {
            return next(new AppError("User not found", 404));
        }

        const transactionData = {
            email: event.data.customer.email,
            transaction_date: event.data.paid_at,
            reference: event.data.reference,
            status: event.data.status,
            user_id: user.id,
            delivery_location:user.delivery_location,
            product_name:event.data.metadata.product_name,
            product_id: event.data.metadata.product_id,
            amount: event.data.amount / 100
        };

        const { data, error } = await database.from("transactions").insert([transactionData]);

        if (error) {
            return next(new AppError("Failed to save transaction", 500));
        }

        res.status(200).json({
            status: "success",
            message: "Transaction saved successfully"
        });

    } catch (error: any) {
        return next(new AppError(`Webhook processing failed: ${error.message}`, 500));
    }
};