import express from 'express';

import {
    createProduct,
    deleteProduct,
    getAllProducts,
    getSingleProduct,
    productImage,
    updateProduct
} from "../controllers/ProductController";
import { protect, restrictTo } from "../controllers/AuthController";
import multer from "multer";
import AppError from "../utils/AppError";
import { authHeaders } from '../middlewares/authorization';

const router = express.Router();

// Multer Configuration for Image Upload
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { fileSize: 300 * 1024 }, // 300KB limit
    fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG)$/)) {
            return callback(new AppError('Only image files are allowed!', 401));
        }
        callback(null, true); // Accept the file
    }
});

// Product Routes
router
    .route('/')
    .get(getAllProducts)
    .post(protect, authHeaders, restrictTo('admin'), createProduct);

router
    .route('/:productId')
    .get(getSingleProduct)
    .patch(protect, restrictTo('admin'), updateProduct)
    .delete(protect, restrictTo('admin'), deleteProduct);


router.patch("/image/:productId", protect, restrictTo('admin'), upload.single('file'), productImage);

export default router;