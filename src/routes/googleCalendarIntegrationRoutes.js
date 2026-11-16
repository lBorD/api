import express from 'express';
import GoogleCalendarIntegrationController from '../controllers/googleCalendarIntegration.js';
import { authenticateToken, requireOwner } from '../middlewares/auth.js';

const router = express.Router();

router.use(authenticateToken);

// A funcionaria ve o status (os agendamentos dela sincronizam na conta da dona),
// mas so a dona conecta ou desconecta o Google.
router.get('/status', GoogleCalendarIntegrationController.status);
router.post('/connect', requireOwner, GoogleCalendarIntegrationController.connect);
router.delete('/disconnect', requireOwner, GoogleCalendarIntegrationController.disconnect);

export default router;
