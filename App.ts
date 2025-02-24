import express, { Express, NextFunction, Request, Response } from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import helmet from "helmet";
import cors from 'cors'
import databaseConnect from "./middlewares/database";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 8040;

import userRoute from './routes/userRoute'
import productRoute from "./routes/productRoute";
import reviewRoute from "./routes/reviewRoute";
import paymentRoute from "./routes/paymentRoute";
import shippingRoute from "./routes/shippingFeeRoute"
import AppError from "./utils/AppError";
import redis from "./middlewares/redisConfig";
import { emailWorker } from "./utils/woker-nodes/emailWorker";
import { paymentWorker } from "./utils/woker-nodes/paymentWorker";

// middleware initialization
app.use(helmet());

app.use(cors())

app.use(morgan('dev'));

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use('/api/v1/users', userRoute);
app.use('/api/v1/product', productRoute);
app.use('/api/v1/review', reviewRoute);
app.use('/api/v1/payment', paymentRoute)
app.use('/api/v1/shipping', shippingRoute)

app.get("/", (req: Request, res: Response, next:NextFunction) => {
  res.status(200).json({
    status:"Welcome to the root url",
    message:"version 1.0.0"
  })
});

// handling unhandled routes
app.use("*", (req:Request, res:Response ,next:NextFunction)=>{
    return next(new AppError(`This route ${req.originalUrl} is not yet handled`, 404))
})

// Global error handling
app.use((err:AppError ,req:Request, res:Response, next:NextFunction)=>{
    const statusCode = err.statusCode || 500;
    const status = err.status || "error";

    res.status(statusCode).json({
        status:status,
        message:err.message
    })
})
async function startServer() {
    await databaseConnect(); // Establish database connection
    redis // log in redis
    emailWorker // woker node
    paymentWorker

    app.listen(port, () => {
        console.log(`[server]: Server is running at http://localhost:${port}`);
    });
}
startServer()