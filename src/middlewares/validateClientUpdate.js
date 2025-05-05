import validator from 'validator';
import { isValidPhoneNumber } from '../utils/phoneValidator.js';
import { existingClient } from '../utils/emailValidator.js';

const validateClientUpdate = async (req, res, next) => {
  const { email, name, phone, birthDate } = req.body;

  const emailExists = await existingClient(email, req.params.id);

  const validations = [
    { condition: !email, message: "É necessário fornecer o e-mail para finalizar o registro." },
    { condition: !name, message: "É necessário fornecer o nome para finalizar o registro." },
    { condition: !phone, message: "É necessário fornecer o número de telefone para finalizar o registro." },
    { condition: !birthDate, message: "É necessário fornecer a data de nascimento para finalizar o registro." },
    { condition: !validator.isEmail(email), message: "E-mail inválido." },
    { condition: phone && !isValidPhoneNumber(phone).isValid, message: "Número de telefone inválido." },
    { condition: !validator.isDate(birthDate, { format: 'YYYY-MM-DD', strictMode: true }), message: "Data de nascimento inválida. Use o formato YYYY-MM-DD." },
    { condition: new Date(birthDate) > new Date(), message: "Data de nascimento não pode ser no futuro." }
  ];

  const error = validations.find(v => v.condition);
  if (error) {
    return res.status(400).json({ error: error.message });
  }

  next();
};

export default validateClientUpdate;