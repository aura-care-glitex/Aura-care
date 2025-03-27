import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { database } from "../middlewares/database";
import AppError from "../utils/AppError";
import { emailQueue } from "../middlewares/queue";

dotenv.config();

export const AdminForgotPassword = async function (req:Request, res:Response, next:NextFunction) {
    try {
        const { email } = req.body;

        const { data: user, error } = await database.from("users").select("username, email").eq("email", email).single();

        if(error || !user){
            return next(new AppError("User not found", 404))
        }

        await emailQueue.add("sendMail", {
            email: user.email,
            subject: "Admin reset password",
            from: process.env.EMAIL_HOST as string,
            name: user.username,
            message: `You are receiving this email because you ( or someone else ) requested a password reset.
                please proceed with the link below to reset your password`,
            magic_Link: process.env.MAGIC_LINK as string
        })

        const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET as string, {
            expiresIn: "1h",
        })

        res.status(200).json({
            status:"success",
            message:"Magic link sent...",
            token: token
        })
    } catch (error) {
        console.log(error)
        return next( new AppError("Internal server error", 500))
    }
}

export const AdminResetPassword = async function(req:Request, res:Response, next:NextFunction){
    try {
        const { newPassword }= req.body;

        const AuthHeaders = req.headers.authorization

        if (!AuthHeaders || !AuthHeaders.startsWith("Bearer ")) {
            return next(new AppError("Unauthorized: No token provided", 402))
        }

        const token = AuthHeaders?.split(" ")[1];

        const decodedToken:any = jwt.verify(token, process.env.JWT_SECRET as string);

        const hashedPassword = await bcrypt.hash(newPassword, 10)

        const { data:updateError }= await database.from("users").update({ password: hashedPassword }).eq("email", decodedToken.email);

        if(updateError) return next(new AppError("Error updating passoerd", 403))
        
        res.status(200).json({
            status:"success",
            message:"Password updated successfully"
        })
    } catch (error) {
        console.log(error);
        return next(new AppError("Internal server error", 500));
    }
}