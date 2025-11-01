import validator from 'validator';
import { isValidPhoneNumber } from '../utils/phoneValidator.js';
import { existingClient } from '../utils/emailValidator.js';

const validateClientUpdate = async (req, res, next) => {
  const { email, phone, birthDate } = req.body;

  const emailExists = await existingClient(email, req.params.id);

  const validations = [
    { condition: email && !validator.isEmail(email), message: "E-mail inválido." },
    { condition: email && emailExists, message: "Já existe um cliente com este e-mail." },
    { condition: phone && !isValidPhoneNumber(phone).isValid, message: "Número de telefone inválido." },
    { condition: birthDate && !validator.isDate(birthDate, { format: 'YYYY-MM-DD', strictMode: true }), message: "Data de nascimento inválida. Use o formato YYYY-MM-DD." },
    { condition: new Date(birthDate) > new Date(), message: "Data de nascimento não pode ser no futuro." }
  ];

  const error = validations.find(v => v.condition);
  if (error) {
    return res.status(400).json({ error: error.message });
  }

  next();
};

export default validateClientUpdate;