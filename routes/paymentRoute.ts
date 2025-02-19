import express from "express";
import {getSingleTransaction, initializePayment, listTransactions, verifyTransactions} from "../controllers/paymentController";
import { protect, restrictTo } from "../controllers/AuthController";
const router = express.Router();

router
    .route("/paystack/pay")
        .post(protect ,initializePayment)
        .get(protect,restrictTo('admin'),listTransactions);
router.get("/paystack/verify/:referenceId", verifyTransactions);
router.get("/paystack/:transactionId", getSingleTransaction)

export default router;