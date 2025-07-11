import { isValidPhoneNumber } from '../../src/utils/phoneValidator.js';

describe('phoneValidator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isValidPhoneNumber', () => {
    it('deve retornar inválido para número vazio', () => {
      const result = isValidPhoneNumber('');

      expect(result).toEqual({
        isValid: false,
        formatted: null,
        error: 'Número de telefone inválido.'
      });
    });

    it('deve retornar inválido para null', () => {
      const result = isValidPhoneNumber(null);

      expect(result).toEqual({
        isValid: false,
        formatted: null,
        error: 'Número de telefone inválido.'
      });
    });

    it('deve retornar inválido para undefined', () => {
      const result = isValidPhoneNumber(undefined);

      expect(result).toEqual({
        isValid: false,
        formatted: null,
        error: 'Número de telefone inválido.'
      });
    });

    it('deve retornar inválido para tipo não string', () => {
      const result = isValidPhoneNumber(123);

      expect(result).toEqual({
        isValid: false,
        formatted: null,
        error: 'Número de telefone inválido.'
      });
    });
  });
}); 