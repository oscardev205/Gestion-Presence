const express = require('express');
const pool = require('../db');
const verifierToken = require('../middleware/auth');

const router = express.Router();

router.post('/', verifierToken, async (req, res) => {
  const { nom, type, sigle } = req.body;

  if (!nom || !type || !sigle) {
    return res.status(400).json({ message: 'Nom, type et sigle sont obligatoires' });
  }

  if (type !== 'ecole' && type !== 'association') {
    return res.status(400).json({ message: 'Le type doit être ecole ou association' });
  }

  try {
    const resultat = await pool.query(
      'INSERT INTO organisations (admin_id, nom, type, sigle) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.adminId, nom, type, sigle.toUpperCase()]
    );

    res.status(201).json(resultat.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur lors de la création de l\'organisation' });
  }
});

router.get('/', verifierToken, async (req, res) => {
  try {
    const resultat = await pool.query(
      'SELECT * FROM organisations WHERE admin_id = $1 ORDER BY cree_le DESC',
      [req.adminId]
    );

    res.json(resultat.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des organisations' });
  }
});

router.patch('/:id/roles-hierarchie', verifierToken, async (req, res) => {
  const { rolesHierarchie } = req.body;

  if (!Array.isArray(rolesHierarchie)) {
    return res.status(400).json({ message: 'rolesHierarchie doit être une liste' });
  }

  try {
    const organisation = await pool.query(
      'SELECT * FROM organisations WHERE id = $1 AND admin_id = $2',
      [req.params.id, req.adminId]
    );

    if (organisation.rows.length === 0) {
      return res.status(404).json({ message: 'Organisation introuvable' });
    }

    const resultat = await pool.query(
      'UPDATE organisations SET roles_hierarchie = $1 WHERE id = $2 RETURNING *',
      [rolesHierarchie, req.params.id]
    );

    res.json(resultat.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour de la hiérarchie' });
  }
});

module.exports = router;