const validateService = async (req, res, next) => {
  const { name, price, estimatedTime, cost } = req.body;

  const validations = [
    { condition: !name, message: "É necessário fornecer o nome do serviço." },
    { condition: name && name.trim().length < 2, message: "O nome deve ter no mínimo 2 caracteres." },
    { condition: price === undefined || price === null, message: "É necessário fornecer o preço do serviço." },
    { condition: isNaN(price) || parseFloat(price) <= 0, message: "O preço deve ser um valor positivo." },
    { condition: !estimatedTime, message: "É necessário fornecer o tempo estimado do serviço." },
    { condition: isNaN(estimatedTime) || parseInt(estimatedTime) <= 0, message: "O tempo estimado deve ser um número positivo (em minutos)." },
    { condition: cost !== undefined && cost !== null && (isNaN(cost) || parseFloat(cost) < 0), message: "O custo deve ser um valor não negativo." }
  ];

  const error = validations.find(v => v.condition);
  if (error) {
    return res.status(400).json({ error: error.message });
  }

  next();
};

export default validateService;
