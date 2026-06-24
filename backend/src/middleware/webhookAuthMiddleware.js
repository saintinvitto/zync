function verificarTokenWebhook(envVar) {
  return function (req, res, next) {
    const tokenEsperado = process.env[envVar];
    const authHeader = req.headers.authorization || '';

    if (tokenEsperado && authHeader !== `Bearer ${tokenEsperado}`) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    next();
  };
}

module.exports = verificarTokenWebhook;
