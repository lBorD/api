import express from 'express';
import AppointmentController from '../controllers/appointment.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', AppointmentController.listAppointments);
router.get('/suggestions', AppointmentController.suggestSlots);
router.post('/', AppointmentController.createAppointment);
router.patch('/:id', AppointmentController.updateAppointment);
router.patch('/:id/status', AppointmentController.updateAppointmentStatus);

export default router;

