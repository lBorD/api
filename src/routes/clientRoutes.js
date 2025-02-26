// routes/clientRoutes.js
import express from 'express';
const router = express.Router();

router.post('/clients', (req, res) => {
  // Lógica para cadastrar um cliente
  res.json({ message: 'Cliente cadastrado com sucesso!' });
});

export default router;