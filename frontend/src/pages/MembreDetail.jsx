import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../api';

const LABELS_STATUT = { present: 'Présent', retard: 'En retard', absent: 'Absent', permissionnaire: 'Permissionnaire' };
const STYLES_STATUT = {
  present: 'bg-success-bg text-success-text',
  retard: 'bg-warning-bg text-warning-text',
  absent: 'bg-danger-bg text-danger-text',
  permissionnaire: 'bg-info-bg text-info-text',
};

function MembreDetail() {
  const { membreId } = useParams();
  const [donnees, setDonnees] = useState(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    const charger = async () => {
      try {
        const reponse = await api.get(`/membres/${membreId}/detail`);
        setDonnees(reponse.data);
      } finally {
        setChargement(false);
      }
    };
    charger();
  }, [membreId]);

  if (chargement) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Chargement...</p>
      </div>
    );
  }

  if (!donnees) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-400 px-4 sm:px-6 pt-6 pb-14">
        <div className="max-w-2xl mx-auto">
          <Link to="/statistiques" className="inline-flex items-center gap-1 text-primary-50 text-xs mb-3 hover:text-white transition">
            <ArrowLeft size={14} /> Retour aux statistiques
          </Link>
          <h1 className="text-white text-xl sm:text-2xl font-semibold tracking-tight">{donnees.membre.nom}</h1>
          <p className="text-primary-50 text-sm mt-1">{donnees.membre.identifiant}{donnees.membre.role ? ` — ${donnees.membre.role}` : ''}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 -mt-8 anim-apparition">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Taux de présence global</p>
          <p className="text-3xl font-semibold text-primary-800">{donnees.tauxPresence}%</p>
          <div className="flex flex-wrap justify-center gap-2 mt-3">
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-success-bg text-success-text">
              {donnees.recap.present} présent{donnees.recap.present > 1 ? 's' : ''} · {donnees.seances.length > 0 ? Math.round((donnees.recap.present / donnees.seances.length) * 100) : 0}%
            </span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-warning-bg text-warning-text">
              {donnees.recap.retard} retard{donnees.recap.retard > 1 ? 's' : ''} · {donnees.seances.length > 0 ? Math.round((donnees.recap.retard / donnees.seances.length) * 100) : 0}%
            </span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-danger-bg text-danger-text">
              {donnees.recap.absent} absent{donnees.recap.absent > 1 ? 's' : ''} · {donnees.seances.length > 0 ? Math.round((donnees.recap.absent / donnees.seances.length) * 100) : 0}%
            </span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-info-bg text-info-text">
              {donnees.recap.permissionnaire} permission{donnees.recap.permissionnaire > 1 ? 's' : ''} · {donnees.seances.length > 0 ? Math.round((donnees.recap.permissionnaire / donnees.seances.length) * 100) : 0}%
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Détail par séance</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {donnees.seances.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-4 sm:px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">{s.titre}</p>
                  <p className="text-xs text-gray-400">{new Date(s.date_seance).toLocaleString('fr-FR')}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STYLES_STATUT[s.statut]}`}>
                  {LABELS_STATUT[s.statut]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MembreDetail;