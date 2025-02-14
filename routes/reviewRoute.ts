import express from "express";

import {
    createReview,
    deleteReview,
    getAllReviews,
    getSingleReview,
    updateReview
} from "../controllers/reveiwController";
import {protect} from "../controllers/AuthController";

const router = express.Router();

router.route('/').get(getAllReviews).post(protect,createReview);

router.route('/:reviewId').get(getSingleReview).patch(protect,updateReview).delete(protect, deleteReview);

export default router;