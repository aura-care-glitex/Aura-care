import express from "express"
import { authHeaders } from "../middlewares/authorization";
import { protect } from "../controllers/AuthController";
import { checkout } from "../controllers/orderController";

const router = express.Router();

router.post("/", protect, authHeaders, checkout)

export default router;