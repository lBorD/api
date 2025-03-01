// middleware/validateEmail.js
import validator from 'validator';
import { parsePhoneNumberFromString } from 'libphonenumber-js';



const validateClient = (req, res, next) => {
  const { email, name, phone } = req.body;

  if (validator.isEmail(email) == false) {
    return res.status(400).json({ error: "E-mail inválido." });
  }

  if (!name) {
    return res.status(400).json({ error: "É necessário fornecer o nome para finalizar o registro." });
  }

  if (phone) {
    const phoneNumber = parsePhoneNumberFromString(phone);
    if (phoneNumber == undefined || !phoneNumber.isValid()) {
      return res.status(400).json({ error: "Número de telefone inválido." });
    }
  }

  next();
};

export default validateClient;