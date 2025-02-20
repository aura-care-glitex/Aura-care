import express from "express";
import {getSingleTransaction, initializePayment, listTransactions, saveTransaction, verifyTransactions} from "../controllers/paymentController";
import { protect, restrictTo } from "../controllers/AuthController";
import { authHeaders } from "../middlewares/authorization";
const router = express.Router();

router
    .route("/paystack/pay")
        .post(protect, authHeaders ,initializePayment)
        .get(protect,restrictTo('admin'),listTransactions);
router.get("/paystack/verify/:referenceId", verifyTransactions);
router.get("/paystack/:transactionId", getSingleTransaction);
router.post("/paystack/payment/webhook", saveTransaction)

export default router;