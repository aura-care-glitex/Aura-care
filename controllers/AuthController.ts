import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv"
import { database } from "../middlewares/database";
import AppError from "../utils/AppError";
import { sendMail } from "../utils/email";
import { generateOTP } from "../utils/resetToken";

dotenv.config()

export const createUser = async function(req: Request, res: Response, next: NextFunction) {
    try {
        const { email, password, username, phonenumber } = req.body;

        if (!email || !password || !username) {
            return next(new AppError("Email, password, and username are required", 400));
        }

        // Hash the password before saving
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert user into the database
        const { data, error } = await database
            .from("users")
            .insert([{ email, password: hashedPassword, username, phonenumber }])
            .select("id, email, username, phonenumber");

        if (error) {
            return next(new AppError(error.message, 400));
        }

        res.status(201).json({
            status: "success",
            message: "User created successfully",
            user: data ? data : [0]
        });

    } catch (error) {
        console.error("Error creating a user:", error);
        return next(new AppError("Internal Server Error", 500));
    }
};

// Login user 
export const loginUser = async function(req:Request, res:Response, next:NextFunction){
    try {
        const { email, password }= req.body;

        if(!email || !password){
            return next(new AppError(`email and password are required`, 402))
        }

        // Check if the user exists
        const { data: user, error } = await database
            .from("users")
            .select("id, email, username, password")
            .eq("email", email)
            .single();

        if (error) {
            return next(new AppError(error.message, 401));
        }

        if(!user){
            return next(new AppError(`User not found`, 404))
        }

        // Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return next(new AppError("Invalid email or password", 401));
        }

        // assign a token
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET as string, {
            expiresIn: "7d",
        });

        res.status(200).json({
            status:"success",
            token:token,
            user
        })
    } catch (error) {
        return next(new AppError('Internal server error', 500))
    }
}

// protect user route
export const protect = async function (req:any, res:Response, next:NextFunction){
    try {
        const authHeaders = req.headers.authorization;

        const token = authHeaders?.split(" ")[0]

        if(!token){
            return next(new AppError(`No authorization headers`, 402))
        }

        // decode token
        const decodeToken:any = jwt.verify(token, process.env.JWT_SECRET  as string);

        // get user from db
        const { data: user, error } = await database
        .from("users")
        .select("role")
        .eq("id", decodeToken.id)
        .single();

        if (error) {
            return next(new AppError(error.message, 401));
        }

        if(!user){
            return next(new AppError(`User not found`, 404))
        }

        req.user = user
    } catch (error) {
        return next(new AppError(`Internal server error`, 500))
    }
}

// restrict permissions (Authorizations)
export const restrictTo = function(...role:string[]){
    return function(req:any, res:Response, next:NextFunction){
        if(!role.includes(req.user.role)){
            return next(new AppError(`You are not authorized to perform this action`, 403))
        }
        next()
    }
}

// forgot password
export const forgotpassword = async function (req: Request, res: Response, next: NextFunction) {
    try {
        const { email } = req.body;

        const { data: user, error } = await database
            .from("users")
            .select("username, email")
            .eq("email", email)
            .single();

        if (error || !user) {
            return next(new AppError(error?.message || "User not found", error ? 401 : 404));
        }

        const { otpToken, passwordExpiresAt, passwordResetToken } = generateOTP();

        console.log(`Logins:`, passwordExpiresAt)

        // Update the user's reset token and expiration time
        const { error: updateError } = await database
            .from("users")
            .update({
                passwordresettoken: passwordResetToken,
                passwordresetexpires: passwordExpiresAt
            })
            .eq("email", email);

        if (updateError) {
            return next(new AppError(updateError.message, 500));
        }

        // Send the email with the OTP
        await sendMail({
            email: user.email,
            subject: "Reset your password",
            from: process.env.EMAIL_ADDRESS as string,
            name: user.username,
            message: `You are receiving this email because you (or someone else) requested a password reset. Please copy the OTP token below to complete the process:`,
            otp: otpToken
        });

        res.status(200).json({
            status: "success",
            message: "Reset password email sent"
        });

    } catch (error) {
        return next(new AppError("Internal server error", 500));
    }
};