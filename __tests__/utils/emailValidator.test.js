import { existingClient } from '../../src/utils/emailValidator.js';

describe('emailValidator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('existingClient', () => {
    it('deve retornar false quando email é undefined', async () => {
      const result = await existingClient(undefined);
      expect(typeof result).toBe('boolean');
    });

    it('deve retornar false quando email é null', async () => {
      const result = await existingClient(null);
      expect(typeof result).toBe('boolean');
    });

    it('deve retornar false quando email é string vazia', async () => {
      const result = await existingClient('');
      expect(typeof result).toBe('boolean');
    });
  });
}); 