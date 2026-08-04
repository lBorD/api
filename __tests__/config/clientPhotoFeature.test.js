import { isClientPhotoEnabled } from '../../src/config/clientPhotoFeature.js';

describe('client photo feature', () => {
  const originalValue = process.env.CLIENT_PHOTO_ENABLED;

  afterEach(() => {
    if (originalValue === undefined) {
      delete process.env.CLIENT_PHOTO_ENABLED;
    } else {
      process.env.CLIENT_PHOTO_ENABLED = originalValue;
    }
  });

  it.each([undefined, '', 'true ', 'TRUE', '1', 'false'])(
    'mantém foto desativada para CLIENT_PHOTO_ENABLED=%p',
    (value) => {
      if (value === undefined) {
        delete process.env.CLIENT_PHOTO_ENABLED;
      } else {
        process.env.CLIENT_PHOTO_ENABLED = value;
      }

      expect(isClientPhotoEnabled()).toBe(false);
    },
  );

  it('habilita foto somente para o opt-in literal true', () => {
    process.env.CLIENT_PHOTO_ENABLED = 'true';

    expect(isClientPhotoEnabled()).toBe(true);
  });
});
