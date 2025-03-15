import express, { Express, NextFunction, Request, Response } from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";
import databaseConnect from "./middlewares/database";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 8040;

import userRoute from "./routes/userRoute";
import productRoute from "./routes/productRoute";
import reviewRoute from "./routes/reviewRoute";
import paymentRoute from "./routes/paymentRoute";
import shippingRoute from "./routes/shippingFeeRoute";
import AppError from "./utils/AppError";
import redis from "./middlewares/redisConfig";
import { emailWorker } from "./utils/woker-nodes/emailWorker";
import { paymentWorker } from "./utils/woker-nodes/paymentWorker";
import swaggerDocs from "./swagger";

// Middleware Initialization
app.use(helmet());
app.use(morgan("dev"));

// Enable CORS
app.use(
  cors({
    origin: ["http://localhost:3000/", "http://127.0.0.1:3000/", "http://live-frontend-url/"],
    credentials: true
  })
);

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use("/api/v1/users", userRoute);
app.use("/api/v1/product", productRoute);
app.use("/api/v1/review", reviewRoute);
app.use("/api/v1/payment", paymentRoute);
app.use("/api/v1/shipping", shippingRoute);

// Root URL
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    status: "success",
    message: "Welcome to the root URL - Version 1.0.0",
  });
});

// Swagger Docs
swaggerDocs(app);

// Handling Unhandled Routes
app.use("*", (req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`This route ${req.originalUrl} is not yet handled`, 404));
});

// Global Error Handling
app.use((err: AppError, req: Request, res: Response, next: NextFunction) => {
  res.status(err.statusCode || 500).json({
    status: err.status || "error",
    message: err.message,
  });
});

// Start Server
async function startServer() {
  await databaseConnect(); 
  redis;
  emailWorker; 
  paymentWorker;

  app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
  });
}
startServer();