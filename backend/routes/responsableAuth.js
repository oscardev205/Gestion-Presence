const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const verifierToken = require('../middleware/auth');
const limiteurConnexion = require('../middleware/limiteurConnexion');

const router = express.Router();

function emailValide(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post('/creer', verifierToken, async (req, res) => {
  const { organisationId, nom, email, motDePasse } = req.body;

  if (!organisationId || !nom || !email || !motDePasse) {
    return res.status(400).json({ message: 'Tous les champs sont obligatoires' });
  }
    if (!emailValide(email)) {
    return res.status(400).json({ message: 'Adresse email invalide' });
  }

  try {
    const organisation = await pool.query(
      'SELECT * FROM organisations WHERE id = $1 AND admin_id = $2',
      [organisationId, req.adminId]
    );
    if (organisation.rows.length === 0) {
      return res.status(404).json({ message: 'Organisation introuvable' });
    }

    const dejaExistant = await pool.query('SELECT id FROM responsables WHERE email = $1', [email]);
    if (dejaExistant.rows.length > 0) {
      return res.status(409).json({ message: 'Cet email est déjà utilisé' });
    }

    const motDePasseHache = await bcrypt.hash(motDePasse, 10);

    const resultat = await pool.query(
      `INSERT INTO responsables (organisation_id, nom, email, mot_de_passe)
       VALUES ($1, $2, $3, $4) RETURNING id, organisation_id, nom, email, cree_le`,
      [organisationId, nom, email, motDePasseHache]
    );

    res.status(201).json(resultat.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur lors de la création du responsable' });
  }
});

router.get('/organisation/:organisationId', verifierToken, async (req, res) => {
  try {
    const organisation = await pool.query(
      'SELECT * FROM organisations WHERE id = $1 AND admin_id = $2',
      [req.params.organisationId, req.adminId]
    );
    if (organisation.rows.length === 0) {
      return res.status(404).json({ message: 'Organisation introuvable' });
    }

    const resultat = await pool.query(
      'SELECT id, nom, email, cree_le FROM responsables WHERE organisation_id = $1 ORDER BY cree_le DESC',
      [req.params.organisationId]
    );

    res.json(resultat.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.delete('/:id', verifierToken, async (req, res) => {
  try {
    const responsable = await pool.query(
      `SELECT r.* FROM responsables r
       JOIN organisations o ON o.id = r.organisation_id
       WHERE r.id = $1 AND o.admin_id = $2`,
      [req.params.id, req.adminId]
    );
    if (responsable.rows.length === 0) {
      return res.status(404).json({ message: 'Responsable introuvable' });
    }

    await pool.query('DELETE FROM responsables WHERE id = $1', [req.params.id]);
    res.json({ message: 'Responsable supprimé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.post('/connexion', limiteurConnexion, async (req, res) => {
  const { email, motDePasse } = req.body;

  if (!email || !motDePasse) {
    return res.status(400).json({ message: 'Email et mot de passe sont obligatoires' });
  }

  try {
    const resultat = await pool.query(
      `SELECT r.*, o.nom AS organisation_nom, o.type AS organisation_type
       FROM responsables r
       JOIN organisations o ON o.id = r.organisation_id
       WHERE r.email = $1`,
      [email]
    );
    const responsable = resultat.rows[0];

    if (!responsable) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const motDePasseValide = await bcrypt.compare(motDePasse, responsable.mot_de_passe);
    if (!motDePasseValide) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const token = jwt.sign(
      { type: 'responsable', responsableId: responsable.id, organisationId: responsable.organisation_id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      responsable: {
        id: responsable.id,
        nom: responsable.nom,
        email: responsable.email,
        organisationId: responsable.organisation_id,
        organisationNom: responsable.organisation_nom,
        organisationType: responsable.organisation_type,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur lors de la connexion' });
  }
});

module.exports = router;