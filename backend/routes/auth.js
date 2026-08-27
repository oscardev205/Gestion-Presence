const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

router.post('/inscription', async (req, res) => {
  const { nom, email, motDePasse } = req.body;

  if (!nom || !email || !motDePasse) {
    return res.status(400).json({ message: 'Nom, email et mot de passe sont obligatoires' });
  }

  try {
    const dejaExistant = await pool.query('SELECT id FROM admins WHERE email = $1', [email]);
    if (dejaExistant.rows.length > 0) {
      return res.status(409).json({ message: 'Cet email est déjà utilisé' });
    }

    const motDePasseHache = await bcrypt.hash(motDePasse, 10);

    const resultat = await pool.query(
      'INSERT INTO admins (nom, email, mot_de_passe) VALUES ($1, $2, $3) RETURNING id, nom, email',
      [nom, email, motDePasseHache]
    );

    const admin = resultat.rows[0];

    const token = jwt.sign({ adminId: admin.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ admin, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur lors de l\'inscription' });
  }
});

router.post('/connexion', async (req, res) => {
  const { email, motDePasse } = req.body;

  if (!email || !motDePasse) {
    return res.status(400).json({ message: 'Email et mot de passe sont obligatoires' });
  }

  try {
    const resultat = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);
    const admin = resultat.rows[0];

    if (!admin) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const motDePasseValide = await bcrypt.compare(motDePasse, admin.mot_de_passe);
    if (!motDePasseValide) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const token = jwt.sign({ adminId: admin.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ admin: { id: admin.id, nom: admin.nom, email: admin.email }, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur lors de la connexion' });
  }
});

module.exports = router;