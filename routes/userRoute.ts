import express from 'express';
import {
    createUser,
    forgotpassword,
    loginUser,
    protect,
    resetPassword,
    restrictTo,
    updatingPassword
} from '../controllers/AuthController';
import { 
    ActivateUser, 
    authMiddleware, 
    getAllUsers, 
    getSingleUser, 
    oAuthCallbackHandler, 
    oAuthMiddleware, 
    Protect, 
    softDelete, 
    updateProfile 
} from "../controllers/userController";

const router = express.Router();

// 🔹 Authentication Routes
router.post('/register', createUser);
router.post('/login', loginUser);
router.patch('/forgotPassword', forgotpassword);
router.patch('/resetPassword/:token', resetPassword);

// 🔹 User Profile Management (Protected)
router.patch('/updatePassword', protect, updatingPassword);
router.patch('/updateProfile', protect, updateProfile);
router.patch('/softDelete', protect, softDelete);

// 🔹 Admin-Only Routes
router.get('/', protect, restrictTo('admin'), getAllUsers);
router.patch('/:userId', protect, restrictTo("admin"), ActivateUser);

// 🔹 Get User Details (Protected)
router.get('/:id', protect, getSingleUser);

// 🔹 OAuth2 authentication
router.get('/callback', oAuthCallbackHandler);
router.get('/google', oAuthMiddleware('google'));
router.get('/google/userData', Protect, authMiddleware)

export default router;