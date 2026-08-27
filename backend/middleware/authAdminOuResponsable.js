const jwt = require('jsonwebtoken');
const pool = require('../db');

async function verifierAdminOuResponsable(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Accès refusé, token manquant' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decode = jwt.verify(token, process.env.JWT_SECRET);

    if (decode.type === 'responsable') {
      req.typeCompte = 'responsable';
      req.organisationIdAutorisee = decode.organisationId;
      return next();
    }

    if (decode.adminId) {
      req.typeCompte = 'admin';
      req.adminId = decode.adminId;
      return next();
    }

    return res.status(403).json({ message: 'Type de compte non reconnu' });
  } catch (err) {
    return res.status(401).json({ message: 'Token invalide ou expiré' });
  }
}

async function verifierOrganisationAutorisee(organisationId, req) {
  if (req.typeCompte === 'responsable') {
    return Number(req.organisationIdAutorisee) === Number(organisationId);
  }
  const resultat = await pool.query(
    'SELECT id FROM organisations WHERE id = $1 AND admin_id = $2',
    [organisationId, req.adminId]
  );
  return resultat.rows.length > 0;
}

module.exports = { verifierAdminOuResponsable, verifierOrganisationAutorisee };