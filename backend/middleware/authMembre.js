const jwt = require('jsonwebtoken');

function verifierTokenMembre(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Accès refusé, token manquant' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decode = jwt.verify(token, process.env.JWT_SECRET);
    if (decode.type !== 'membre') {
      return res.status(403).json({ message: 'Accès réservé aux membres' });
    }
    req.membreId = decode.membreId;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token invalide ou expiré' });
  }
}

module.exports = verifierTokenMembre;