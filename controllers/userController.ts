import { NextFunction, Response,Request } from "express";
import AppError from "../utils/AppError";
import {database} from "../middlewares/database";
import redis from "../middlewares/redisConfig";
import dotenv from "dotenv"
import { decodedToken } from "../middlewares/authorization";

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
        const userId = await decodedToken(req.token)
        // Get user from the database
        const { data: userData, error } = await database.from("users").select("*").eq("id", userId);

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

        // Check if email is already in use by another user
        if (filteredBody.email) {
            const { data: existingEmail, error: emailCheckError } = await database
                .from("users")
                .select("id")
                .eq("email", filteredBody.email)
                .neq("id", userId);

            if (emailCheckError) return next(new AppError("Error checking email uniqueness", 500));
            if (existingEmail && existingEmail.length > 0) {
                return next(new AppError("Email already in use", 400));
            }
        }

        // Check if phonenumber is already in use by another user
        if (filteredBody.phonenumber) {
            const { data: existingPhone, error: phoneCheckError } = await database
                .from("users")
                .select("id")
                .eq("phonenumber", filteredBody.phonenumber)
                .neq("id", userId);

            if (phoneCheckError) return next(new AppError("Error checking phone number uniqueness", 500));
            if (existingPhone && existingPhone.length > 0) {
                return next(new AppError("Phone number already in use", 400));
            }
        }
        // Update user profile
        const { error: updateError } = await database.from("users").update(filteredBody).eq("id", userId);

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