import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import crypto from "node:crypto";
import { database } from "../middlewares/database";
import AppError from "../utils/AppError";
import { generateOTP } from "../utils/resetToken";
import { emailQueue } from "../middlewares/queue";

dotenv.config()

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password, username, phonenumber, role, delivery_location, address } = req.body;

        if (!email || !password || !username) {
            return next(new AppError("Email, password, and username are required", 400));
        }

        // Set default role if not provided
        const userRole = role || "user";

        let userData: Record<string, any> = {
            email,
            password: await bcrypt.hash(password, 10),
            username,
            phonenumber,
            role: userRole,
        };

        // Only include delivery details if the user is NOT an admin
        if (userRole !== "admin") {
            if (!delivery_location || !address) {
                return next(new AppError("Address and delivery location are required for non-admin users", 400));
            }
            userData.delivery_location = delivery_location;
            userData.address = address;
        }

        // send email to confirm user ownership

        const { data, error } = await database
            .from("users")
            .insert([userData])
            .select("id, email, username, phonenumber, role, delivery_location, address, shipping_fee");

        if (error) {
            return next(new AppError(error.message, 400));
        }

        if (!data || data.length === 0) {
            return next(new AppError("User creation failed", 500));
        }

        res.status(201).json({
            status: "success",
            message: "User created successfully",
            user: data[0],
        });

    } catch (error) {
        console.error("Error creating user:", error);
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
            .select("id, email, username, password, active")
            .eq("email", email)
            .maybeSingle();

        console.log(user)

        if (error) {
            console.log(error)
            return next(new AppError(`(Error) something happened`, 401));
        }

        if(!user){
            return next(new AppError(`User not found`, 404))
        }

        if(user.active === false){
            return next (new AppError(`Please activate your account`, 401))
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

        const token = authHeaders?.split(" ")[1]

        if(!token){
            return next(new AppError(`No authorization headers`, 402))
        }

        // decode token
        const decodeToken:any = jwt.verify(token, process.env.JWT_SECRET  as string);

        // get user from db
        const { data: user, error } = await database
            .from("users")
            .select("*")
            .eq("id", decodeToken.id)
            .single();

        if (error) {
            return next(new AppError(error.message, 401));
        }

        if(!user){
            return next(new AppError(`User not found`, 404))
        }

        req.user = user;

        next();
    } catch (error) {
        return next(new AppError(`Internal server error`, 500))
    }
}

// restrict permissions (Authorizations)
export const restrictTo = function(...roles:string[]){
    return function(req:any, res:Response, next:NextFunction){
        if(!roles.includes(req.user.role)){
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
        await emailQueue.add("sendEmail",{
            email: user.email,
            subject: "Reset your password",
            from: process.env.RESEND_EMAIL as string,
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

// reset password
export const resetPassword = async function (req: Request, res: Response, next: NextFunction) {
    try {
        // Get token from request parameters
        const { token } = req.params;

        // new Password
        const { password , confirmPassword} = req.body;

        if(password !== confirmPassword){
            return next(new AppError(`Passwords do not match`, 402))
        }

        if (!token) {
            return next(new AppError("Token is required", 400));
        }

        // Hash the token to match the stored hash
        const resetToken = crypto.createHash("sha256").update(token.toString()).digest("hex");

        // Retrieve the user with the matching reset token
        const { data: users, error } = await database.from("users").select("id, username, passwordresettoken, passwordresetexpires").eq("passwordresettoken", resetToken);

        if (error || !users || users.length === 0) {
            return next(new AppError("Invalid token or token expired", 404));
        }

        const user = users[0];

        // Check if the token has expired
        if (user.passwordresetexpires < Date.now()) {
            return next(new AppError("Token has expired", 402));
        }

        // hash the new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // create a new password and update passwordresettoken, passwordresetexpires
        const { data:updateError } = await database.from("users").update({ passwordresettoken: null, passwordresetexpires: null, password:hashedPassword}).eq("id",user.id);

        if(updateError){
            return next(new AppError(`Error updating password`, 402))
        }

        res.status(200).json({
            status: "success",
            message: "Password updated successfully",
        });

    } catch (error) {
        return next(new AppError("Internal server error", 500));
    }
};

// Updating password
export const updatingPassword = async function (req: any, res: Response, next: NextFunction) {
    try {
        const { password, currentPassword } = req.body;

        if( !password || !currentPassword){
            return next(new AppError(`Your initial password and currentPassword are required`, 403));
        }

        // check if the user exists in the database
        const { data:userData, error } = await database.from("users").select("id, username, email, password").eq("email", req.user.email);
        if(error || !userData || userData.length === 0) {
            return next(new AppError("User does not exist", 403));
        }

        const user= userData[0];

        // Check if current password is correct
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            return next(new AppError("Current password is incorrect", 401));
        }
        // update password
        const { data:updateError } = await database.from("users").update({ password: await bcrypt.hash(password, 10)}).eq("id", req.user.id);
        if(updateError){
            return next(new AppError(`Error updating password`, 403))
        }

        res.status(200).json({
            status:"success",
            message:"Password updated successfully"
        })
    }catch (e) {
        return next(new AppError(`Internal server error`, 500))
    }
}