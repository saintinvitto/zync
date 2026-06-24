const notificacaoModel = require('../models/notificacaoModel');
const asyncHandler = require('../utils/asyncHandler');

async function listar(req, res) {
  const { lida, limit } = req.query;
  const notificacoes = await notificacaoModel.listarPorUsuario(req.usuario.id, { lida, limit });
  res.json(notificacoes);
}

async function contarNaoLidas(req, res) {
  const naoLidas = await notificacaoModel.contarNaoLidas(req.usuario.id);
  res.json({ naoLidas });
}

async function marcarLida(req, res) {
  const notificacao = await notificacaoModel.buscarPorId(req.params.id, req.usuario.id);
  if (!notificacao) return res.status(404).json({ error: 'Notificação não encontrada' });

  await notificacaoModel.marcarComoLida(req.params.id, req.usuario.id);
  res.status(204).send();
}

async function marcarTodasLidas(req, res) {
  await notificacaoModel.marcarTodasComoLidas(req.usuario.id);
  res.status(204).send();
}

module.exports = {
  listar: asyncHandler(listar),
  contarNaoLidas: asyncHandler(contarNaoLidas),
  marcarLida: asyncHandler(marcarLida),
  marcarTodasLidas: asyncHandler(marcarTodasLidas),
};
