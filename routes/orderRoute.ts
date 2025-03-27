import express from "express"
import { authHeaders } from "../middlewares/authorization";
import { protect, restrictTo } from "../controllers/AuthController";
import { checkout, getAllOrders, updateOrderStatus } from "../controllers/orderController";

const router = express.Router();

router.post("/", protect, authHeaders, checkout);
router.get("/", getAllOrders);
router.patch("/:id", protect, restrictTo("admin"), updateOrderStatus)

export default router;