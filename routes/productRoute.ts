import express from 'express';
import multer from 'multer';

import {
    createProduct,
    deleteProduct,
    getAllProducts,
    getSingleProduct,
    productImage,
    updateProduct
} from "../controllers/ProductController";

import { protect, restrictTo } from "../controllers/AuthController";
import { authHeaders } from '../middlewares/authorization';
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

// 🔹 Product Routes
router
    .route('/')
    .get(getAllProducts) // (Anyone can view products)
    .post(protect, authHeaders, restrictTo('admin'), createProduct); // Admin Only

router
    .route('/:productId')
    .get(getSingleProduct) // Public Route
    .patch(protect, restrictTo('admin'), updateProduct) // Admin Only
    .delete(protect, restrictTo('admin'), deleteProduct); // Admin Only

// 🔹 Upload Product Image
router.patch(
    "/image/:productId",
    protect, 
    restrictTo('admin'), 
    upload.single('file'), 
    productImage
);

export default router;