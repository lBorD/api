import express from 'express';
import TeamController from '../controllers/team.js';
import { authenticateToken, requireOwner } from '../middlewares/auth.js';

const router = express.Router();

router.use(authenticateToken, requireOwner);

router.get('/members', TeamController.listMembers);
router.post('/members', TeamController.createMember);
router.patch('/members/:id', TeamController.updateMember);

export default router;
