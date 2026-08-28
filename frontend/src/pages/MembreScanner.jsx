import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Camera, CameraOff, XCircle } from 'lucide-react';
import ScannerQR from '../components/ScannerQR';
import BottomNavMembre from '../components/BottomNavMembre';

function MembreScanner() {
  const [scanActif, setScanActif] = useState(false);
  const [erreur, setErreur] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const scannerApiRef = useRef(null);

  const gererResultatScan = useCallback(async (texteDecode) => {
    setErreur('');
    const token = localStorage.getItem('tokenMembre');
    try {
      const reponse = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/presences/auto-scan`,
        { qrSeanceValeur: texteDecode },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (scannerApiRef.current) {
        await scannerApiRef.current.arreter();
      }
      setScanActif(false);
      setConfirmation({
        seanceTitre: reponse.data.seanceTitre,
        statut: reponse.data.presence.statut,
        heure: reponse.data.presence.heure_pointage,
      });
    } catch (err) {
      setErreur(err.response ? err.response.data.message : 'Erreur lors du pointage');
    }
  }, []);

  const demarrerScan = async () => {
    setScanActif(true);
    setErreur('');
    setConfirmation(null);
    try {
      await scannerApiRef.current.demarrer();
    } catch (err) {
      let messageErreurTechnique;
      if (err && err.message === 'AUCUNE_CAMERA') {
        messageErreurTechnique = 'Aucune caméra détectée. Vérifie que l\'autorisation caméra est bien accordée dans les réglages du navigateur.';
      } else if (err && err.message === 'DEMARRAGE_TROP_LONG') {
        messageErreurTechnique = 'La caméra met trop de temps à répondre. Réessaie.';
      } else if (err && err.name === 'NotAllowedError') {
        messageErreurTechnique = 'Accès à la caméra refusé. Autorise la caméra dans les réglages du navigateur puis réessaie.';
      } else {
        messageErreurTechnique = `Erreur caméra : ${err && err.message ? err.message : 'inconnue'}`;
      }
      setErreur(messageErreurTechnique);
      setScanActif(false);
    }
  };

  const arreterScan = async () => {
    await scannerApiRef.current.arreter();
    setScanActif(false);
  };

  const LABELS_STATUT = { present: 'Présent', retard: 'En retard', absent: 'Absent', permissionnaire: 'Permissionnaire' };

  if (confirmation) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col pb-20">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center anim-apparition">
            <div className="w-16 h-16 bg-success-bg rounded-full flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-success-text">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-gray-800 mb-1">Présence enregistrée</p>
            <p className="text-sm text-gray-500 mb-1">{confirmation.seanceTitre}</p>
            <p className="text-xs text-gray-400 mb-4">
              {confirmation.heure ? new Date(confirmation.heure).toLocaleString('fr-FR') : ''}
            </p>
            <span className="inline-block text-xs font-medium px-3 py-1.5 rounded-full bg-success-bg text-success-text mb-6">
              {LABELS_STATUT[confirmation.statut]}
            </span>
            <div>
              <Link
                to="/mon-espace"
                className="inline-block px-6 py-3 bg-gradient-to-r from-primary-900 to-primary-400 text-white font-medium rounded-xl hover:opacity-90 active:scale-[0.98] transition"
              >
                Retour à mon espace
              </Link>
            </div>
          </div>
        </div>
        <BottomNavMembre />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-400 px-4 sm:px-6 pt-6 pb-14">
        <div className="max-w-md mx-auto">
          <Link to="/mon-espace" className="inline-flex items-center gap-1 text-primary-50 text-xs mb-3 hover:text-white transition">
            <ArrowLeft size={14} /> Retour
          </Link>
          <h1 className="text-white text-xl sm:text-2xl font-semibold tracking-tight">Scanner le QR</h1>
          <p className="text-primary-50 text-sm mt-1">Scanne le QR de la séance affiché par le responsable</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 sm:px-6 -mt-8 anim-apparition">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
          {!scanActif ? (
            <button
              onClick={demarrerScan}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-primary-900 to-primary-400 text-white font-medium rounded-xl hover:opacity-90 active:scale-[0.98] transition"
            >
              <Camera size={18} /> Démarrer le scan
            </button>
          ) : (
            <button
              onClick={arreterScan}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 active:scale-[0.98] transition"
            >
              <CameraOff size={18} /> Arrêter le scan
            </button>
          )}

          <ScannerQR ref={scannerApiRef} elementId="lecteur-qr-membre-scanner" onResultat={gererResultatScan} />

          <p className="text-xs text-gray-400 text-center mt-3">
            Le pointage s'enregistre automatiquement dès que le code est reconnu.
          </p>

          {erreur && (
            <div className="flex items-center gap-2 mt-4 px-3 py-2.5 rounded-xl text-sm font-medium bg-danger-bg text-danger-text anim-apparition">
              <XCircle size={16} />
              {erreur}
            </div>
          )}
        </div>
      </div>

      <BottomNavMembre />
    </div>
  );
}

export default MembreScanner;