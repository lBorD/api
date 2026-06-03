import express from 'express';
import ClientController from '../controllers/client.js';
import validateClient from '../middlewares/validateClient.js';
import validateClientUpdate from '../middlewares/validateClientUpdate.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = express.Router();

router.use(authenticateToken);

// Rotas de clientes CRUD
router.post('/register', validateClient, ClientController.registerClient);
router.patch('/update/:id', validateClientUpdate, ClientController.updateClient);
router.delete('/delete/:id', ClientController.deleteClient);

// Rotas de pesquisa de clientes
router.get('/search/sync', ClientController.listClientsSync);
router.get('/search/by-name', ClientController.listClientsByName);
router.get('/search/by-lastname', ClientController.listClientsByLastName);
router.get('/search/by-phone', ClientController.listClientsByPhone);
router.get('/search/by-id/:id', ClientController.getClientById);
router.get('/search', ClientController.listClients);

export default router;

