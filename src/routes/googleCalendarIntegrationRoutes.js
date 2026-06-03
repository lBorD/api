import express from 'express';
import GoogleCalendarIntegrationController from '../controllers/googleCalendarIntegration.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/status', GoogleCalendarIntegrationController.status);
router.post('/connect', GoogleCalendarIntegrationController.connect);
router.delete('/disconnect', GoogleCalendarIntegrationController.disconnect);

export default router;
