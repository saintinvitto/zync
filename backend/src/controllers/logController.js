const logModel = require('../models/logModel');
const asyncHandler = require('../utils/asyncHandler');

async function listar(req, res) {
  const { leadId, limit } = req.query;
  const logs = await logModel.listarPorUsuario(req.usuario.id, { leadId, limit });
  res.json(logs);
}

module.exports = { listar: asyncHandler(listar) };
