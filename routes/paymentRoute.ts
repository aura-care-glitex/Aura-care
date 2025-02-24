import express from "express";
import { 
    getSingleTransaction, 
    initializePayment, 
    listTransactions, 
    saveTransaction, 
    verifyTransactions 
} from "../controllers/paymentController";
import { protect, restrictTo } from "../controllers/AuthController";
import { authHeaders } from "../middlewares/authorization";

const router = express.Router();

// 🔹 Payment Initialization & Listing Transactions (Admin Only)
router.post("/paystack/pay", protect, authHeaders, initializePayment);
router.get("/paystack/pay", protect, restrictTo("admin"), listTransactions);

// 🔹 Verify Payment (Admin Only)
router.get("/paystack/verify/:referenceId", protect, restrictTo("admin"), verifyTransactions);

// 🔹 Get Single Transaction (Admin Only)
router.get("/paystack/:transactionId", protect, restrictTo("admin"), getSingleTransaction);

// 🔹 Webhook (No Authentication Required)
router.post("/paystack/payment/webhook", saveTransaction);

export default router;
