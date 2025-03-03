import { parsePhoneNumberFromString } from 'libphonenumber-js';

export const isValidPhoneNumber = (phone) => {
  const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
  const phoneNumber = parsePhoneNumberFromString(formattedPhone);

  if (!phoneNumber || !phoneNumber.isValid()) {
    return { isValid: false, formatted: null, error: "Número de telefone inválido." };
  }

  return {
    isValid: true,
    formatted: phoneNumber.format('E.164')
  };
};
