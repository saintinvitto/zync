const planoModel = require('../models/planoModel');
const asyncHandler = require('../utils/asyncHandler');

async function listar(req, res) {
  const planos = await planoModel.listarAtivos();
  res.json(planos);
}

module.exports = { listar: asyncHandler(listar) };
