const express = require('express');
const crypto = require('crypto');
const pool = require('../db');
const verifierToken = require('../middleware/auth');
const trierMembres = require('../utils/trierMembres');
const { verifierAdminOuResponsable, verifierOrganisationAutorisee } = require('../middleware/authAdminOuResponsable');

const router = express.Router();

async function verifierOrganisation(organisationId, adminId) {
  const resultat = await pool.query(
    'SELECT * FROM organisations WHERE id = $1 AND admin_id = $2',
    [organisationId, adminId]
  );
  return resultat.rows[0];
}

router.post('/', verifierToken, async (req, res) => {
  const { organisationId, nom, role } = req.body;

  if (!organisationId || !nom) {
    return res.status(400).json({ message: 'organisationId et nom sont obligatoires' });
  }

  try {
    const organisation = await verifierOrganisation(organisationId, req.adminId);
    if (!organisation) {
      return res.status(404).json({ message: 'Organisation introuvable' });
    }

    const compte = await pool.query(
      'SELECT COUNT(*) FROM membres WHERE organisation_id = $1',
      [organisationId]
    );
    const prochainNumero = Number(compte.rows[0].count) + 1;
    const identifiant = `${organisation.sigle}-${prochainNumero}`;
    const qrCodeValeur = crypto.randomUUID();
        const codePin = String(Math.floor(1000 + Math.random() * 9000));

    const resultat = await pool.query(
      `INSERT INTO membres (organisation_id, nom, role, identifiant, qr_code_valeur, code_pin)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [organisationId, nom, role || null, identifiant, qrCodeValeur, codePin]
    );

    res.status(201).json(resultat.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur lors de l\'ajout du membre' });
  }
});

router.get('/', verifierAdminOuResponsable, async (req, res) => {
  const { organisationId, recherche } = req.query;

  if (!organisationId) {
    return res.status(400).json({ message: 'organisationId est obligatoire' });
  }

  try {
    const autorise = await verifierOrganisationAutorisee(organisationId, req);
    if (!autorise) {
      return res.status(403).json({ message: 'Accès non autorisé à cette organisation' });
    }

    const organisation = await pool.query('SELECT * FROM organisations WHERE id = $1', [organisationId]);

    let requete = 'SELECT * FROM membres WHERE organisation_id = $1';
    const params = [organisationId];

    if (recherche) {
      requete += ' AND (nom ILIKE $2 OR identifiant ILIKE $2)';
      params.push(`%${recherche}%`);
    }

    const resultat = await pool.query(requete, params);
    const membresTries = trierMembres(resultat.rows, organisation.rows[0]);

    res.json(membresTries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des membres' });
  }
});
router.patch('/:id/statut', verifierToken, async (req, res) => {
  const { statut } = req.body;

  if (!['actif', 'suspendu'].includes(statut)) {
    return res.status(400).json({ message: 'Le statut doit être actif ou suspendu' });
  }

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
      'UPDATE membres SET statut = $1 WHERE id = $2 RETURNING *',
      [statut, req.params.id]
    );

    res.json(resultat.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur lors du changement de statut' });
  }
});

router.post('/:id/regenerer-qr', verifierToken, async (req, res) => {
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

    const nouveauQr = crypto.randomUUID();
    const nouveauPin = String(Math.floor(1000 + Math.random() * 9000));

    const resultat = await pool.query(
      'UPDATE membres SET qr_code_valeur = $1, code_pin = $2 WHERE id = $3 RETURNING *',
      [nouveauQr, nouveauPin, req.params.id]
    );

    res.json(resultat.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur lors de la régénération du QR' });
  }
});

router.get('/:id/statistiques', verifierToken, async (req, res) => {
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

    const totalSeances = await pool.query(
      'SELECT COUNT(*) FROM seances WHERE organisation_id = $1',
      [membre.rows[0].organisation_id]
    );

    const parStatut = await pool.query(
      'SELECT statut, COUNT(*) FROM presences WHERE membre_id = $1 GROUP BY statut',
      [req.params.id]
    );

    const compteurs = { present: 0, retard: 0, absent: 0, permissionnaire: 0 };
    parStatut.rows.forEach((ligne) => {
      compteurs[ligne.statut] = Number(ligne.count);
    });

    const nombreSeances = Number(totalSeances.rows[0].count);
    const presencesEffectives = compteurs.present + compteurs.retard;
    const tauxPresence = nombreSeances > 0 ? Math.round((presencesEffectives / nombreSeances) * 100) : 0;

    res.json({
      membre: membre.rows[0],
      nombreSeances,
      compteurs,
      tauxPresence,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.get('/organisation/:organisationId/vue-ensemble', verifierToken, async (req, res) => {
  const { classe } = req.query;

  try {
    const organisation = await verifierOrganisation(req.params.organisationId, req.adminId);
    if (!organisation) {
      return res.status(404).json({ message: 'Organisation introuvable' });
    }

    const nombreSeances = await pool.query(
      'SELECT COUNT(*) FROM seances WHERE organisation_id = $1',
      [req.params.organisationId]
    );
    const total = Number(nombreSeances.rows[0].count);

    let requete = `SELECT m.id, m.nom, m.identifiant, m.role,
        COUNT(*) FILTER (WHERE p.statut = 'present') AS present,
        COUNT(*) FILTER (WHERE p.statut = 'retard') AS retard,
        COUNT(*) FILTER (WHERE p.statut = 'absent') AS absent,
        COUNT(*) FILTER (WHERE p.statut = 'permissionnaire') AS permissionnaire
       FROM membres m
       LEFT JOIN presences p ON p.membre_id = m.id
       WHERE m.organisation_id = $1 AND m.statut = 'actif'`;
    const params = [req.params.organisationId];

    if (classe) {
      requete += ' AND m.role = $2';
      params.push(classe);
    }

    requete += ' GROUP BY m.id, m.nom, m.identifiant, m.role';

    const resultat = await pool.query(requete, params);

    const membres = resultat.rows.map((m) => {
      const presencesEffectives = Number(m.present) + Number(m.retard);
      const tauxPresence = total > 0 ? Math.round((presencesEffectives / total) * 100) : 0;
      return { ...m, tauxPresence };
    });

    res.json({ nombreSeances: total, membres });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.get('/:id/detail', verifierToken, async (req, res) => {
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

    const toutesSeances = await pool.query(
      `SELECT s.id, s.titre, s.date_seance, p.statut, p.heure_pointage
       FROM seances s
       LEFT JOIN presences p ON p.seance_id = s.id AND p.membre_id = $1
       WHERE s.organisation_id = $2
       ORDER BY s.date_seance DESC`,
      [req.params.id, membre.rows[0].organisation_id]
    );

    const seances = toutesSeances.rows.map((s) => ({ ...s, statut: s.statut || 'absent' }));

    const recap = { present: 0, retard: 0, absent: 0, permissionnaire: 0 };
    seances.forEach((s) => { recap[s.statut] += 1; });

    const tauxPresence = seances.length > 0
      ? Math.round(((recap.present + recap.retard) / seances.length) * 100)
      : 0;

    res.json({ membre: membre.rows[0], seances, recap, tauxPresence });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;