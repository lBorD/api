import express from 'express';
import ClientController from '../controllers/client.js';
import validateClient from '../middlewares/validateClient.js';

const router = express.Router();

// Rotas de clientes
router.post('/register', validateClient, ClientController.registerClient); // Registrar cliente OK

router.get('/search', ClientController.listClients); // Listar clientes OK
router.get('/search/:id', ClientController.getClientById); // Consultar cliente por ID OK

router.put('/update/:id', ClientController.updateClient); // Atualizar cliente OK
router.delete('/delete/:id', ClientController.deleteClient); // Eliminar cliente OK

router.get('/search/by-name', ClientController.listClientsByName); // Listar clientes por nome
router.get('/search/by-lastname', ClientController.listClientsByLastName);   // Listar clientes por sobrenome
router.get('/search/by-phone', ClientController.listClientsByPhone); // Listar clientes por telefone

export default router;