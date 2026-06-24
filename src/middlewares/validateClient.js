import validator from 'validator';
import { isValidPhoneNumber } from '../utils/phoneValidator.js';
import { existingClient } from '../utils/emailValidator.js';

const validateClient = async (req, res, next) => {
  const { email, name, phone, birthDate } = req.body;
  const userId = req.user?.id;
  const normalizedName = typeof name === 'string' ? name.trim() : name;
  const normalizedEmail = typeof email === 'string' ? email.trim() : email;
  const normalizedPhone = typeof phone === 'string' ? phone.trim() : phone;
  const normalizedBirthDate = typeof birthDate === 'string' ? birthDate.trim() : birthDate;
  const hasEmail = typeof normalizedEmail === 'string' && normalizedEmail.length > 0;
  const hasPhone = typeof normalizedPhone === 'string' && normalizedPhone.length > 0;
  const hasBirthDate = typeof normalizedBirthDate === 'string' && normalizedBirthDate.length > 0;

  req.body.name = normalizedName;
  req.body.email = hasEmail ? normalizedEmail : null;
  req.body.phone = hasPhone ? normalizedPhone : null;
  req.body.birthDate = hasBirthDate ? normalizedBirthDate : null;

  const emailExists = hasEmail ? await existingClient(normalizedEmail, null, userId) : false;

  const validations = [
    { condition: !normalizedName, message: "É necessário fornecer o nome para finalizar o registro." },
    { condition: hasEmail && !validator.isEmail(normalizedEmail), message: "E-mail inválido." },
    { condition: emailExists, message: "Já existe um cliente com este e-mail." },
    { condition: hasPhone && !isValidPhoneNumber(normalizedPhone).isValid, message: "Número de telefone inválido." },
    { condition: hasBirthDate && !validator.isDate(normalizedBirthDate, { format: 'YYYY-MM-DD', strictMode: true }), message: "Data de nascimento inválida. Use o formato YYYY-MM-DD." },
    { condition: hasBirthDate && new Date(normalizedBirthDate) > new Date(), message: "Data de nascimento não pode ser no futuro." }
  ];

  const error = validations.find((v) => v.condition);
  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return next();
};

export default validateClient;
