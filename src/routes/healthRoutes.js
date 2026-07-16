import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  return res.status(200).json({ status: 'ok' });
});

export default router;
