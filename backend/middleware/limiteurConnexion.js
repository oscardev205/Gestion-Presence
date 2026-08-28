const rateLimit = require('express-rate-limit');

const limiteurConnexion = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 8,
  message: { message: 'Trop de tentatives de connexion, réessaie dans quelques minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = limiteurConnexion;