import validator from 'validator';
import { isValidPhoneNumber } from '../utils/phoneValidator.js';
import { existingClient } from '../utils/emailValidator.js';

const validateClientUpdate = async (req, res, next) => {
  const { email, name, phone, birthDate, preferencesNotes } = req.body;
  const userId = req.user?.id;
  const normalizedName = typeof name === 'string' ? name.trim() : name;
  const normalizedEmail = typeof email === 'string' ? email.trim() : email;
  const normalizedPhone = typeof phone === 'string' ? phone.trim() : phone;
  const normalizedBirthDate = typeof birthDate === 'string' ? birthDate.trim() : birthDate;
  const hasPreferencesNotes = Object.prototype.hasOwnProperty.call(req.body, 'preferencesNotes');
  const normalizedPreferencesNotes = typeof preferencesNotes === 'string'
    ? preferencesNotes.trim()
    : preferencesNotes;
  const hasEmail = typeof normalizedEmail === 'string' && normalizedEmail.length > 0;
  const hasPhone = typeof normalizedPhone === 'string' && normalizedPhone.length > 0;
  const hasBirthDate = typeof normalizedBirthDate === 'string' && normalizedBirthDate.length > 0;

  req.body.name = normalizedName;
  req.body.email = hasEmail ? normalizedEmail : null;
  req.body.phone = hasPhone ? normalizedPhone : null;
  req.body.birthDate = hasBirthDate ? normalizedBirthDate : null;
  if (hasPreferencesNotes) {
    req.body.preferencesNotes = typeof normalizedPreferencesNotes === 'string' && normalizedPreferencesNotes.length > 0
      ? normalizedPreferencesNotes
      : null;
  }

  const emailExists = hasEmail ? await existingClient(normalizedEmail, req.params.id, userId) : false;

  const validations = [
    { condition: !normalizedName, message: "É necessário fornecer o nome para finalizar o registro." },
    { condition: hasEmail && !validator.isEmail(normalizedEmail), message: "E-mail inválido." },
    { condition: emailExists, message: "Já existe um cliente com este e-mail." },
    { condition: hasPhone && !isValidPhoneNumber(normalizedPhone).isValid, message: "Número de telefone inválido." },
    { condition: hasBirthDate && !validator.isDate(normalizedBirthDate, { format: 'YYYY-MM-DD', strictMode: true }), message: "Data de nascimento inválida. Use o formato YYYY-MM-DD." },
    { condition: hasBirthDate && new Date(normalizedBirthDate) > new Date(), message: "Data de nascimento não pode ser no futuro." },
    { condition: hasPreferencesNotes && preferencesNotes !== null && typeof preferencesNotes !== 'string', message: 'Preferências devem ser um texto ou nulas.' },
    { condition: typeof normalizedPreferencesNotes === 'string' && normalizedPreferencesNotes.length > 2000, message: 'Preferências não podem ter mais de 2000 caracteres.' },
  ];

  const error = validations.find((v) => v.condition);
  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return next();
};

export default validateClientUpdate;
