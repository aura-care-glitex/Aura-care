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
    ActivateUser,
    oAuthMiddleware,
    oAuthCallbackHandler,
    logoutUser
} from "../controllers/userController";

const router = express.Router();

// 🔹 Authentication Routes
router.post('/register', createUser);
router.post('/login', loginUser);
router.patch('/forgotPassword', forgotpassword);
router.patch('/resetPassword/:token', resetPassword);

// 🔹 OAuth Authentication
router.get('/google', oAuthMiddleware('google'));
router.get('/auth/callback', oAuthCallbackHandler);

// 🔹 User Profile Management (Protected)
router.patch('/updatePassword', protect, updatingPassword);
router.patch('/updateProfile', protect, updateProfile);
router.patch('/softDelete', protect, softDelete);

// 🔹 Admin-Only Routes
router.get('/', protect, restrictTo('admin'), getAllUsers);
router.patch('/:userId', protect, restrictTo('admin'), ActivateUser);
router.post("/logout",protect, restrictTo('admin', 'user'), logoutUser);


// 🔹 General User Management (Protected)
router.get('/:id', protect, getSingleUser);

export default router;