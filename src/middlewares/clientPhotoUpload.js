import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fields: 0,
  },
}).single('photo');

const invalidPhotoUpload = (res) => res.status(400).json({
  error: 'Envie uma única foto no campo photo.',
});

const clientPhotoUpload = (req, res, next) => {
  upload(req, res, (error) => {
    if (error) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'A foto deve ter no máximo 5 MiB.' });
      }

      return invalidPhotoUpload(res);
    }

    if (!req.file) {
      return invalidPhotoUpload(res);
    }

    return next();
  });
};

export default clientPhotoUpload;
