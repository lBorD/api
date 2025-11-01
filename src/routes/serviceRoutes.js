import express from 'express';
import ServiceController from '../controllers/service.js';
import validateService from '../middlewares/validateService.js';
import validateServiceUpdate from '../middlewares/validateServiceUpdate.js';

const router = express.Router();

// Rotas CRUD de serviços
router.post('/register', validateService, ServiceController.createService);
router.get('/search', ServiceController.listServices);
router.get('/search/active', ServiceController.listActiveServices);
router.get('/search/by-id/:id', ServiceController.getServiceById);
router.patch('/update/:id', validateServiceUpdate, ServiceController.updateService);
router.delete('/delete/:id', ServiceController.deleteService);

export default router;