const jwt = require('jsonwebtoken');

function verifierToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Accès refusé, token manquant' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decode = jwt.verify(token, process.env.JWT_SECRET);
    req.adminId = decode.adminId;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token invalide ou expiré' });
  }
}

module.exports = verifierToken;