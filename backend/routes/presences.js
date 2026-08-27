const express = require('express');
const pool = require('../db');
const verifierToken = require('../middleware/auth');
const { verifierAdminOuResponsable, verifierOrganisationAutorisee } = require('../middleware/authAdminOuResponsable');
const trierMembres = require('../utils/trierMembres');
const verifierTokenMembre = require('../middleware/authMembre');

const router = express.Router();

async function recupererSeanceAutorisee(seanceId, req) {
  const resultat = await pool.query('SELECT * FROM seances WHERE id = $1', [seanceId]);
  if (resultat.rows.length === 0) return null;

  const seance = resultat.rows[0];
  const autorise = await verifierOrganisationAutorisee(seance.organisation_id, req);
  if (!autorise) return null;

  return seance;
}

function calculerStatut(seance) {
  const maintenant = new Date();
  const heureSeance = new Date(seance.date_seance);
  const limiteRetard = new Date(heureSeance.getTime() + seance.marge_retard_minutes * 60000);

  if (maintenant <= limiteRetard) {
    return 'present';
  }
  return 'retard';
}

router.post('/scan', verifierAdminOuResponsable, async (req, res) => {
  const { seanceId, qrCodeValeur } = req.body;

  if (!seanceId || !qrCodeValeur) {
    return res.status(400).json({ message: 'seanceId et qrCodeValeur sont obligatoires' });
  }

  try {
    const seance = await recupererSeanceAutorisee(seanceId, req);
    if (!seance) {
      return res.status(404).json({ message: 'Séance introuvable' });
    }

    if (seance.cloturee) {
      return res.status(403).json({ message: 'Cette séance est clôturée, le pointage n\'est plus possible' });
    }

    const membreResultat = await pool.query(
      'SELECT * FROM membres WHERE qr_code_valeur = $1 AND organisation_id = $2',
      [qrCodeValeur, seance.organisation_id]
    );
    const membre = membreResultat.rows[0];

    if (!membre) {
      return res.status(404).json({ message: 'Code QR non reconnu pour cette organisation' });
    }

    if (membre.statut === 'suspendu') {
      return res.status(403).json({ message: 'Ce membre est suspendu' });
    }

    const dejaPointe = await pool.query(
      'SELECT * FROM presences WHERE seance_id = $1 AND membre_id = $2',
      [seanceId, membre.id]
    );

    if (dejaPointe.rows.length > 0) {
      return res.status(409).json({ message: `${membre.nom} est déjà pointé pour cette séance`, membre });
    }

    const statut = calculerStatut(seance);

    const resultat = await pool.query(
      `INSERT INTO presences (seance_id, membre_id, statut, heure_pointage)
       VALUES ($1, $2, $3, NOW()) RETURNING *`,
      [seanceId, membre.id, statut]
    );

    const io = req.app.get('io');
    io.to(`seance-${seanceId}`).emit('pointage-effectue', { membreId: membre.id, membreNom: membre.nom, statut });

    res.status(201).json({ presence: resultat.rows[0], membre });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur lors du pointage' });
  }
});

router.post('/manuel', verifierAdminOuResponsable, async (req, res) => {
  const { seanceId, membreId, statut } = req.body;
  const statutsValides = ['present', 'absent', 'retard', 'permissionnaire'];

  if (!seanceId || !membreId || !statutsValides.includes(statut)) {
    return res.status(400).json({ message: 'seanceId, membreId et un statut valide sont obligatoires' });
  }

  try {
    const seance = await recupererSeanceAutorisee(seanceId, req);
    if (!seance) {
      return res.status(404).json({ message: 'Séance introuvable' });
    }

    let statutFinal = statut;
    if (statut === 'present') {
      statutFinal = calculerStatut(seance);
    }

    const resultat = await pool.query(
      `INSERT INTO presences (seance_id, membre_id, statut, heure_pointage)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (seance_id, membre_id)
       DO UPDATE SET statut = $3, heure_pointage = NOW()
       RETURNING *`,
      [seanceId, membreId, statutFinal]
    );

    const io = req.app.get('io');
    io.to(`seance-${seanceId}`).emit('pointage-effectue', { membreId, statut: statutFinal });

    res.status(201).json(resultat.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur lors du pointage manuel' });
  }
});

router.get('/seance/:seanceId', verifierAdminOuResponsable, async (req, res) => {
  try {
    const seance = await recupererSeanceAutorisee(req.params.seanceId, req);
    if (!seance) {
      return res.status(404).json({ message: 'Séance introuvable' });
    }

    const organisation = await pool.query('SELECT * FROM organisations WHERE id = $1', [seance.organisation_id]);

    let requete = `SELECT m.id AS membre_id, m.nom, m.identifiant, m.role, p.statut, p.heure_pointage
       FROM membres m
       LEFT JOIN presences p ON p.membre_id = m.id AND p.seance_id = $1
       WHERE m.organisation_id = $2`;
    const params = [req.params.seanceId, seance.organisation_id];

    if (seance.classes && seance.classes.length > 0) {
      requete += ' AND m.role = ANY($3)';
      params.push(seance.classes);
    }

    const resultat = await pool.query(requete, params);

    const lignesTriees = trierMembres(resultat.rows, organisation.rows[0]);

    res.json(lignesTriees);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.post('/auto-scan', verifierTokenMembre, async (req, res) => {
  const { qrSeanceValeur } = req.body;

  if (!qrSeanceValeur) {
    return res.status(400).json({ message: 'qrSeanceValeur est obligatoire' });
  }

  try {
    const seanceResultat = await pool.query('SELECT * FROM seances WHERE qr_valeur = $1', [qrSeanceValeur]);
    const seance = seanceResultat.rows[0];

    if (!seance) {
      return res.status(404).json({ message: 'Séance introuvable pour ce QR' });
    }

    if (seance.cloturee) {
      return res.status(403).json({ message: 'Cette séance est clôturée, le pointage n\'est plus possible' });
    }

    const membreResultat = await pool.query('SELECT * FROM membres WHERE id = $1', [req.membreId]);
    const membre = membreResultat.rows[0];

    if (membre.organisation_id !== seance.organisation_id) {
      return res.status(403).json({ message: 'Cette séance n\'appartient pas à ton organisation' });
    }

    if (membre.statut === 'suspendu') {
      return res.status(403).json({ message: 'Ton compte est suspendu' });
    }

    const dejaPointe = await pool.query(
      'SELECT * FROM presences WHERE seance_id = $1 AND membre_id = $2',
      [seance.id, membre.id]
    );

    if (dejaPointe.rows.length > 0) {
      return res.status(409).json({ message: 'Tu es déjà pointé pour cette séance' });
    }

    const statut = calculerStatut(seance);

    const resultat = await pool.query(
      `INSERT INTO presences (seance_id, membre_id, statut, heure_pointage)
       VALUES ($1, $2, $3, NOW()) RETURNING *`,
      [seance.id, membre.id, statut]
    );

    const io = req.app.get('io');
    io.to(`seance-${seance.id}`).emit('pointage-effectue', { membreId: membre.id, membreNom: membre.nom, statut });

    res.status(201).json({ presence: resultat.rows[0], seanceTitre: seance.titre });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur lors du pointage' });
  }
});

module.exports = router;