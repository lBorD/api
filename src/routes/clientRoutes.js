import express from 'express';
import ClientController from '../controllers/client.js';
import validateClient from '../middlewares/validateClient.js';

const router = express.Router();

// Rotas de clientes CRUD
router.post('/register', validateClient, ClientController.registerClient); // Registrar cliente OK
router.put('/update/:id', ClientController.updateClient); // Atualizar cliente OK
router.delete('/delete/:id', ClientController.deleteClient); // Eliminar cliente OK

// Rotas de pesquisa de clientes
router.get('/search/sync', ClientController.listClientsSync); // Listar clientes por email OK
router.get('/search/by-name', ClientController.listClientsByName); // Listar clientes por nome OK
router.get('/search/by-lastname', ClientController.listClientsByLastName);   // Listar clientes por sobrenome OK
router.get('/search/by-phone', ClientController.listClientsByPhone); // Listar clientes por telefone OK
router.get('/search/by-id/:id', ClientController.getClientById); // Consultar cliente por ID OK
router.get('/search', ClientController.listClients); // Listar clientes OK

export default router;