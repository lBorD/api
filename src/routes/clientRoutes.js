import express from 'express';
import ClientController from '../controllers/client.js';

const router = express.Router();

// Rotas de clientes
router.post('/register', ClientController.registerClient); // Registrar cliente

router.get('/search', ClientController.listClients); // Listar clientes
router.get('/search/:id', ClientController.getClientById); // Consultar cliente por ID

router.put('/clients/:id', ClientController.updateClient); // Atualizar cliente
router.delete('/clients/:id', ClientController.deleteClient); // Eliminar cliente 

router.get('/search/by-name', ClientController.listClientsByName); // Listar clientes por nome
router.get('/search/by-lastname', ClientController.listClientsByLastName);   // Listar clientes por sobrenome
router.get('/search/by-phone', ClientController.listClientsByPhone); // Listar clientes por telefone

export default router;