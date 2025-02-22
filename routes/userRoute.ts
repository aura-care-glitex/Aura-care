import express from 'express';

import {
    createUser,
    forgotpassword,
    loginUser,
    protect,
    resetPassword, restrictTo,
    updatingPassword
} from '../controllers/AuthController';
import {ActivateUser, getAllUsers, getSingleUser, softDelete, updateProfile} from "../controllers/userController";

const router = express.Router();

router.get('/', protect, restrictTo('admin'), getAllUsers);
router.post('/register', createUser);
router.post('/login',loginUser );
router.patch('/forgotPassword', forgotpassword);
router.patch('/updatePassword', protect, updatingPassword);
router.patch('/softDelete', protect, softDelete);
router.patch('/updateProfile', protect, updateProfile);

router.get('/:id', protect, getSingleUser);
router.patch('/:userId', protect, restrictTo("admin"), ActivateUser);
router.patch('/resetPassword/:token', resetPassword);

export default router;