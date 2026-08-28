import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LogOut, FileDown, FileSpreadsheet, FileText, CalendarX, Camera, CameraOff, CheckCircle2, XCircle } from 'lucide-react';
import ScannerQR from '../components/ScannerQR';

const LABELS_STATUT = { present: 'Présent', retard: 'En retard', absent: 'Absent', permissionnaire: 'Permissionnaire' };
const STYLES_STATUT = {
  present: 'bg-success-bg text-success-text',
  retard: 'bg-warning-bg text-warning-text',
  absent: 'bg-danger-bg text-danger-text',
  permissionnaire: 'bg-info-bg text-info-text',
};

function EspaceMembre() {
  const [donnees, setDonnees] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [scanActif, setScanActif] = useState(false);
  const [messageScan, setMessageScan] = useState('');
  const [messageScanErreur, setMessageScanErreur] = useState(false);
  const scannerApiRef = useRef(null);
  const navigate = useNavigate();

  const rechargerProfil = async () => {
    const token = localStorage.getItem('tokenMembre');
    const reponse = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/membre-espace/mon-profil`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setDonnees(reponse.data);
  };

  useEffect(() => {
    const charger = async () => {
      const token = localStorage.getItem('tokenMembre');
      if (!token) {
        navigate('/espace-membre/connexion');
        return;
      }

      try {
        await rechargerProfil();
      } catch (err) {
        localStorage.removeItem('tokenMembre');
        navigate('/espace-membre/connexion');
      } finally {
        setChargement(false);
      }
    };
    charger();
  }, []);

  const deconnexion = () => {
    localStorage.removeItem('tokenMembre');
    localStorage.removeItem('membreInfo');
    navigate('/espace-membre/connexion');
  };

  const telechargerMonRapport = async (format) => {
    const extensions = { excel: 'xlsx', pdf: 'pdf', word: 'docx' };
    const token = localStorage.getItem('tokenMembre');
    const reponse = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/exports/mon-historique/${format}`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([reponse.data]));
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = `mon_historique.${extensions[format]}`;
    lien.click();
    window.URL.revokeObjectURL(url);
  };

  const gererResultatScan = useCallback(async (texteDecode) => {
    const token = localStorage.getItem('tokenMembre');
    try {
      const reponse = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/presences/auto-scan`,
        { qrSeanceValeur: texteDecode },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessageScan(`Présence enregistrée pour "${reponse.data.seanceTitre}"`);
      setMessageScanErreur(false);
      rechargerProfil();
    } catch (err) {
      setMessageScan(err.response ? err.response.data.message : 'Erreur de pointage');
      setMessageScanErreur(true);
    }
  }, []);

  const demarrerScan = async () => {
    setScanActif(true);
    setMessageScan('');

    try {
      await scannerApiRef.current.demarrer();
    } catch (err) {
      let messageErreurTechnique;
      if (err && err.message === 'AUCUNE_CAMERA') {
        messageErreurTechnique = 'Aucune caméra détectée. Vérifie que l\'autorisation caméra est bien accordée dans les réglages du navigateur.';
      } else if (err && err.message === 'DEMARRAGE_TROP_LONG') {
        messageErreurTechnique = 'La caméra met trop de temps à répondre. Réessaie, ou change de navigateur si ça persiste.';
      } else if (err && err.name === 'NotAllowedError') {
        messageErreurTechnique = 'Accès à la caméra refusé. Autorise la caméra dans les réglages du navigateur puis réessaie.';
      } else {
        messageErreurTechnique = `Erreur caméra : ${err && err.message ? err.message : 'inconnue'}`;
      }
      setMessageScan(messageErreurTechnique);
      setMessageScanErreur(true);
      setScanActif(false);
    }
  };

  const arreterScan = async () => {
    await scannerApiRef.current.arreter();
    setScanActif(false);
  };

  if (chargement) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Chargement...</p>
      </div>
    );
  }

  if (!donnees) return null;

  const circonference = 2 * Math.PI * 42;
  const decalage = circonference - (donnees.tauxPresence / 100) * circonference;

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-400 px-4 sm:px-6 pt-6 pb-16">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-white text-xl sm:text-2xl font-semibold tracking-tight">Bonjour {donnees.membre.nom}</h1>
            <p className="text-primary-50 text-sm mt-1">
              {donnees.membre.organisation_nom}{donnees.membre.role ? ` — ${donnees.membre.role}` : ''} · {donnees.membre.identifiant}
            </p>
          </div>
          <button
            onClick={deconnexion}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/15 text-white text-xs font-medium rounded-lg hover:bg-white/25 transition shrink-0"
          >
            <LogOut size={14} /> Quitter
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 sm:px-6 -mt-10 anim-apparition">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 flex flex-col items-center">
          <div className="relative w-28 h-28 mb-3">
            <svg className="w-28 h-28 -rotate-90">
              <circle cx="56" cy="56" r="42" stroke="var(--color-gray-100, #f1efe8)" strokeWidth="10" fill="none" />
              <circle
                cx="56" cy="56" r="42"
                stroke="#0f6e56" strokeWidth="10" fill="none"
                strokeDasharray={circonference}
                strokeDashoffset={decalage}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-semibold text-gray-800">{donnees.tauxPresence}%</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-4">Taux de présence global</p>

          <div className="flex flex-wrap justify-center gap-2 mb-5">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STYLES_STATUT.present}`}>{donnees.recap.present} présent{donnees.recap.present > 1 ? 's' : ''}</span>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STYLES_STATUT.retard}`}>{donnees.recap.retard} retard{donnees.recap.retard > 1 ? 's' : ''}</span>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STYLES_STATUT.absent}`}>{donnees.recap.absent} absent{donnees.recap.absent > 1 ? 's' : ''}</span>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STYLES_STATUT.permissionnaire}`}>{donnees.recap.permissionnaire} permission{donnees.recap.permissionnaire > 1 ? 's' : ''}</span>
          </div>

          <div className="flex gap-2 w-full">
            <button
              onClick={() => telechargerMonRapport('pdf')}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition"
            >
              <FileDown size={14} /> PDF
            </button>
            <button
              onClick={() => telechargerMonRapport('excel')}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition"
            >
              <FileSpreadsheet size={14} /> Excel
            </button>
            <button
              onClick={() => telechargerMonRapport('word')}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition"
            >
              <FileText size={14} /> Word
            </button>
          </div>

          <div className="w-full mt-4 pt-4 border-t border-gray-100">
            {!scanActif ? (
              <button
                onClick={demarrerScan}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-primary-900 to-primary-400 text-white font-medium rounded-xl hover:opacity-90 active:scale-[0.98] transition"
              >
                <Camera size={18} /> Scanner le QR de la séance
              </button>
            ) : (
              <button
                onClick={arreterScan}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 active:scale-[0.98] transition"
              >
                <CameraOff size={18} /> Arrêter le scan
              </button>
            )}

            <ScannerQR ref={scannerApiRef} elementId="lecteur-qr-membre" onResultat={gererResultatScan} />

            {messageScan && (
              <div
                className={`flex items-center gap-2 mt-4 px-3 py-2.5 rounded-xl text-sm font-medium anim-apparition ${
                  messageScanErreur ? 'bg-danger-bg text-danger-text' : 'bg-success-bg text-success-text'
                }`}
              >
                {messageScanErreur ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
                {messageScan}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 px-1">Historique des séances</h2>
          {donnees.historique.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
              <CalendarX className="text-gray-300 mx-auto mb-3" size={32} />
              <p className="text-sm text-gray-400">Aucune séance enregistrée pour l'instant.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {donnees.historique.map((h, index) => (
                <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{h.titre}</p>
                    <p className="text-xs text-gray-400">{new Date(h.date_seance).toLocaleString('fr-FR')}</p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STYLES_STATUT[h.statut]}`}>
                    {LABELS_STATUT[h.statut]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EspaceMembre;