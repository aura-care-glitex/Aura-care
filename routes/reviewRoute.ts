import express from "express";

import {
    createReview,
    deleteReview,
    getAllReviews,
    getSingleReview,
    updateReview
} from "../controllers/reveiwController";
import {protect} from "../controllers/AuthController";
import { authHeaders } from "../middlewares/authorization";

const router = express.Router();

router.route('/').get(getAllReviews).post(protect, authHeaders,createReview);

router.route('/:reviewId').get(getSingleReview).patch(protect, authHeaders, updateReview).delete(protect,authHeaders,deleteReview);

export default router;