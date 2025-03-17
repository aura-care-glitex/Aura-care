import express from 'express';
import {
    createUser,
    loginUser,
    forgotpassword,
    resetPassword,
    updatingPassword,
    protect,
    restrictTo
} from '../controllers/AuthController';
import { 
    updateProfile,
    softDelete,
    getAllUsers,
    getSingleUser,
    ActivateUser
} from "../controllers/userController";
import { authHeaders } from '../middlewares/authorization';

const router = express.Router();

// 🔹 Authentication Routes
router.post('/register', createUser);
router.post('/login', loginUser);
router.patch('/forgotPassword', forgotpassword);
router.patch('/resetPassword/:token', resetPassword);

// 🔹 User Profile Management (Protected)
router.patch('/updatePassword', protect, updatingPassword);
router.patch('/updateProfile', protect, authHeaders, updateProfile);
router.patch('/softDelete', protect, softDelete);

// 🔹 Admin-Only Routes
router.get('/', protect, restrictTo('admin'), getAllUsers);
router.patch('/:userId', protect, restrictTo('admin'), ActivateUser);

// 🔹 General User Management (Protected)
router.get('/:id', protect, getSingleUser);

export default router;