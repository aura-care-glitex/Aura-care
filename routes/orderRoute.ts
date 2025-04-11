import express from "express";
import { authHeaders } from "../middlewares/authorization";
import { protect, restrictTo } from "../controllers/AuthController";
import { 
    checkout, 
    getAllOrders, 
    singleOrderModule, 
    updateOrderStatus 
} from "../controllers/orderController";

const router = express.Router();

// Routes
router.post("/", protect, authHeaders, checkout);
router.get("/", getAllOrders);
router.get("/:orderId", singleOrderModule); 
router.patch("/:orderId", protect, restrictTo("admin"), updateOrderStatus); 

export default router;