import { isClientPhotoEnabled } from '../config/clientPhotoFeature.js';

const requireClientPhotoFeature = (_req, res, next) => {
  if (!isClientPhotoEnabled()) {
    return res.status(404).json({ error: 'Não encontrado.' });
  }

  return next();
};

export default requireClientPhotoFeature;
