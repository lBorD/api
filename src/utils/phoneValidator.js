import { parsePhoneNumberFromString } from 'libphonenumber-js';

export const isValidPhoneNumber = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, formatted: null, error: "Número de telefone inválido." };
  }

  try {
    const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
    const phoneNumber = parsePhoneNumberFromString(formattedPhone);

    if (!phoneNumber || !phoneNumber.isValid()) {
      return { isValid: false, formatted: null, error: "Número de telefone inválido." };
    }

    return {
      isValid: true,
      formatted: phoneNumber.format('E.164')
    };
  } catch (error) {
    console.error("Erro ao validar telefone:", error);
    return { isValid: false, formatted: null, error: "Erro ao processar o número de telefone." };
  }
};
