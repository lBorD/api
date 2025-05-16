import express from 'express';
import UserController from '../../controllers/userRegister.js';

const router = express.Router();

router.post('/register', UserController.registerUser);
router.get('/profile/:id', UserController);

export default router;