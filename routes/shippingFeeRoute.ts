import express from "express";
import {
    getAllShippingFees,
    getSingleShippingFee,
    createShippingFee,
    updateShippingFee,
    deleteShippingFee
} from "./../controllers/ShippingFeeController";
import { protect, restrictTo } from "../controllers/AuthController";

const router = express.Router();

router.route("/")
    .get(protect ,getAllShippingFees)
    .post(protect, restrictTo("admin"), createShippingFee);

router.route("/:id")
    .get(protect,getSingleShippingFee)
    .patch(protect, restrictTo("admin"),updateShippingFee)
    .delete(protect, restrictTo("admin"),deleteShippingFee);

export default router;