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

router.patch('/mot-de-passe', verifierToken, async (req, res) => {
  const { ancienMotDePasse, nouveauMotDePasse } = req.body;

  if (!ancienMotDePasse || !nouveauMotDePasse) {
    return res.status(400).json({ message: 'Ancien et nouveau mot de passe sont obligatoires' });
  }

  if (nouveauMotDePasse.length < 6) {
    return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 6 caractères' });
  }

  try {
    const admin = await pool.query('SELECT * FROM admins WHERE id = $1', [req.adminId]);
    if (admin.rows.length === 0) {
      return res.status(404).json({ message: 'Compte introuvable' });
    }

    const motDePasseValide = await bcrypt.compare(ancienMotDePasse, admin.rows[0].mot_de_passe);
    if (!motDePasseValide) {
      return res.status(401).json({ message: 'Ancien mot de passe incorrect' });
    }

    const nouveauMotDePasseHache = await bcrypt.hash(nouveauMotDePasse, 10);
    await pool.query('UPDATE admins SET mot_de_passe = $1 WHERE id = $2', [nouveauMotDePasseHache, req.adminId]);

    res.json({ message: 'Mot de passe mis à jour' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur lors du changement de mot de passe' });
  }
});

router.patch('/profil', verifierToken, async (req, res) => {
  const { nom } = req.body;

  if (!nom || nom.trim().length === 0) {
    return res.status(400).json({ message: 'Le nom est obligatoire' });
  }

  try {
    const resultat = await pool.query(
      'UPDATE admins SET nom = $1 WHERE id = $2 RETURNING id, nom, email',
      [nom.trim(), req.adminId]
    );

    res.json(resultat.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour du profil' });
  }
});
module.exports = router;