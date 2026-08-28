import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { FileDown, FileSpreadsheet, FileText, Camera, ArrowRight } from 'lucide-react';
import BottomNavMembre from '../components/BottomNavMembre';

function EspaceMembre() {
  const [donnees, setDonnees] = useState(null);
  const [chargement, setChargement] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const charger = async () => {
      const token = localStorage.getItem('tokenMembre');
      if (!token) {
        navigate('/espace-membre/connexion');
        return;
      }

      try {
        const reponse = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/membre-espace/mon-profil`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setDonnees(reponse.data);
      } catch (err) {
        localStorage.removeItem('tokenMembre');
        navigate('/espace-membre/connexion');
      } finally {
        setChargement(false);
      }
    };
    charger();
  }, []);

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
  const derniereSeance = donnees.historique[0];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-400 px-4 sm:px-6 pt-6 pb-16">
        <div className="max-w-xl mx-auto">
          <h1 className="text-white text-xl sm:text-2xl font-semibold tracking-tight">Bonjour {donnees.membre.nom}</h1>
          <p className="text-primary-50 text-sm mt-1">
            {donnees.membre.organisation_nom}{donnees.membre.role ? ` — ${donnees.membre.role}` : ''}
          </p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 sm:px-6 -mt-10 anim-apparition space-y-4">
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
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-success-bg text-success-text">{donnees.recap.present} présents</span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-warning-bg text-warning-text">{donnees.recap.retard} retards</span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-danger-bg text-danger-text">{donnees.recap.absent} absents</span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-info-bg text-info-text">{donnees.recap.permissionnaire} permissions</span>
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
        </div>

        <Link
          to="/membre/scanner"
          className="flex items-center gap-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:border-primary-200 transition"
        >
          <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center shrink-0">
            <Camera className="text-primary-600" size={20} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-800">Scanner le QR de la séance</p>
            <p className="text-xs text-gray-400">Pointer ta présence maintenant</p>
          </div>
          <ArrowRight className="text-gray-300" size={18} />
        </Link>

        {derniereSeance && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs text-gray-400 mb-2">Dernière séance</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">{derniereSeance.titre}</p>
                <p className="text-xs text-gray-400">{new Date(derniereSeance.date_seance).toLocaleString('fr-FR')}</p>
              </div>
              <Link to="/membre/historique" className="text-xs text-primary-600 font-medium hover:underline">
                Voir tout
              </Link>
            </div>
          </div>
        )}
      </div>

      <BottomNavMembre />
    </div>
  );
}

export default EspaceMembre;