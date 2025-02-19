import dotenv from "dotenv";
import AppError from "../utils/AppError";
import axios from "axios";
import crypto from "node:crypto"
import jwt from 'jsonwebtoken';
import {NextFunction, Request, Response} from "express";
import {database} from "../middlewares/database";
import redis from "../middlewares/redisConfig";
import { paymentQueue } from "../middlewares/queue";

dotenv.config();

export const initializePayment = async function(req: Request, res: Response, next: NextFunction) {
    try {
        const { email, amount } = req.body;

        // Get user authentication details
        const authHeaders = req.headers.authorization;
        if (!authHeaders) {
            return next(new AppError(`Authorization header is required`, 400));
        }

        const token = authHeaders.split(" ")[1];
        if (!token) {
            return next(new AppError(`Token is missing`, 401));
        }

        // Decode JWT token
        const decodedToken: any = jwt.verify(token, process.env.JWT_SECRET as string);
        if (!decodedToken || !decodedToken.id) {
            return next(new AppError(`Invalid token`, 401));
        }

        // Fetch the user from the database
        const { data: user, error: userError } = await database.from('users').select('email').eq('id', decodedToken.id).single();
        if (!user) {
            return next(new AppError(`User not found`, 404));
        }
        if (userError) {
            return next(new AppError(`Error getting user`, 404));
        }

        // Generate an idempotency key
        const idempotencyKey = crypto.createHash('sha256').update(`${decodedToken.id}-${amount}`).digest('hex');
        const existingPayment = await redis.get(idempotencyKey);

        if (existingPayment) {
            return next(new AppError(`Duplicate payment detected! Transaction already processed.`, 400));
        }

        // Mark the payment as processing (valid for 5 minutes)
        await redis.set(idempotencyKey, 'Processing', 'EX', 300);

        // Add payment job to queue
        await paymentQueue.add('process-payment', { user, amount, idempotencyKey });

        res.status(200).json({
            status: 'success',
            message: 'Payment is being processed',
        });

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