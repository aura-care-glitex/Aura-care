import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import AppError from "../utils/AppError";

dotenv.config();

// Middleware to extract token from headers
export const authHeaders = async function (req: any, res: Response, next: NextFunction) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return next(new AppError("Unauthorized: No token provided", 402))
        }

        const token = authHeader.split(" ")[1];
        req.token = token; // Attach token to request for later use
        next();
    } catch (error) {
        return next(new AppError("Internal server error", 500))
    }
};

// Function to decode token and extract user ID
export const decodedToken = async function (token: string): Promise<string | null> {
    try {
        const verifyToken: any = jwt.verify(token, process.env.JWT_SECRET as string);
        return verifyToken.sub;
    } catch (error:any) {
        console.error("Invalid Token:", error.message);
        return null;
    }
};
