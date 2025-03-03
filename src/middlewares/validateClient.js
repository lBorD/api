import validator from 'validator';
import { isValidPhoneNumber } from '../utils/phoneValidator.js';

const validateClient = (req, res, next) => {
  const { email, name, phone } = req.body;

  if (validator.isEmail(email) == false) {
    return res.status(400).json({ error: "E-mail inválido." });
  }

  if (!name) {
    return res.status(400).json({ error: "É necessário fornecer o nome para finalizar o registro." });
  }

  if (phone && isValidPhoneNumber(phone).isValid === false) {
    return res.status(400).json({ error: "Número de telefone inválido." });
  }

  next();
};

export default validateClient;