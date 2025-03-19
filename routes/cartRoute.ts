import express from "express";
import { protect } from "../controllers/AuthController";
import { addToCart, decrementCartItem, deleteCartItem, getAllCart } from "../controllers/cartController";
import { authHeaders } from "../middlewares/authorization";

const router = express.Router()

router.get("/", protect, authHeaders, getAllCart)
router.post("/addCart", protect, authHeaders, addToCart)
router.delete("/deleteCart", protect, authHeaders, deleteCartItem)
router.patch("/decrement", protect, authHeaders, decrementCartItem)

export default router;