const express = require('express');
const ExcelJS = require('exceljs');
const chromiumModule = require('@sparticuz/chromium');
const chromium = chromiumModule.default || chromiumModule;
const puppeteer = require('puppeteer-core');
const QRCode = require('qrcode');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, WidthType, AlignmentType } = require('docx');
const pool = require('../db');
const verifierToken = require('../middleware/auth');
const verifierTokenMembre = require('../middleware/authMembre');
const trierMembres = require('../utils/trierMembres');

const router = express.Router();

const LABELS = { present: 'Présent', retard: 'En retard', absent: 'Absent', permissionnaire: 'Permissionnaire' };
const MOT_DE_PASSE_PROTECTION = 'gestion-presence-verrouille';

function echapperHtml(texte) {
  if (texte === null || texte === undefined) return '';
  return String(texte)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function lancerNavigateur() {
  if (process.env.CHROME_PATH) {
    return puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: process.env.CHROME_PATH,
    });
  }

  return puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });
}

async function recupererDonneesSeance(seanceId, adminId) {
  const seanceResultat = await pool.query(
    `SELECT s.*, o.nom AS organisation_nom, o.type AS organisation_type, o.roles_hierarchie
     FROM seances s
     JOIN organisations o ON o.id = s.organisation_id
     WHERE s.id = $1 AND o.admin_id = $2`,
    [seanceId, adminId]
  );

  if (seanceResultat.rows.length === 0) return null;
  const seance = seanceResultat.rows[0];
  const organisation = { type: seance.organisation_type, roles_hierarchie: seance.roles_hierarchie };

  let requeteMembres = `SELECT m.nom, m.identifiant, m.role, p.statut, p.heure_pointage
     FROM membres m
     LEFT JOIN presences p ON p.membre_id = m.id AND p.seance_id = $1
     WHERE m.organisation_id = $2`;
  const paramsMembres = [seanceId, seance.organisation_id];

  if (seance.classes && seance.classes.length > 0) {
    requeteMembres += ' AND m.role = ANY($3)';
    paramsMembres.push(seance.classes);
  }

  const membresResultat = await pool.query(requeteMembres, paramsMembres);

  const membresBruts = membresResultat.rows.map((m) => ({ ...m, statut: m.statut || 'absent' }));
  const membres = trierMembres(membresBruts, organisation);

  const recap = { present: 0, retard: 0, absent: 0, permissionnaire: 0 };
  membres.forEach((m) => { recap[m.statut] += 1; });

  const libelleRole = seance.organisation_type === 'ecole' ? 'Classe' : 'Rôle';

  return { seance, membres, recap, libelleRole };
}

async function recupererDonneesOrganisation(organisationId, adminId, classe) {
  const orgResultat = await pool.query(
    'SELECT * FROM organisations WHERE id = $1 AND admin_id = $2',
    [organisationId, adminId]
  );
  if (orgResultat.rows.length === 0) return null;
  const organisation = orgResultat.rows[0];

  const nombreSeancesResultat = await pool.query(
    'SELECT COUNT(*) FROM seances WHERE organisation_id = $1',
    [organisationId]
  );
  const nombreSeances = Number(nombreSeancesResultat.rows[0].count);

  let requeteMembres = `SELECT m.nom, m.identifiant, m.role,
      COUNT(*) FILTER (WHERE p.statut = 'present') AS present,
      COUNT(*) FILTER (WHERE p.statut = 'retard') AS retard,
      COUNT(*) FILTER (WHERE p.statut = 'absent') AS absent,
      COUNT(*) FILTER (WHERE p.statut = 'permissionnaire') AS permissionnaire
     FROM membres m
     LEFT JOIN presences p ON p.membre_id = m.id
     WHERE m.organisation_id = $1 AND m.statut = 'actif'`;
  const paramsMembres = [organisationId];

  if (classe) {
    requeteMembres += ' AND m.role = $2';
    paramsMembres.push(classe);
  }

  requeteMembres += ' GROUP BY m.id, m.nom, m.identifiant, m.role';

  const membresResultat = await pool.query(requeteMembres, paramsMembres);

  const membresBruts = membresResultat.rows.map((m) => {
    const present = Number(m.present);
    const retard = Number(m.retard);
    const tauxPresence = nombreSeances > 0 ? Math.round(((present + retard) / nombreSeances) * 100) : 0;
    return { ...m, present, retard, absent: Number(m.absent), permissionnaire: Number(m.permissionnaire), tauxPresence };
  });

  const membres = trierMembres(membresBruts, organisation);

  const libelleRole = organisation.type === 'ecole' ? 'Classe' : 'Rôle';

  return { organisation, nombreSeances, membres, classe: classe || null, libelleRole };
}

async function recupererDonneesMembre(membreId, adminId) {
  const membreResultat = await pool.query(
    `SELECT m.*, o.nom AS organisation_nom FROM membres m
     JOIN organisations o ON o.id = m.organisation_id
     WHERE m.id = $1 AND o.admin_id = $2`,
    [membreId, adminId]
  );
  if (membreResultat.rows.length === 0) return null;
  const membre = membreResultat.rows[0];

  const nombreSeancesResultat = await pool.query(
    'SELECT COUNT(*) FROM seances WHERE organisation_id = $1',
    [membre.organisation_id]
  );
  const nombreSeances = Number(nombreSeancesResultat.rows[0].count);

  const historiqueResultat = await pool.query(
    `SELECT s.titre, s.date_seance, p.statut, p.heure_pointage
     FROM presences p
     JOIN seances s ON s.id = p.seance_id
     WHERE p.membre_id = $1
     ORDER BY s.date_seance DESC`,
    [membreId]
  );

  const recap = { present: 0, retard: 0, absent: 0, permissionnaire: 0 };
  historiqueResultat.rows.forEach((h) => { recap[h.statut] += 1; });

  const tauxPresence = nombreSeances > 0 ? Math.round(((recap.present + recap.retard) / nombreSeances) * 100) : 0;

  return { membre, nombreSeances, historique: historiqueResultat.rows, recap, tauxPresence };
}

async function recupererDonneesMembrePourLuiMeme(membreId) {
  const membreResultat = await pool.query(
    `SELECT m.*, o.nom AS organisation_nom FROM membres m
     JOIN organisations o ON o.id = m.organisation_id
     WHERE m.id = $1`,
    [membreId]
  );
  if (membreResultat.rows.length === 0) return null;
  const membre = membreResultat.rows[0];

  const nombreSeancesResultat = await pool.query(
    'SELECT COUNT(*) FROM seances WHERE organisation_id = $1',
    [membre.organisation_id]
  );
  const nombreSeances = Number(nombreSeancesResultat.rows[0].count);

  const historiqueResultat = await pool.query(
    `SELECT s.titre, s.date_seance, p.statut, p.heure_pointage
     FROM presences p
     JOIN seances s ON s.id = p.seance_id
     WHERE p.membre_id = $1
     ORDER BY s.date_seance DESC`,
    [membreId]
  );

  const recap = { present: 0, retard: 0, absent: 0, permissionnaire: 0 };
  historiqueResultat.rows.forEach((h) => { recap[h.statut] += 1; });

  const tauxPresence = nombreSeances > 0 ? Math.round(((recap.present + recap.retard) / nombreSeances) * 100) : 0;

  return { membre, nombreSeances, historique: historiqueResultat.rows, recap, tauxPresence };
}

async function recupererMembresPourFichesQr(organisationId, adminId, classe) {
  const orgResultat = await pool.query(
    'SELECT * FROM organisations WHERE id = $1 AND admin_id = $2',
    [organisationId, adminId]
  );
  if (orgResultat.rows.length === 0) return null;
  const organisation = orgResultat.rows[0];

  let requete = `SELECT id, nom, identifiant, role, qr_code_valeur FROM membres WHERE organisation_id = $1 AND statut = 'actif'`;
  const params = [organisationId];

  if (classe) {
    requete += ' AND role = $2';
    params.push(classe);
  }

  requete += ' ORDER BY nom';

  const membresResultat = await pool.query(requete, params);
  const membres = trierMembres(membresResultat.rows, organisation);

  return { organisation, membres, classe: classe || null };
}

const FONDS_PRESETS = {
  classique: 'linear-gradient(135deg, #085041, #0F6E56)',
  fonce: 'linear-gradient(135deg, #04342C, #085041)',
  clair: 'linear-gradient(135deg, #E1F5EE, #9FE1CB)',
  contraste: 'linear-gradient(135deg, #0F6E56, #5DCAA5)',
};

function resoudreFondCarte(fondCarteUrl) {
  if (!fondCarteUrl) return { type: 'gradient', valeur: FONDS_PRESETS.classique };
  if (fondCarteUrl.startsWith('preset:')) {
    const id = fondCarteUrl.replace('preset:', '');
    return { type: 'gradient', valeur: FONDS_PRESETS[id] || FONDS_PRESETS.classique };
  }
  return { type: 'image', valeur: fondCarteUrl };
}

function initialesDeNom(nom) {
  if (!nom) return '?';
  return nom.split(' ').map((mot) => mot[0]).slice(0, 2).join('').toUpperCase();
}

async function recupererDonneesMembrePourCarte(membreId, adminId) {
  const resultat = await pool.query(
    `SELECT m.*, o.nom AS organisation_nom, o.type AS organisation_type, o.fond_carte_url
     FROM membres m
     JOIN organisations o ON o.id = m.organisation_id
     WHERE m.id = $1 AND o.admin_id = $2`,
    [membreId, adminId]
  );
  if (resultat.rows.length === 0) return null;
  return resultat.rows[0];
}

function genererHtmlCarte(membre, qrDataUrl, format) {
  const fond = resoudreFondCarte(membre.fond_carte_url);
  const fondCss = fond.type === 'image' ? `url('${fond.valeur}') center/cover no-repeat` : fond.valeur;
  const estVertical = format !== 'horizontal';
  const largeur = estVertical ? '54mm' : '86mm';
  const hauteur = estVertical ? '86mm' : '54mm';

  const photoHtml = membre.photo_url
    ? `<img src="${membre.photo_url}" class="photo" />`
    : `<div class="photo photo-defaut">${echapperHtml(initialesDeNom(membre.nom))}</div>`;

  const societeHtml = membre.organisation_type === 'association' && membre.societe
    ? `<p class="societe">${echapperHtml(membre.societe)}</p>`
    : '';

  return `
    <html>
    <head><style>
      @page { size: ${largeur} ${hauteur}; margin: 0; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; }
      .carte {
        width: ${largeur}; height: ${hauteur};
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        background: ${fondCss}; color: #ffffff; position: relative; overflow: hidden;
        page-break-after: always;
      }
      .org-nom {
        position: absolute; top: 3mm; left: 0; right: 0; text-align: center;
        font-size: 7px; font-weight: bold; letter-spacing: 0.5px;
        text-shadow: 0 1px 2px rgba(0,0,0,0.35);
      }
      .photo {
        width: ${estVertical ? '18mm' : '15mm'}; height: ${estVertical ? '18mm' : '15mm'};
        border-radius: 50%; object-fit: cover; border: 1px solid #ffffff;
        background: #ffffff;
      }
      .photo-defaut {
        display: flex; align-items: center; justify-content: center;
        font-size: 14px; font-weight: bold; color: #085041;
      }
      .nom { font-size: 10px; font-weight: bold; margin-top: 2mm; text-align: center; padding: 0 3mm; text-shadow: 0 1px 2px rgba(0,0,0,0.35); }
      .role { font-size: 7px; margin-top: 0.5mm; opacity: 0.9; text-align: center; }
      .societe { font-size: 6.5px; margin-top: 0.5mm; opacity: 0.85; text-align: center; }
      .pill {
        margin-top: 2mm; padding: 1mm 3mm; background: rgba(255,255,255,0.9); color: #085041;
        border-radius: 10mm; font-size: 7.5px; font-weight: bold;
      }
      .verso { justify-content: center; }
      .qr { width: ${estVertical ? '28mm' : '24mm'}; height: ${estVertical ? '28mm' : '24mm'}; background: #ffffff; padding: 2mm; border-radius: 2mm; }
      .verso-id { font-size: 7px; font-weight: bold; margin-top: 2mm; }
      .verso-footer { font-size: 5.5px; margin-top: 1mm; opacity: 0.85; text-align: center; padding: 0 3mm; }
    </style></head>
    <body>
      <div class="carte">
        <div class="org-nom">${echapperHtml(membre.organisation_nom)}</div>
        ${photoHtml}
        <p class="nom">${echapperHtml(membre.nom)}</p>
        ${membre.role ? `<p class="role">${echapperHtml(membre.role)}</p>` : ''}
        ${societeHtml}
        <div class="pill">${echapperHtml(membre.identifiant)}</div>
      </div>
      <div class="carte verso">
        <img src="${qrDataUrl}" class="qr" />
        <p class="verso-id">${echapperHtml(membre.identifiant)}</p>
        <p class="verso-footer">Scanner pour verifier ce badge</p>
      </div>
    </body>
    </html>
  `;
}

function genererHtmlCartesGroupees(membres, format) {
  return membres.map((m) => genererHtmlCarte(m, m.qrDataUrlCalcule, format)).join('');
}

function genererHtmlSeance(donnees) {
  const couleursFond = { present: '#e8f5e9', retard: '#fff3e0', absent: '#ffebee', permissionnaire: '#e3f2fd' };
  const couleursTexte = { present: '#2e7d32', retard: '#e65100', absent: '#c62828', permissionnaire: '#1565c0' };

  const ligneHtml = (m) => `
    <tr style="background:${couleursFond[m.statut]}">
      <td>${echapperHtml(m.identifiant)}</td>
      <td>${echapperHtml(m.nom)}</td>
      <td>${echapperHtml(m.role) || '-'}</td>
      <td style="color:${couleursTexte[m.statut]};font-weight:bold;text-align:center">${LABELS[m.statut]}</td>
      <td style="text-align:center">${m.heure_pointage ? new Date(m.heure_pointage).toLocaleTimeString('fr-FR') : '-'}</td>
    </tr>
  `;

  const estEcole = donnees.libelleRole === 'Classe';
  const plusieursGroupes = estEcole && new Set(donnees.membres.map((m) => m.role || 'Sans classe')).size > 1;

  let corpsTableau;
  if (plusieursGroupes) {
    const groupes = {};
    donnees.membres.forEach((m) => {
      const cle = m.role || 'Sans classe';
      if (!groupes[cle]) groupes[cle] = [];
      groupes[cle].push(m);
    });

    corpsTableau = Object.entries(groupes).map(([nomGroupe, membresGroupe]) => `
      <tr><td colspan="5" style="background:#0f6e56;color:#ffffff;font-weight:bold;padding:8px 10px">${echapperHtml(nomGroupe)}</td></tr>
      ${membresGroupe.map(ligneHtml).join('')}
    `).join('');
  } else {
    corpsTableau = donnees.membres.map(ligneHtml).join('');
  }

  return `
    <html>
    <head><style>
      body { font-family: Arial, sans-serif; padding: 0; margin: 0; color: #222; }
      .bandeau { background: #085041; color: #ffffff; padding: 24px 30px; text-align: center; }
      .bandeau h1 { margin: 0; font-size: 22px; }
      .bandeau p { margin: 6px 0 0 0; font-size: 13px; color: #d9efe7; }
      .contenu { padding: 24px 30px; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; font-size: 12px; }
      th { background: #0f6e56; color: #ffffff; text-align: center; }
      .recap { margin-top: 26px; }
      .recap h3 { text-align: center; font-size: 14px; margin-bottom: 10px; }
      .recap table { width: 60%; margin: 0 auto; }
      .recap td:last-child { text-align: center; font-weight: bold; }
    </style></head>
    <body>
      <div class="bandeau">
        <h1>${echapperHtml(donnees.seance.organisation_nom)}</h1>
        <p>${echapperHtml(donnees.seance.titre)} — ${new Date(donnees.seance.date_seance).toLocaleString('fr-FR')}</p>
      </div>
      <div class="contenu">
        <table>
          <thead><tr><th>Identifiant</th><th>Nom</th><th>${donnees.libelleRole}</th><th>Statut</th><th>Heure</th></tr></thead>
          <tbody>${corpsTableau}</tbody>
        </table>
        <div class="recap">
          <h3>Récapitulatif</h3>
          <table>
            <tr><td>Présents</td><td>${donnees.recap.present}</td></tr>
            <tr><td>Retards</td><td>${donnees.recap.retard}</td></tr>
            <tr><td>Absents</td><td>${donnees.recap.absent}</td></tr>
            <tr><td>Permissionnaires</td><td>${donnees.recap.permissionnaire}</td></tr>
          </table>
        </div>
      </div>
    </body>
    </html>
  `;
}

function genererHtmlOrganisation(donnees) {
  const ligneHtml = (m) => `
    <tr>
      <td>${echapperHtml(m.identifiant)}</td>
      <td>${echapperHtml(m.nom)}</td>
      <td>${echapperHtml(m.role) || '-'}</td>
      <td style="color:#2e7d32">${m.present}</td>
      <td style="color:#e65100">${m.retard}</td>
      <td style="color:#c62828">${m.absent}</td>
      <td style="color:#1565c0">${m.permissionnaire}</td>
      <td style="text-align:center;font-weight:bold">${m.tauxPresence}%</td>
    </tr>
  `;

  const estEcole = donnees.libelleRole === 'Classe';
  const plusieursGroupes = estEcole && !donnees.classe && new Set(donnees.membres.map((m) => m.role || 'Sans classe')).size > 1;

  let corpsTableau;
  if (plusieursGroupes) {
    const groupes = {};
    donnees.membres.forEach((m) => {
      const cle = m.role || 'Sans classe';
      if (!groupes[cle]) groupes[cle] = [];
      groupes[cle].push(m);
    });

    corpsTableau = Object.entries(groupes).map(([nomGroupe, membresGroupe]) => `
      <tr><td colspan="8" style="background:#0f6e56;color:#ffffff;font-weight:bold;padding:8px 10px">${echapperHtml(nomGroupe)}</td></tr>
      ${membresGroupe.map(ligneHtml).join('')}
    `).join('');
  } else {
    corpsTableau = donnees.membres.map(ligneHtml).join('');
  }

  return `
    <html>
    <head><style>
      body { font-family: Arial, sans-serif; padding: 0; margin: 0; color: #222; }
      .bandeau { background: #085041; color: #ffffff; padding: 24px 30px; text-align: center; }
      .bandeau h1 { margin: 0; font-size: 22px; }
      .bandeau p { margin: 6px 0 0 0; font-size: 13px; color: #d9efe7; }
      .contenu { padding: 24px 30px; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; font-size: 11px; }
      th { background: #0f6e56; color: #ffffff; text-align: center; }
    </style></head>
    <body>
      <div class="bandeau">
        <h1>${echapperHtml(donnees.organisation.nom)}</h1>
        <p>Vue d'ensemble${donnees.classe ? ` — Classe ${echapperHtml(donnees.classe)}` : ''} — ${donnees.nombreSeances} séance(s) enregistrée(s)</p>
      </div>
      <div class="contenu">
        <table>
          <thead><tr><th>Identifiant</th><th>Nom</th><th>${donnees.libelleRole}</th><th>Présents</th><th>Retards</th><th>Absents</th><th>Permission</th><th>Taux</th></tr></thead>
          <tbody>${corpsTableau}</tbody>
        </table>
      </div>
    </body>
    </html>
  `;
}

function genererHtmlMembre(donnees) {
  const lignes = donnees.historique.map((h) => `
    <tr>
      <td>${echapperHtml(h.titre)}</td>
      <td>${new Date(h.date_seance).toLocaleString('fr-FR')}</td>
      <td style="color:${{ present: '#2e7d32', retard: '#e65100', absent: '#c62828', permissionnaire: '#1565c0' }[h.statut]};font-weight:bold">${LABELS[h.statut]}</td>
      <td style="text-align:center">${h.heure_pointage ? new Date(h.heure_pointage).toLocaleTimeString('fr-FR') : '-'}</td>
    </tr>
  `).join('');

  return `
    <html>
    <head><style>
      body { font-family: Arial, sans-serif; padding: 0; margin: 0; color: #222; }
      .bandeau { background: #085041; color: #ffffff; padding: 24px 30px; text-align: center; }
      .bandeau h1 { margin: 0; font-size: 22px; }
      .bandeau p { margin: 6px 0 0 0; font-size: 13px; color: #d9efe7; }
      .contenu { padding: 24px 30px; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; font-size: 12px; }
      th { background: #0f6e56; color: #ffffff; text-align: center; }
      .recap { margin-top: 26px; text-align: center; }
      .recap h3 { font-size: 14px; }
      .taux { font-size: 28px; font-weight: bold; color: #085041; }
    </style></head>
    <body>
      <div class="bandeau">
        <h1>${echapperHtml(donnees.membre.nom)} (${echapperHtml(donnees.membre.identifiant)})</h1>
        <p>${echapperHtml(donnees.membre.organisation_nom)}${donnees.membre.role ? ' — ' + echapperHtml(donnees.membre.role) : ''}</p>
      </div>
      <div class="contenu">
        <div class="recap">
          <h3>Taux de présence global</h3>
          <div class="taux">${donnees.tauxPresence}%</div>
          <p>Présents : ${donnees.recap.present} · Retards : ${donnees.recap.retard} · Absents : ${donnees.recap.absent} · Permissionnaires : ${donnees.recap.permissionnaire}</p>
        </div>
        <table>
          <thead><tr><th>Séance</th><th>Date</th><th>Statut</th><th>Heure</th></tr></thead>
          <tbody>${lignes}</tbody>
        </table>
      </div>
    </body>
    </html>
  `;
}

router.get('/seance/:id/excel', verifierToken, async (req, res) => {
  try {
    const donnees = await recupererDonneesSeance(req.params.id, req.adminId);
    if (!donnees) return res.status(404).json({ message: 'Séance introuvable' });

    const couleurs = {
      present: 'FFC6EFCE',
      retard: 'FFFFE699',
      absent: 'FFFFC7CE',
      permissionnaire: 'FFBDD7EE',
    };

    const workbook = new ExcelJS.Workbook();
    const feuille = workbook.addWorksheet('Présence');
    feuille.columns = [{ width: 16 }, { width: 26 }, { width: 20 }, { width: 18 }, { width: 14 }];

    feuille.mergeCells('A1:E1');
    const titreCell = feuille.getCell('A1');
    titreCell.value = donnees.seance.organisation_nom;
    titreCell.font = { bold: true, size: 18, color: { argb: 'FFFFFFFF' } };
    titreCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF085041' } };
    feuille.getRow(1).height = 30;

    feuille.mergeCells('A2:E2');
    const sousTitreCell = feuille.getCell('A2');
    sousTitreCell.value = `${donnees.seance.titre} — ${new Date(donnees.seance.date_seance).toLocaleString('fr-FR')}`;
    sousTitreCell.font = { italic: true, size: 12, color: { argb: 'FF444444' } };
    sousTitreCell.alignment = { horizontal: 'center' };
    feuille.getRow(2).height = 22;

    feuille.addRow([]);

    const enTeteRow = feuille.addRow(['Identifiant', 'Nom', donnees.libelleRole, 'Statut', 'Heure']);
    enTeteRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F6E56' } };
      cell.alignment = { horizontal: 'center' };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });

    const ecrireLigneMembre = (m) => {
      const heureAffichee = m.heure_pointage ? new Date(m.heure_pointage).toLocaleTimeString('fr-FR') : '-';
      const ligne = feuille.addRow([m.identifiant, m.nom, m.role || '-', LABELS[m.statut], heureAffichee]);
      ligne.eachCell((cell, index) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: couleurs[m.statut] } };
        cell.border = { top: { style: 'thin', color: { argb: 'FFCCCCCC' } }, bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } }, left: { style: 'thin', color: { argb: 'FFCCCCCC' } }, right: { style: 'thin', color: { argb: 'FFCCCCCC' } } };
        if (index === 4) {
          cell.font = { bold: true };
          cell.alignment = { horizontal: 'center' };
        }
      });
    };

    const estEcole = donnees.libelleRole === 'Classe';
    const groupesUniques = new Set(donnees.membres.map((m) => m.role || 'Sans classe'));

    if (estEcole && groupesUniques.size > 1) {
      const groupes = {};
      donnees.membres.forEach((m) => {
        const cle = m.role || 'Sans classe';
        if (!groupes[cle]) groupes[cle] = [];
        groupes[cle].push(m);
      });

      Object.entries(groupes).forEach(([nomGroupe, membresGroupe]) => {
        const ligneGroupe = feuille.addRow([nomGroupe]);
        feuille.mergeCells(`A${ligneGroupe.number}:E${ligneGroupe.number}`);
        ligneGroupe.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        ligneGroupe.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F6E56' } };
        membresGroupe.forEach(ecrireLigneMembre);
      });
    } else {
      donnees.membres.forEach(ecrireLigneMembre);
    }

    feuille.addRow([]);

    const titreRecap = feuille.addRow(['Récapitulatif']);
    feuille.mergeCells(`A${titreRecap.number}:E${titreRecap.number}`);
    titreRecap.getCell(1).font = { bold: true, size: 13 };
    titreRecap.getCell(1).alignment = { horizontal: 'center' };

    const lignesRecap = [
      ['Présents', donnees.recap.present, 'FFC6EFCE'],
      ['Retards', donnees.recap.retard, 'FFFFE699'],
      ['Absents', donnees.recap.absent, 'FFFFC7CE'],
      ['Permissionnaires', donnees.recap.permissionnaire, 'FFBDD7EE'],
    ];

    lignesRecap.forEach(([label, valeur, couleur]) => {
      const ligne = feuille.addRow([label]);
      feuille.mergeCells(`A${ligne.number}:D${ligne.number}`);
      ligne.getCell(1).font = { bold: true };

      const celluleValeur = ligne.getCell(5);
      celluleValeur.value = valeur;
      celluleValeur.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: couleur } };
      celluleValeur.alignment = { horizontal: 'center' };
      celluleValeur.font = { bold: true };
    });

    await feuille.protect(MOT_DE_PASSE_PROTECTION, { selectLockedCells: true, selectUnlockedCells: true });

    const bufferExcel = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=presence_${donnees.seance.titre}.xlsx`);
    res.setHeader('Content-Length', bufferExcel.length);
    res.send(bufferExcel);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur lors de la génération du fichier Excel' });
  }
});

router.get('/seance/:id/pdf', verifierToken, async (req, res) => {
  let navigateur;
  try {
    const donnees = await recupererDonneesSeance(req.params.id, req.adminId);
    if (!donnees) return res.status(404).json({ message: 'Séance introuvable' });

    navigateur = await lancerNavigateur();
    const page = await navigateur.newPage();
    await page.setContent(genererHtmlSeance(donnees), { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=presence_${donnees.seance.titre}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur lors de la génération du PDF' });
  } finally {
    if (navigateur) await navigateur.close();
  }
});

router.get('/seance/:id/word', verifierToken, async (req, res) => {
  try {
    const donnees = await recupererDonneesSeance(req.params.id, req.adminId);
    if (!donnees) return res.status(404).json({ message: 'Séance introuvable' });

    const couleursTexte = { present: '2e7d32', retard: 'e65100', absent: 'c62828', permissionnaire: '1565c0' };
    const couleursFond = { present: 'E8F5E9', retard: 'FFF3E0', absent: 'FFEBEE', permissionnaire: 'E3F2FD' };

    const enTete = new TableRow({
      children: ['Identifiant', 'Nom', donnees.libelleRole, 'Statut', 'Heure'].map((texte) =>
        new TableCell({
          shading: { fill: '0F6E56' },
          children: [new Paragraph({ alignment: 'center', children: [new TextRun({ text: texte, bold: true, color: 'FFFFFF' })] })],
        })
      ),
    });

    const ligneMembre = (m) => {
      const heureAffichee = m.heure_pointage ? new Date(m.heure_pointage).toLocaleTimeString('fr-FR') : '-';
      return new TableRow({
        children: [
          new TableCell({ shading: { fill: couleursFond[m.statut] }, children: [new Paragraph(m.identifiant)] }),
          new TableCell({ shading: { fill: couleursFond[m.statut] }, children: [new Paragraph(m.nom)] }),
          new TableCell({ shading: { fill: couleursFond[m.statut] }, children: [new Paragraph(m.role || '-')] }),
          new TableCell({ shading: { fill: couleursFond[m.statut] }, children: [new Paragraph({ alignment: 'center', children: [new TextRun({ text: LABELS[m.statut], bold: true, color: couleursTexte[m.statut] })] })] }),
          new TableCell({ shading: { fill: couleursFond[m.statut] }, children: [new Paragraph({ alignment: 'center', text: heureAffichee })] }),
        ],
      });
    };

    const ligneGroupe = (nomGroupe) => new TableRow({
      children: [new TableCell({
        columnSpan: 5,
        shading: { fill: '085041' },
        children: [new Paragraph({ children: [new TextRun({ text: nomGroupe, bold: true, color: 'FFFFFF' })] })],
      })],
    });

    const estEcole = donnees.libelleRole === 'Classe';
    const groupesUniques = new Set(donnees.membres.map((m) => m.role || 'Sans classe'));

    let lignes = [];
    if (estEcole && groupesUniques.size > 1) {
      const groupes = {};
      donnees.membres.forEach((m) => {
        const cle = m.role || 'Sans classe';
        if (!groupes[cle]) groupes[cle] = [];
        groupes[cle].push(m);
      });
      Object.entries(groupes).forEach(([nomGroupe, membresGroupe]) => {
        lignes.push(ligneGroupe(nomGroupe));
        membresGroupe.forEach((m) => lignes.push(ligneMembre(m)));
      });
    } else {
      lignes = donnees.membres.map(ligneMembre);
    }

    const ligneRecap = (label, valeur) => new TableRow({
      children: [
        new TableCell({ columnSpan: 2, children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ alignment: 'center', children: [new TextRun({ text: String(valeur), bold: true })] })] }),
      ],
    });

    const document = new Document({
      sections: [{
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: donnees.seance.organisation_nom, color: '085041' })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${donnees.seance.titre} — ${new Date(donnees.seance.date_seance).toLocaleString('fr-FR')}`, italics: true, color: '555555' })] }),
          new Paragraph({ text: '' }),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [enTete, ...lignes] }),
          new Paragraph({ text: '' }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Récapitulatif', bold: true, size: 26 })] }),
          new Table({ width: { size: 60, type: WidthType.PERCENTAGE }, alignment: AlignmentType.CENTER, rows: [
            ligneRecap('Présents', donnees.recap.present),
            ligneRecap('Retards', donnees.recap.retard),
            ligneRecap('Absents', donnees.recap.absent),
            ligneRecap('Permissionnaires', donnees.recap.permissionnaire),
          ] }),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(document);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=presence_${donnees.seance.titre}.docx`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur lors de la génération du fichier Word' });
  }
});

router.get('/organisation/:id/excel', verifierToken, async (req, res) => {
  try {
    const donnees = await recupererDonneesOrganisation(req.params.id, req.adminId, req.query.classe);
    if (!donnees) return res.status(404).json({ message: 'Organisation introuvable' });

    const workbook = new ExcelJS.Workbook();
    const feuille = workbook.addWorksheet('Vue d\'ensemble');
    feuille.columns = [{ width: 16 }, { width: 26 }, { width: 18 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 14 }, { width: 12 }];

    feuille.mergeCells('A1:H1');
    feuille.getCell('A1').value = donnees.organisation.nom;
    feuille.getCell('A1').font = { bold: true, size: 18, color: { argb: 'FFFFFFFF' } };
    feuille.getCell('A1').alignment = { horizontal: 'center' };
    feuille.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF085041' } };
    feuille.getRow(1).height = 30;

    feuille.mergeCells('A2:H2');
    feuille.getCell('A2').value = `Vue d'ensemble${donnees.classe ? ` — Classe ${donnees.classe}` : ''} — ${donnees.nombreSeances} séance(s) enregistrée(s)`;
    feuille.getCell('A2').alignment = { horizontal: 'center' };
    feuille.getCell('A2').font = { italic: true };

    feuille.addRow([]);
    const enTete = feuille.addRow(['Identifiant', 'Nom', donnees.libelleRole, 'Présents', 'Retards', 'Absents', 'Permission', 'Taux']);
    enTete.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F6E56' } };
      cell.alignment = { horizontal: 'center' };
    });

    const ecrireLigneMembre = (m) => {
      feuille.addRow([m.identifiant, m.nom, m.role || '-', m.present, m.retard, m.absent, m.permissionnaire, `${m.tauxPresence}%`]);
    };

    const estEcole = donnees.libelleRole === 'Classe';
    const groupesUniques = new Set(donnees.membres.map((m) => m.role || 'Sans classe'));

    if (estEcole && !donnees.classe && groupesUniques.size > 1) {
      const groupes = {};
      donnees.membres.forEach((m) => {
        const cle = m.role || 'Sans classe';
        if (!groupes[cle]) groupes[cle] = [];
        groupes[cle].push(m);
      });

      Object.entries(groupes).forEach(([nomGroupe, membresGroupe]) => {
        const ligneGroupe = feuille.addRow([nomGroupe]);
        feuille.mergeCells(`A${ligneGroupe.number}:H${ligneGroupe.number}`);
        ligneGroupe.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        ligneGroupe.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F6E56' } };
        membresGroupe.forEach(ecrireLigneMembre);
      });
    } else {
      donnees.membres.forEach(ecrireLigneMembre);
    }

    await feuille.protect(MOT_DE_PASSE_PROTECTION, { selectLockedCells: true, selectUnlockedCells: true });

    const bufferExcel = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=vue_ensemble_${donnees.organisation.nom}.xlsx`);
    res.setHeader('Content-Length', bufferExcel.length);
    res.send(bufferExcel);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur lors de la génération du fichier Excel' });
  }
});

router.get('/organisation/:id/pdf', verifierToken, async (req, res) => {
  let navigateur;
  try {
    const donnees = await recupererDonneesOrganisation(req.params.id, req.adminId, req.query.classe);
    if (!donnees) return res.status(404).json({ message: 'Organisation introuvable' });

    navigateur = await lancerNavigateur();
    const page = await navigateur.newPage();
    await page.setContent(genererHtmlOrganisation(donnees), { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=vue_ensemble_${donnees.organisation.nom}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur lors de la génération du PDF' });
  } finally {
    if (navigateur) await navigateur.close();
  }
});

router.get('/organisation/:id/word', verifierToken, async (req, res) => {
  try {
    const donnees = await recupererDonneesOrganisation(req.params.id, req.adminId, req.query.classe);
    if (!donnees) return res.status(404).json({ message: 'Organisation introuvable' });

    const enTete = new TableRow({
      children: ['Identifiant', 'Nom', donnees.libelleRole, 'Présents', 'Retards', 'Absents', 'Permission', 'Taux'].map((texte) =>
        new TableCell({ shading: { fill: '0F6E56' }, children: [new Paragraph({ alignment: 'center', children: [new TextRun({ text: texte, bold: true, color: 'FFFFFF' })] })] })
      ),
    });

    const ligneMembre = (m) => new TableRow({
      children: [m.identifiant, m.nom, m.role || '-', String(m.present), String(m.retard), String(m.absent), String(m.permissionnaire), `${m.tauxPresence}%`].map((texte) =>
        new TableCell({ children: [new Paragraph({ alignment: 'center', text: texte })] })
      ),
    });

    const ligneGroupe = (nomGroupe) => new TableRow({
      children: [new TableCell({
        columnSpan: 8,
        shading: { fill: '085041' },
        children: [new Paragraph({ children: [new TextRun({ text: nomGroupe, bold: true, color: 'FFFFFF' })] })],
      })],
    });

    const estEcole = donnees.libelleRole === 'Classe';
    const groupesUniques = new Set(donnees.membres.map((m) => m.role || 'Sans classe'));

    let lignes = [];
    if (estEcole && !donnees.classe && groupesUniques.size > 1) {
      const groupes = {};
      donnees.membres.forEach((m) => {
        const cle = m.role || 'Sans classe';
        if (!groupes[cle]) groupes[cle] = [];
        groupes[cle].push(m);
      });
      Object.entries(groupes).forEach(([nomGroupe, membresGroupe]) => {
        lignes.push(ligneGroupe(nomGroupe));
        membresGroupe.forEach((m) => lignes.push(ligneMembre(m)));
      });
    } else {
      lignes = donnees.membres.map(ligneMembre);
    }

    const document = new Document({
      sections: [{
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: donnees.organisation.nom, color: '085041' })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Vue d'ensemble${donnees.classe ? ` — Classe ${donnees.classe}` : ''} — ${donnees.nombreSeances} séance(s)`, italics: true, color: '555555' })] }),
          new Paragraph({ text: '' }),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [enTete, ...lignes] }),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(document);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=vue_ensemble_${donnees.organisation.nom}.docx`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur lors de la génération du fichier Word' });
  }
});

router.get('/membre/:id/excel', verifierToken, async (req, res) => {
  try {
    const donnees = await recupererDonneesMembre(req.params.id, req.adminId);
    if (!donnees) return res.status(404).json({ message: 'Membre introuvable' });

    const workbook = new ExcelJS.Workbook();
    const feuille = workbook.addWorksheet('Historique');
    feuille.columns = [{ width: 28 }, { width: 24 }, { width: 18 }, { width: 14 }];

    feuille.mergeCells('A1:D1');
    feuille.getCell('A1').value = `${donnees.membre.nom} (${donnees.membre.identifiant})`;
    feuille.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
    feuille.getCell('A1').alignment = { horizontal: 'center' };
    feuille.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF085041' } };

    feuille.mergeCells('A2:D2');
    feuille.getCell('A2').value = `${donnees.membre.organisation_nom} — Taux de présence : ${donnees.tauxPresence}%`;
    feuille.getCell('A2').alignment = { horizontal: 'center' };
    feuille.getCell('A2').font = { italic: true };

    feuille.addRow([]);
    const enTete = feuille.addRow(['Séance', 'Date', 'Statut', 'Heure']);
    enTete.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F6E56' } };
    });

    const couleurs = { present: 'FFC6EFCE', retard: 'FFFFE699', absent: 'FFFFC7CE', permissionnaire: 'FFBDD7EE' };
    donnees.historique.forEach((h) => {
      const heureAffichee = h.heure_pointage ? new Date(h.heure_pointage).toLocaleTimeString('fr-FR') : '-';
      const ligne = feuille.addRow([h.titre, new Date(h.date_seance).toLocaleString('fr-FR'), LABELS[h.statut], heureAffichee]);
      ligne.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: couleurs[h.statut] } };
    });

    await feuille.protect(MOT_DE_PASSE_PROTECTION, { selectLockedCells: true, selectUnlockedCells: true });

    const bufferExcel = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=historique_${donnees.membre.identifiant}.xlsx`);
    res.setHeader('Content-Length', bufferExcel.length);
    res.send(bufferExcel);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur lors de la génération du fichier Excel' });
  }
});

router.get('/membre/:id/pdf', verifierToken, async (req, res) => {
  let navigateur;
  try {
    const donnees = await recupererDonneesMembre(req.params.id, req.adminId);
    if (!donnees) return res.status(404).json({ message: 'Membre introuvable' });

    navigateur = await lancerNavigateur();
    const page = await navigateur.newPage();
    await page.setContent(genererHtmlMembre(donnees), { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=historique_${donnees.membre.identifiant}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur lors de la génération du PDF' });
  } finally {
    if (navigateur) await navigateur.close();
  }
});

router.get('/membre/:id/word', verifierToken, async (req, res) => {
  try {
    const donnees = await recupererDonneesMembre(req.params.id, req.adminId);
    if (!donnees) return res.status(404).json({ message: 'Membre introuvable' });

    const couleursTexte = { present: '2e7d32', retard: 'e65100', absent: 'c62828', permissionnaire: '1565c0' };

    const enTete = new TableRow({
      children: ['Séance', 'Date', 'Statut', 'Heure'].map((texte) =>
        new TableCell({ shading: { fill: '0F6E56' }, children: [new Paragraph({ alignment: 'center', children: [new TextRun({ text: texte, bold: true, color: 'FFFFFF' })] })] })
      ),
    });

    const lignes = donnees.historique.map((h) => {
      const heureAffichee = h.heure_pointage ? new Date(h.heure_pointage).toLocaleTimeString('fr-FR') : '-';
      return new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(h.titre)] }),
          new TableCell({ children: [new Paragraph(new Date(h.date_seance).toLocaleString('fr-FR'))] }),
          new TableCell({ children: [new Paragraph({ alignment: 'center', children: [new TextRun({ text: LABELS[h.statut], bold: true, color: couleursTexte[h.statut] })] })] }),
          new TableCell({ children: [new Paragraph({ alignment: 'center', text: heureAffichee })] }),
        ],
      });
    });

    const document = new Document({
      sections: [{
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: `${donnees.membre.nom} (${donnees.membre.identifiant})`, color: '085041' })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${donnees.membre.organisation_nom} — Taux de présence : ${donnees.tauxPresence}%`, italics: true, color: '555555' })] }),
          new Paragraph({ text: '' }),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [enTete, ...lignes] }),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(document);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=historique_${donnees.membre.identifiant}.docx`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur lors de la génération du fichier Word' });
  }
});

router.get('/mon-historique/excel', verifierTokenMembre, async (req, res) => {
  try {
    const donnees = await recupererDonneesMembrePourLuiMeme(req.membreId);
    if (!donnees) return res.status(404).json({ message: 'Membre introuvable' });

    const workbook = new ExcelJS.Workbook();
    const feuille = workbook.addWorksheet('Historique');
    feuille.columns = [{ width: 28 }, { width: 24 }, { width: 18 }, { width: 14 }];

    feuille.mergeCells('A1:D1');
    feuille.getCell('A1').value = `${donnees.membre.nom} (${donnees.membre.identifiant})`;
    feuille.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
    feuille.getCell('A1').alignment = { horizontal: 'center' };
    feuille.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF085041' } };

    feuille.mergeCells('A2:D2');
    feuille.getCell('A2').value = `${donnees.membre.organisation_nom} — Taux de présence : ${donnees.tauxPresence}%`;
    feuille.getCell('A2').alignment = { horizontal: 'center' };
    feuille.getCell('A2').font = { italic: true };

    feuille.addRow([]);
    const enTete = feuille.addRow(['Séance', 'Date', 'Statut', 'Heure']);
    enTete.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F6E56' } };
    });

    const couleurs = { present: 'FFC6EFCE', retard: 'FFFFE699', absent: 'FFFFC7CE', permissionnaire: 'FFBDD7EE' };
    donnees.historique.forEach((h) => {
      const heureAffichee = h.heure_pointage ? new Date(h.heure_pointage).toLocaleTimeString('fr-FR') : '-';
      const ligne = feuille.addRow([h.titre, new Date(h.date_seance).toLocaleString('fr-FR'), LABELS[h.statut], heureAffichee]);
      ligne.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: couleurs[h.statut] } };
    });

    await feuille.protect(MOT_DE_PASSE_PROTECTION, { selectLockedCells: true, selectUnlockedCells: true });

    const bufferExcel = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=mon_historique.xlsx`);
    res.setHeader('Content-Length', bufferExcel.length);
    res.send(bufferExcel);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur lors de la génération du fichier Excel' });
  }
});

router.get('/mon-historique/pdf', verifierTokenMembre, async (req, res) => {
  let navigateur;
  try {
    const donnees = await recupererDonneesMembrePourLuiMeme(req.membreId);
    if (!donnees) return res.status(404).json({ message: 'Membre introuvable' });

    navigateur = await lancerNavigateur();
    const page = await navigateur.newPage();
    await page.setContent(genererHtmlMembre(donnees), { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=mon_historique.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur lors de la génération du PDF' });
  } finally {
    if (navigateur) await navigateur.close();
  }
});

router.get('/mon-historique/word', verifierTokenMembre, async (req, res) => {
  try {
    const donnees = await recupererDonneesMembrePourLuiMeme(req.membreId);
    if (!donnees) return res.status(404).json({ message: 'Membre introuvable' });

    const couleursTexte = { present: '2e7d32', retard: 'e65100', absent: 'c62828', permissionnaire: '1565c0' };

    const enTete = new TableRow({
      children: ['Séance', 'Date', 'Statut', 'Heure'].map((texte) =>
        new TableCell({ shading: { fill: '0F6E56' }, children: [new Paragraph({ alignment: 'center', children: [new TextRun({ text: texte, bold: true, color: 'FFFFFF' })] })] })
      ),
    });

    const lignes = donnees.historique.map((h) => {
      const heureAffichee = h.heure_pointage ? new Date(h.heure_pointage).toLocaleTimeString('fr-FR') : '-';
      return new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(h.titre)] }),
          new TableCell({ children: [new Paragraph(new Date(h.date_seance).toLocaleString('fr-FR'))] }),
          new TableCell({ children: [new Paragraph({ alignment: 'center', children: [new TextRun({ text: LABELS[h.statut], bold: true, color: couleursTexte[h.statut] })] })] }),
          new TableCell({ children: [new Paragraph({ alignment: 'center', text: heureAffichee })] }),
        ],
      });
    });

    const document = new Document({
      sections: [{
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: `${donnees.membre.nom} (${donnees.membre.identifiant})`, color: '085041' })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${donnees.membre.organisation_nom} — Taux de présence : ${donnees.tauxPresence}%`, italics: true, color: '555555' })] }),
          new Paragraph({ text: '' }),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [enTete, ...lignes] }),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(document);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=mon_historique.docx`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur lors de la génération du fichier Word' });
  }
});

router.get('/organisation/:id/fiches-qr', verifierToken, async (req, res) => {
  let navigateur;
  try {
    const donnees = await recupererMembresPourFichesQr(req.params.id, req.adminId, req.query.classe);
    if (!donnees) return res.status(404).json({ message: 'Organisation introuvable' });

    if (donnees.membres.length === 0) {
      return res.status(400).json({ message: 'Aucun membre actif à exporter' });
    }

    const cartes = await Promise.all(
      donnees.membres.map(async (m) => {
        const qrDataUrl = await QRCode.toDataURL(m.qr_code_valeur, { width: 200, margin: 1 });
        return `
          <div class="carte">
            <p class="org">${echapperHtml(donnees.organisation.nom)}</p>
            <img src="${qrDataUrl}" alt="QR" />
            <p class="identifiant">${echapperHtml(m.identifiant)}</p>
            <p class="nom">${echapperHtml(m.nom)}</p>
            ${m.role ? `<p class="role">${echapperHtml(m.role)}</p>` : ''}
          </div>
        `;
      })
    );

    const html = `
      <html>
      <head><style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .grille { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .carte {
          border: 1px solid #ccc; border-radius: 8px; padding: 14px 10px;
          text-align: center; page-break-inside: avoid;
        }
        .org { font-size: 11px; font-weight: bold; margin: 0 0 8px 0; color: #085041; }
        img { width: 120px; height: 120px; }
        .identifiant { font-size: 14px; font-weight: bold; margin: 8px 0 2px 0; }
        .nom { font-size: 12px; margin: 0; color: #333; }
        .role { font-size: 10px; margin: 2px 0 0 0; color: #888; }
      </style></head>
      <body>
        <div class="grille">${cartes.join('')}</div>
      </body>
      </html>
    `;

    navigateur = await lancerNavigateur();
    const page = await navigateur.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '15mm', bottom: '15mm', left: '10mm', right: '10mm' } });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=fiches_qr_${donnees.organisation.nom}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur lors de la génération des fiches QR' });
  } finally {
    if (navigateur) await navigateur.close();
  }
});

router.get('/membre/:id/carte', verifierToken, async (req, res) => {
  let navigateur;
  try {
    const membre = await recupererDonneesMembrePourCarte(req.params.id, req.adminId);
    if (!membre) return res.status(404).json({ message: 'Membre introuvable' });

    const format = req.query.format === 'horizontal' ? 'horizontal' : 'vertical';
    const qrDataUrl = await QRCode.toDataURL(membre.qr_code_valeur, { width: 300, margin: 1 });

    navigateur = await lancerNavigateur();
    const page = await navigateur.newPage();
    await page.setContent(genererHtmlCarte(membre, qrDataUrl, format), { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ printBackground: true, preferCSSPageSize: true });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=carte_${membre.identifiant}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur lors de la génération de la carte' });
  } finally {
    if (navigateur) await navigateur.close();
  }
});

router.get('/organisation/:id/cartes', verifierToken, async (req, res) => {
  let navigateur;
  try {
    const donnees = await recupererMembresPourFichesQr(req.params.id, req.adminId, req.query.classe);
    if (!donnees) return res.status(404).json({ message: 'Organisation introuvable' });

    if (donnees.membres.length === 0) {
      return res.status(400).json({ message: 'Aucun membre actif à exporter' });
    }

    const format = req.query.format === 'horizontal' ? 'horizontal' : 'vertical';

    const membresAvecOrg = await Promise.all(
      donnees.membres.map(async (m) => {
        const detail = await pool.query('SELECT societe, telephone FROM membres WHERE id = $1', [m.id]);
        return {
          ...m,
          organisation_nom: donnees.organisation.nom,
          organisation_type: donnees.organisation.type,
          fond_carte_url: donnees.organisation.fond_carte_url,
          societe: detail.rows[0]?.societe || null,
        };
      })
    );

    const pagesHtml = await Promise.all(
      membresAvecOrg.map(async (m) => {
        const qrDataUrl = await QRCode.toDataURL(m.qr_code_valeur, { width: 300, margin: 1 });
        return genererHtmlCarte(m, qrDataUrl, format);
      })
    );

    const estVertical = format !== 'horizontal';
    const largeur = estVertical ? '54mm' : '86mm';
    const hauteur = estVertical ? '86mm' : '54mm';

    const htmlComplet = `
      <html>
      <head><style>
        @page { size: ${largeur} ${hauteur}; margin: 0; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; }
      </style></head>
      <body>${pagesHtml.map((h) => h.match(/<body>([\s\S]*)<\/body>/)[1]).join('')}</body>
      </html>
    `;

    navigateur = await lancerNavigateur();
    const page = await navigateur.newPage();
    await page.setContent(htmlComplet, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ printBackground: true, preferCSSPageSize: true });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=cartes_${donnees.organisation.nom}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur lors de la génération des cartes' });
  } finally {
    if (navigateur) await navigateur.close();
  }
});

module.exports = router;