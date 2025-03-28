import express from 'express';
import login from '../controllers/login.js';
import userRegister from '../controllers/userRegister.js';

const router = express.Router();

router.post('/login', login);
router.post('/user', userRegister)

export default router;
