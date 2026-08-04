import express from 'express';
import ClientController from '../controllers/client.js';
import ClientProfileController from '../controllers/clientProfile.js';
import validateClient from '../middlewares/validateClient.js';
import validateClientUpdate from '../middlewares/validateClientUpdate.js';
import clientPhotoUpload from '../middlewares/clientPhotoUpload.js';
import requireClientPhotoFeature from '../middlewares/requireClientPhotoFeature.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = express.Router();

router.use(authenticateToken);

// Rotas de clientes CRUD
router.post('/register', validateClient, ClientController.registerClient);
router.patch('/update/:id', validateClientUpdate, ClientController.updateClient);
router.delete('/delete/:id', ClientController.deleteClient);
router.get('/:id/profile', ClientProfileController.getProfile);
router.get('/:id/appointments/history', ClientProfileController.getHistory);
router.put(
  '/:id/photo',
  requireClientPhotoFeature,
  ClientProfileController.validatePhotoOwnership,
  clientPhotoUpload,
  ClientProfileController.putPhoto,
);
router.get('/:id/photo', requireClientPhotoFeature, ClientProfileController.getPhoto);
router.delete('/:id/photo', requireClientPhotoFeature, ClientProfileController.deletePhoto);

// Rotas de pesquisa de clientes
router.get('/search/sync', ClientController.listClientsSync);
router.get('/search/by-name', ClientController.listClientsByName);
router.get('/search/by-lastname', ClientController.listClientsByLastName);
router.get('/search/by-phone', ClientController.listClientsByPhone);
router.get('/search/by-id/:id', ClientController.getClientById);
router.get('/search', ClientController.listClients);

export default router;

