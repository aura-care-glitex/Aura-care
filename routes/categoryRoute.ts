import express from "express";
import { 
    categoryImage,
    createCategory, 
    deleteCategory, 
    getAllCategories, 
    getSingleCategory, 
    updateCategory 
} from "../controllers/categoryController"; 

import { protect, restrictTo } from "../controllers/AuthController";
import multer from "multer";
import AppError from "../utils/AppError";

const router = express.Router();

// 🔹 Multer Configuration for Image Upload
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { fileSize: 300 * 1024 }, // 300KB limit
    fileFilter: (req, file, callback) => {
        if (!file.mimetype.startsWith("image/")) {
            return callback(new AppError('Only image files (JPG, PNG, JPEG) are allowed!', 400));
        }
        callback(null, true);
    }
});

// Public Routes
router.get("/", getAllCategories);
router.get("/:id", getSingleCategory);

// Protected Routes (Admin Only)
router.post("/", protect, restrictTo("admin"), createCategory);
router.patch("/:id", protect, restrictTo("admin"), updateCategory);
router.delete("/:id", protect, restrictTo("admin"), deleteCategory);

// 🔹 Upload Product Image
router.patch(
    "/categoryImage/:id",
    protect, 
    restrictTo('admin'), 
    upload.single('file'), 
    categoryImage
);

export default router;