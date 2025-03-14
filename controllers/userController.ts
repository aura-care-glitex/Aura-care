import { NextFunction, Response,Request } from "express";
import AppError from "../utils/AppError";
import {database} from "../middlewares/database";
import redis from "../middlewares/redisConfig";
import dotenv from "dotenv"

dotenv.config()

const filteredObj = function (obj: { [key: string]: any }, ...allowedFields: string[]) {
    let newObj: { [key: string]: any } = {};
    Object.keys(obj).forEach((key: string) => {
        if (allowedFields.includes(key)) {
            newObj[key] = obj[key];
        }
    });
    return newObj;
};

export const getAllUsers = async function(req: Request, res: Response, next: NextFunction){
    try {
        const key = 'users:all'

        const cachedUsers = await redis.get(key);

        if(cachedUsers){
            res.status(200).json({
                status:"success",
                data:JSON.parse(cachedUsers)
            })
            return;
        }
        const { data:users, error } = await database.from("users").select("*").range(0, 10);
        if(users?.length === 0){
            return next(new AppError("No users found", 400));
        }
        if(error){
            return next(new AppError(`Error getting users`, 400))
        }

        await redis.setex(key, 60, JSON.stringify(users))

        res.status(200).json({
            status:"success",
            data:users
        })
    }catch(err){
        return next(new AppError(`Internal server error`, 500));
    }
}

export const getSingleUser = async function(req:any, res:Response, next:NextFunction){
    try {
        const key = 'single:user';

        const cachedUser = await redis.get(key);

        if(cachedUser){
            res.status(200).json({
                status:"success",
                data: JSON.parse(cachedUser)
            })
            return;
        }

        let { data:userData, error } = await database.from("users").select("*").eq("id", req.user.id);

        if(!userData){
            return next(new AppError(`User does not exist`, 400));
        }

        if(error){
            return next(new AppError(`Error getting user`, 400));
        }

        await redis.setex(key, 60, JSON.stringify(userData))

        res.status(200).json({
            status:"success",
            data:userData
        })
    }catch (e) {
        return next(new AppError(`Internal server error`, 500));
    }
}

// 🔹 Deactivate User (Soft Delete)
export const softDelete = async function (req: any, res: Response, next: NextFunction) {
    try {

        // Check if the user exists
        const { data: user, error: userError } = await database.from("users").select("id").eq("id", req.user.id).single();
        
        if (userError || !user) {
            return next(new AppError("User not found", 404));
        }

        const { data, error } = await database.from("users").update({ active: false }).eq("id", req.user.id);

        if (error) {
            return next(new AppError("Error deactivating user", 400));
        }

        res.status(200).json({
            status: "success",
            message: "User deactivated successfully",
        });
    } catch (err) {
        return next(new AppError("Internal server error", 500));
    }
};

// 🔹 Activate User (Admin Only)
export const ActivateUser = async function (req: any, res: Response, next: NextFunction) {
    try {
        const { userId } = req.params;
    
        // Check if the user exists
        const { data: user, error: userError } = await database.from("users").select("id").eq("id", userId).single();
        
        if (userError || !user) {
            return next(new AppError("User not found", 404));
        }

        const { data, error } = await database.from("users").update({ active: true }).eq("id", userId);

        if (error) {
            return next(new AppError("Error activating user", 400));
        }

        res.status(200).json({
            status: "success",
            message: "User activated successfully",
        });
    } catch (err) {
        return next(new AppError("Internal server error", 500));
    }
};

export const updateProfile = async function (req: any, res: Response, next: NextFunction) {
    try {
        // Get user from the database
        const { data: userData, error } = await database.from("users").select("*").eq("id", req.user.id);

        if (error) {
            return next(new AppError("Error fetching user data", 500));
        }

        if (!userData || userData.length === 0) {
            return next(new AppError("User does not exist", 404));
        }

        // Filter allowed fields
        const filteredBody = filteredObj(req.body, "first_name", "last_name", "address", "email", "phonenumber");

        if (Object.keys(filteredBody).length === 0) {
            return next(new AppError("No valid fields provided for update", 400));
        }

        // Update user profile
        const { error: updateError } = await database.from("users").update(filteredBody).eq("id", req.user.id);

        if (updateError) {
            return next(new AppError("Error updating profile", 500));
        }

        res.status(200).json({
            status: "success",
            message: "User profile updated successfully",
        });
    } catch (e) {
        return next(new AppError("Internal server error", 500));
    }
};

// Extend Express Request interface
declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

// Handles third-party authentication (Google).
export const oAuthMiddleware = (provider: 'google') => {
    return async (req: Request, res: Response) => {
        try {

            const redirectUrl = process.env.GOOGLE_REDIRECT_URI as string;

            const { data, error } = await database.auth.signInWithOAuth({
                provider,
                options: { redirectTo: redirectUrl }
            });

            if (error || !data.url) {
                console.error(`OAuth failed: ${error}`);
                res.status(500).json({ error: `${provider} authentication failed` });
                return;
            }

            // Redirect user to the OAuth login page
            res.redirect(data.url);
        } catch (error) {
            console.error(`OAuth ${provider} error:`, error);
            res.status(500).json({ error: "Internal server error" });
        }
    };
};

// OAuth Callback Handler - Stores session and links user to the database
export const oAuthCallbackHandler = async (req: Request, res: Response) => {
    try {
        // Get the user session after login
        const { data, error } = await database.auth.getSession();

        if (error || !data.session) {
            console.log(error)
            res.status(400).json({ error: "OAuth session retrieval failed" });
            return
        }

        const { user } = data.session;

        // Check if the user already exists in the users table
        const { data: existingUser, error: fetchError } = await database
            .from("users")
            .select("*")
            .eq("email", user.email)
            .single();

        if (fetchError) {
            console.error("Error fetching user:", fetchError.message);
        }

        // If user doesn't exist, create a new entry
        if (!existingUser) {
            const { error: insertError } = await database.from("users").insert([
                {
                    id: user.id, // Use the same ID as Supabase Auth
                    email: user.email,
                    username: user.user_metadata?.full_name || user.email?.split("@")[0],
                    first_name: user.user_metadata?.full_name?.split(" ")[0] || null,
                    last_name: user.user_metadata?.full_name?.split(" ")[1] || null,
                    role: "user", // Default role
                },
            ]);

            if (insertError) {
                console.error("Error creating user:", insertError.message);
                 res.status(500).json({ error: "Failed to create user" });
                 return
            }
        }

        // Send access token to the client (or redirect)
        res.json({
            message: "OAuth login successful",
            access_token: data.session.access_token,
            user: {
                id: user.id,
                email: user.email,
                name: user.user_metadata?.full_name,
            },
        });
    } catch (error) {
        console.error("OAuth callback error:", error);
        res.status(500).json({ error: "OAuth callback error" });
    }
};

export const logoutUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // 1️⃣ Clear Supabase session
        const { error } = await database.auth.signOut();

        if (error) {
             res.status(500).json({ status: "fail", message: "Failed to log out" });
             return
        }

        // 2️⃣ Invalidate session on the client by clearing cookies & local storage
        res.setHeader("Clear-Site-Data", '"cookies", "storage", "executionContexts"');

        // 3️⃣ Send a success response
        res.status(200).json({
            status: "success",
            message: "Logged out successfully",
        });
    } catch (error) {
        console.error("Logout error:", error);
        res.status(500).json({ status: "fail", message: "Server error" });
    }
};