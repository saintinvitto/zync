const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const usuarioModel = require('../models/usuarioModel');

async function register(req, res) {
  const { nome, email, senha } = req.body;
  if (!nome || !email || !senha) {
    return res.status(400).json({ error: 'nome, email e senha são obrigatórios' });
  }

  const existente = await usuarioModel.findByEmail(email);
  if (existente) {
    return res.status(409).json({ error: 'E-mail já cadastrado' });
  }

  const senha_hash = await bcrypt.hash(senha, 10);
  const usuario = await usuarioModel.create({ nome, email, senha_hash });

  res.status(201).json(usuario);
}

async function login(req, res) {
  const { email, senha } = req.body;
  if (!email || !senha) {
    return res.status(400).json({ error: 'email e senha são obrigatórios' });
  }

  const usuario = await usuarioModel.findByEmail(email);
  if (!usuario) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
  if (!senhaValida) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const token = jwt.sign(
    { id: usuario.id, email: usuario.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ token, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email } });
}

module.exports = { register, login };
