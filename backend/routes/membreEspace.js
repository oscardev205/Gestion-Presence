const express = require('express');
const pool = require('../db');
const verifierTokenMembre = require('../middleware/authMembre');

const router = express.Router();

router.get('/mon-profil', verifierTokenMembre, async (req, res) => {
  try {
    const membre = await pool.query(
      `SELECT m.id, m.nom, m.identifiant, m.role, o.nom AS organisation_nom, o.id AS organisation_id
       FROM membres m JOIN organisations o ON o.id = m.organisation_id
       WHERE m.id = $1`,
      [req.membreId]
    );

    if (membre.rows.length === 0) {
      return res.status(404).json({ message: 'Membre introuvable' });
    }

    const nombreSeances = await pool.query(
      'SELECT COUNT(*) FROM seances WHERE organisation_id = $1',
      [membre.rows[0].organisation_id]
    );

    const historique = await pool.query(
      `SELECT s.titre, s.date_seance, p.statut
       FROM presences p JOIN seances s ON s.id = p.seance_id
       WHERE p.membre_id = $1
       ORDER BY s.date_seance DESC`,
      [req.membreId]
    );

    const recap = { present: 0, retard: 0, absent: 0, permissionnaire: 0 };
    historique.rows.forEach((h) => { recap[h.statut] += 1; });

    const total = Number(nombreSeances.rows[0].count);
    const tauxPresence = total > 0 ? Math.round(((recap.present + recap.retard) / total) * 100) : 0;

    res.json({
      membre: membre.rows[0],
      nombreSeances: total,
      historique: historique.rows,
      recap,
      tauxPresence,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;