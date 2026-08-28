require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const pool = require('./db');
const authRoutes = require('./routes/auth');
const organisationsRoutes = require('./routes/organisations');
const membresRoutes = require('./routes/membres');
const seancesRoutes = require('./routes/seances');
const presencesRoutes = require('./routes/presences');
const exportsRoutes = require('./routes/exports');
const membreAuthRoutes = require('./routes/membreAuth');
const membreEspaceRoutes = require('./routes/membreEspace');
const responsableAuthRoutes = require('./routes/responsableAuth');

const app = express();
const serveur = http.createServer(app);
const io = new Server(serveur, {
  cors: { origin: '*' },
});

app.set('io', io);

io.on('connection', (socket) => {
  socket.on('rejoindre-seance', (seanceId) => {
    socket.join(`seance-${seanceId}`);
  });

  socket.on('quitter-seance', (seanceId) => {
    socket.leave(`seance-${seanceId}`);
  });
});

const originesAutorisees = [
  'http://localhost:5173',
  'https://gestion-presence-gt.vercel.app',
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || originesAutorisees.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origine non autorisée par CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/organisations', organisationsRoutes);
app.use('/api/membres', membresRoutes);
app.use('/api/seances', seancesRoutes);
app.use('/api/presences', presencesRoutes);
app.use('/api/exports', exportsRoutes);
app.use('/api/membre-auth', membreAuthRoutes);
app.use('/api/membre-espace', membreEspaceRoutes);
app.use('/api/responsables', responsableAuthRoutes);

app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', dbTime: result.rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Connexion base de données échouée' });
  }
});

const PORT = process.env.PORT || 5000;
serveur.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});