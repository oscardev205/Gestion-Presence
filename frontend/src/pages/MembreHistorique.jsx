import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, CalendarX } from 'lucide-react';
import BottomNavMembre from '../components/BottomNavMembre';

const LABELS_STATUT = { present: 'Présent', retard: 'En retard', absent: 'Absent', permissionnaire: 'Permissionnaire' };
const STYLES_STATUT = {
  present: 'bg-success-bg text-success-text',
  retard: 'bg-warning-bg text-warning-text',
  absent: 'bg-danger-bg text-danger-text',
  permissionnaire: 'bg-info-bg text-info-text',
};

const FILTRES = [
  { valeur: 'toutes', label: 'Toutes' },
  { valeur: 'present', label: 'Présent' },
  { valeur: 'retard', label: 'Retard' },
  { valeur: 'absent', label: 'Absent' },
  { valeur: 'permissionnaire', label: 'Permission' },
];

function MembreHistorique() {
  const [donnees, setDonnees] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [filtre, setFiltre] = useState('toutes');

  useEffect(() => {
    const charger = async () => {
      const token = localStorage.getItem('tokenMembre');
      try {
        const reponse = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/membre-espace/mon-profil`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setDonnees(reponse.data);
      } finally {
        setChargement(false);
      }
    };
    charger();
  }, []);

  if (chargement) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Chargement...</p>
      </div>
    );
  }

  if (!donnees) return null;

  const historiqueFiltre = filtre === 'toutes'
    ? donnees.historique
    : donnees.historique.filter((h) => h.statut === filtre);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-400 px-4 sm:px-6 pt-6 pb-6">
        <div className="max-w-xl mx-auto">
          <Link to="/mon-espace" className="inline-flex items-center gap-1 text-primary-50 text-xs mb-3 hover:text-white transition">
            <ArrowLeft size={14} /> Retour
          </Link>
          <h1 className="text-white text-xl sm:text-2xl font-semibold tracking-tight">Mon historique</h1>
          <p className="text-primary-50 text-sm mt-1">{donnees.historique.length} séance{donnees.historique.length > 1 ? 's' : ''} enregistrée{donnees.historique.length > 1 ? 's' : ''}</p>

          <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
            {FILTRES.map((f) => (
              <button
                key={f.valeur}
                onClick={() => setFiltre(f.valeur)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                  filtre === f.valeur ? 'bg-white text-primary-800' : 'bg-white/15 text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 sm:px-6 mt-4 anim-apparition">
        {historiqueFiltre.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <CalendarX className="text-gray-300 mx-auto mb-3" size={32} />
            <p className="text-sm text-gray-400">Aucune séance dans cette catégorie.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {historiqueFiltre.map((h, index) => (
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

      <BottomNavMembre />
    </div>
  );
}

export default MembreHistorique;