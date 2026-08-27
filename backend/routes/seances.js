const express = require('express');
const pool = require('../db');
const verifierToken = require('../middleware/auth');
const { verifierAdminOuResponsable, verifierOrganisationAutorisee } = require('../middleware/authAdminOuResponsable');
const crypto = require('crypto');

const router = express.Router();

async function verifierOrganisation(organisationId, adminId) {
  const resultat = await pool.query(
    'SELECT * FROM organisations WHERE id = $1 AND admin_id = $2',
    [organisationId, adminId]
  );
  return resultat.rows[0];
}
 
router.post('/', verifierToken, async (req, res) => {
  const { organisationId, titre, dateSeance, margeRetardMinutes, classes, heureFin } = req.body;

  if (!organisationId || !titre || !dateSeance) {
    return res.status(400).json({ message: 'organisationId, titre et dateSeance sont obligatoires' });
  }

  try {
    const organisation = await verifierOrganisation(organisationId, req.adminId);
    if (!organisation) {
      return res.status(404).json({ message: 'Organisation introuvable' });
    }

    const qrValeur = crypto.randomUUID();
    const classesFinales = Array.isArray(classes) ? classes : [];

    const resultat = await pool.query(
      `INSERT INTO seances (organisation_id, titre, date_seance, marge_retard_minutes, qr_valeur, classes, heure_fin)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [organisationId, titre, dateSeance, margeRetardMinutes || 10, qrValeur, classesFinales, heureFin || null]
    );

    res.status(201).json(resultat.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur lors de la création de la séance' });
  }
});
router.get('/', verifierAdminOuResponsable, async (req, res) => {
  const { organisationId, dateDebut, dateFin } = req.query;

  if (!organisationId) {
    return res.status(400).json({ message: 'organisationId est obligatoire' });
  }

  try {
    const autorise = await verifierOrganisationAutorisee(organisationId, req);
    if (!autorise) {
      return res.status(403).json({ message: 'Accès non autorisé à cette organisation' });
    }

    let requete = 'SELECT * FROM seances WHERE organisation_id = $1';
    const params = [organisationId];

    if (dateDebut) {
      params.push(dateDebut);
      requete += ` AND date_seance >= $${params.length}`;
    }

    if (dateFin) {
      params.push(dateFin);
      requete += ` AND date_seance <= $${params.length}`;
    }

    requete += ' ORDER BY date_seance DESC';

    const resultat = await pool.query(requete, params);
    res.json(resultat.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des séances' });
  }
});

router.get('/:id', verifierAdminOuResponsable, async (req, res) => {
  try {
    const seance = await pool.query('SELECT * FROM seances WHERE id = $1', [req.params.id]);

    if (seance.rows.length === 0) {
      return res.status(404).json({ message: 'Séance introuvable' });
    }

    const autorise = await verifierOrganisationAutorisee(seance.rows[0].organisation_id, req);
    if (!autorise) {
      return res.status(403).json({ message: 'Accès non autorisé à cette séance' });
    }

    res.json(seance.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.get('/:id/resume', verifierToken, async (req, res) => {
  try {
    const seance = await pool.query(
      `SELECT s.* FROM seances s
       JOIN organisations o ON o.id = s.organisation_id
       WHERE s.id = $1 AND o.admin_id = $2`,
      [req.params.id, req.adminId]
    );

    if (seance.rows.length === 0) {
      return res.status(404).json({ message: 'Séance introuvable' });
    }

    const resultat = await pool.query(
      `SELECT statut, COUNT(*) FROM presences WHERE seance_id = $1 GROUP BY statut`,
      [req.params.id]
    );

    const compteurs = { present: 0, retard: 0, absent: 0, permissionnaire: 0 };
    resultat.rows.forEach((ligne) => {
      compteurs[ligne.statut] = Number(ligne.count);
    });

    res.json({ seance: seance.rows[0], compteurs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.get('/:id/historique', verifierToken, async (req, res) => {
  try {
    const membre = await pool.query(
      `SELECT m.* FROM membres m
       JOIN organisations o ON o.id = m.organisation_id
       WHERE m.id = $1 AND o.admin_id = $2`,
      [req.params.id, req.adminId]
    );

    if (membre.rows.length === 0) {
      return res.status(404).json({ message: 'Membre introuvable' });
    }

    const resultat = await pool.query(
      `SELECT s.id AS seance_id, s.titre, s.date_seance, p.statut, p.heure_pointage
       FROM presences p
       JOIN seances s ON s.id = p.seance_id
       WHERE p.membre_id = $1
       ORDER BY s.date_seance DESC`,
      [req.params.id]
    );

    res.json({ membre: membre.rows[0], historique: resultat.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.post('/:id/cloturer', verifierAdminOuResponsable, async (req, res) => {
  try {
    const seance = await pool.query('SELECT * FROM seances WHERE id = $1', [req.params.id]);

    if (seance.rows.length === 0) {
      return res.status(404).json({ message: 'Séance introuvable' });
    }

    const donneesSeance = seance.rows[0];

    const autorise = await verifierOrganisationAutorisee(donneesSeance.organisation_id, req);
    if (!autorise) {
      return res.status(403).json({ message: 'Accès non autorisé à cette séance' });
    }

    let requeteMembres = `SELECT id FROM membres WHERE organisation_id = $1 AND statut = 'actif'`;
    const paramsMembres = [donneesSeance.organisation_id];

    if (donneesSeance.classes && donneesSeance.classes.length > 0) {
      requeteMembres += ' AND role = ANY($2)';
      paramsMembres.push(donneesSeance.classes);
    }

    const membres = await pool.query(requeteMembres, paramsMembres);

    for (const membre of membres.rows) {
      await pool.query(
        `INSERT INTO presences (seance_id, membre_id, statut, heure_pointage)
         VALUES ($1, $2, 'absent', NULL)
         ON CONFLICT (seance_id, membre_id) DO NOTHING`,
        [req.params.id, membre.id]
      );
    }

    const resultat = await pool.query(
      'UPDATE seances SET cloturee = true WHERE id = $1 RETURNING *',
      [req.params.id]
    );

    res.json(resultat.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur lors de la clôture' });
  }
});

module.exports = router;