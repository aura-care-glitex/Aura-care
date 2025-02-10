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
import AppError from "./utils/AppError";

// middleware initialization
app.use(helmet());

app.use(cors()) // receives network traffic from any url

app.use(morgan('dev'));

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use('/api/v1/users', userRoute);

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

    app.listen(port, () => {
        console.log(`[server]: Server is running at http://localhost:${port}`);
    });
}
startServer()