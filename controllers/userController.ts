import { NextFunction, Response,Request } from "express";
import AppError from "../utils/AppError";
import {database} from "../middlewares/database";
import redis from "../middlewares/redisConfig";

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

// OAuth Callback Handler(session token stored)
export const oAuthCallbackHandler = async (req: Request, res: Response) => {
    try {
        const { data, error } = await database.auth.getSession();

        if (error || !data.session) {
            res.status(400);
            return
        }

        const { access_token } = data.session;

        res.redirect(`https://www.google.com?access_token=${access_token}`);
    } catch (error) {
        console.error('OAuth callback error:', error);
        res.status(500).json({message:"OAuth callback error"});
    }
};

// Authentication Middleware
// Ensures a user is authenticated before accessing protected routes
export const Protect = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { data: { session }, error } = await database.auth.getSession();

        if (error || !session) {
            res.status(401).json({ error: 'Unauthorized - Please log in' });
            return
        }

        req.user = session.user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({ error: 'Authentication check failed' });
    }
};

// Protected Route Handler
// Ensures only authenticated users can access their profile data.
export const authMiddleware = async (req: Request, res: Response) => {
    try {
        const user = req.user;

        if (!user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        res.status(200).json({
            message: "Protected profile data",
            user: {
                id: user.id,
                email: user.email,
                name: user.user_metadata?.full_name
            }
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: "Failed to fetch profile" });
    }
};