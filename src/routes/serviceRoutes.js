import express from 'express';
import ServiceController from '../controllers/service.js';
import validateService from '../middlewares/validateService.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.post('/register', validateService, ServiceController.registerService);
router.get('/search', ServiceController.listServices);
router.get('/search/active', ServiceController.listActiveServices);
router.get('/search/by-id/:id', ServiceController.getServiceById);
router.patch('/update/:id', validateService, ServiceController.updateService);
router.delete('/delete/:id', ServiceController.deleteService);

export default router;

