const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const limiteurConnexion = require('../middleware/limiteurConnexion');

const router = express.Router();

router.post('/connexion', limiteurConnexion, async (req, res) => {
  const { identifiant, organisationId } = req.body;

  if (!identifiant) {
    return res.status(400).json({ message: 'Identifiant obligatoire' });
  }

  try {
    let requete = `SELECT m.*, o.nom AS organisation_nom FROM membres m
       JOIN organisations o ON o.id = m.organisation_id
       WHERE m.identifiant = $1 AND m.statut = 'actif'`;
    const params = [identifiant];

    if (organisationId) {
      requete += ' AND m.organisation_id = $2';
      params.push(organisationId);
    }

    const resultat = await pool.query(requete, params);

    if (resultat.rows.length === 0) {
      return res.status(404).json({ message: 'Identifiant introuvable ou compte suspendu' });
    }

    if (resultat.rows.length > 1) {
      return res.status(300).json({
        message: 'Plusieurs organisations correspondent à cet identifiant, précise laquelle',
        organisations: resultat.rows.map((m) => ({ id: m.organisation_id, nom: m.organisation_nom })),
      });
    }

    const membre = resultat.rows[0];
    const token = jwt.sign({ membreId: membre.id, type: 'membre' }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      membre: {
        id: membre.id,
        nom: membre.nom,
        identifiant: membre.identifiant,
        role: membre.role,
        organisationNom: membre.organisation_nom,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur lors de la connexion' });
  }
});

module.exports = router;