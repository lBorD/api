import requireClientPhotoFeature from '../../src/middlewares/requireClientPhotoFeature.js';

describe('requireClientPhotoFeature', () => {
  const originalValue = process.env.CLIENT_PHOTO_ENABLED;

  afterEach(() => {
    if (originalValue === undefined) {
      delete process.env.CLIENT_PHOTO_ENABLED;
    } else {
      process.env.CLIENT_PHOTO_ENABLED = originalValue;
    }
  });

  it('responde 404 genérico e não continua quando a foto está desativada', () => {
    delete process.env.CLIENT_PHOTO_ENABLED;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    requireClientPhotoFeature({}, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Não encontrado.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('continua somente com opt-in explícito', () => {
    process.env.CLIENT_PHOTO_ENABLED = 'true';
    const next = jest.fn();

    requireClientPhotoFeature({}, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
