const validateService = (req, res, next) => {
  const { name, price, estimatedTime, cost = 0 } = req.body;

  const parsedPrice = Number(price);
  const parsedEstimatedTime = Number(estimatedTime);
  const parsedCost = Number(cost);

  const validations = [
    { condition: !name || String(name).trim().length < 2, message: "Nome deve ter no mínimo 2 caracteres." },
    { condition: Number.isNaN(parsedPrice) || parsedPrice <= 0, message: "Preço deve ser maior que zero." },
    { condition: Number.isNaN(parsedEstimatedTime) || !Number.isInteger(parsedEstimatedTime) || parsedEstimatedTime <= 0, message: "Tempo estimado deve ser um número inteiro maior que zero." },
    { condition: Number.isNaN(parsedCost) || parsedCost < 0, message: "Custo não pode ser negativo." }
  ];

  const error = validations.find((item) => item.condition);
  if (error) {
    return res.status(400).json({ error: error.message });
  }

  next();
};

export default validateService;
