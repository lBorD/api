import express from 'express';
import ServiceController from '../controllers/service.js';
import validateService from '../middlewares/validateService.js';

const router = express.Router();

router.post('/register', validateService, ServiceController.registerService);
router.get('/search', ServiceController.listServices);
router.get('/search/active', ServiceController.listActiveServices);

export default router;
