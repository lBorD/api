import validator from 'validator';
import { isValidPhoneNumber } from '../utils/phoneValidator.js';
import { existingClient } from '../utils/emailValidator.js';

const validateClient = async (req, res, next) => {
  const { email, name, phone, birthDate } = req.body;
  const userId = req.user?.id;
  const normalizedEmail = typeof email === 'string' ? email.trim() : email;
  const hasEmail = typeof normalizedEmail === 'string' && normalizedEmail.length > 0;

  req.body.email = hasEmail ? normalizedEmail : null;

  const emailExists = hasEmail ? await existingClient(normalizedEmail, null, userId) : false;

  const validations = [
    { condition: !name, message: "É necessário fornecer o nome para finalizar o registro." },
    { condition: !phone, message: "É necessário fornecer o número de telefone para finalizar o registro." },
    { condition: !birthDate, message: "É necessário fornecer a data de nascimento para finalizar o registro." },
    { condition: hasEmail && !validator.isEmail(normalizedEmail), message: "E-mail inválido." },
    { condition: emailExists, message: "Já existe um cliente com este e-mail." },
    { condition: phone && !isValidPhoneNumber(phone).isValid, message: "Número de telefone inválido." },
    { condition: !validator.isDate(birthDate, { format: 'YYYY-MM-DD', strictMode: true }), message: "Data de nascimento inválida. Use o formato YYYY-MM-DD." },
    { condition: new Date(birthDate) > new Date(), message: "Data de nascimento não pode ser no futuro." }
  ];

  const error = validations.find((v) => v.condition);
  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return next();
};

export default validateClient;
