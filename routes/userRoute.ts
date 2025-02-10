import express from 'express';

import { createUser, forgotpassword, loginUser } from '../controllers/AuthController';

const router = express.Router();

router.post('/register', createUser);
router.post('/login',loginUser );
router.patch('/forgotPassword', forgotpassword);

export default router;