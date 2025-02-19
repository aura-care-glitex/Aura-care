import express from 'express'

import {
    createProduct,
    deleteProduct,
    getAllProducts,
    getSingleProduct, productImage,
    updateProduct
} from "../controllers/ProductController";
import {protect, restrictTo} from "../controllers/AuthController";
import multer from "multer"
import AppError from "../utils/AppError";

const router = express.Router()

const storage = multer.memoryStorage()

const upload = multer({
    storage,
    limits: { fileSize: 300 * 1024 }, // setting limit to 300KB,
    fileFilter: (req, file, callback) => {
        if(!file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG)$/)) {
            return callback(new AppError('Only image files are allowed!', 401));
        }else{
            callback(null, true);  // accept the file
        }

    }
})

router
    .route('/')
        .get(getAllProducts)
        .post(protect, restrictTo('admin') ,createProduct)

router
    .route('/:productId')
        .get(getSingleProduct)
        // .patch(protect, restrictTo('admin'), updateProduct)
        .delete(protect, restrictTo('admin'), deleteProduct)
        .patch(protect, restrictTo('admin'), upload.single('file') ,productImage)
export default router;