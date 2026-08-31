const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const { put } = require('@vercel/blob');
const verifierToken = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/', verifierToken, upload.single('fichier'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Aucun fichier reçu' });
  }

  const typesAutorises = ['image/jpeg', 'image/png', 'image/webp'];
  if (!typesAutorises.includes(req.file.mimetype)) {
    return res.status(400).json({ message: 'Format d\'image non supporté (JPG, PNG ou WEBP uniquement)' });
  }

  try {
    const dossier = req.body.dossier === 'organisations' ? 'organisations' : 'membres';
    const largeurMax = dossier === 'organisations' ? 1200 : 600;

    const bufferWebp = await sharp(req.file.buffer)
      .resize({ width: largeurMax, height: largeurMax, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    const nomFichier = `${dossier}/${Date.now()}-${req.file.originalname.replace(/\.[^/.]+$/, '').replace(/\s+/g, '-')}.webp`;

    const blob = await put(nomFichier, bufferWebp, {
      access: 'public',
      contentType: 'image/webp',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    res.json({ url: blob.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur lors de l\'upload de l\'image' });
  }
});

module.exports = router;