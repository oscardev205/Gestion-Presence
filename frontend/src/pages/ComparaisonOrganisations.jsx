import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Building2, BarChart3 } from 'lucide-react';
import api from '../api';

function ComparaisonOrganisations() {
  const [organisations, setOrganisations] = useState([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    const charger = async () => {
      try {
        const reponse = await api.get('/organisations/comparaison');
        setOrganisations(reponse.data);
      } finally {
        setChargement(false);
      }
    };
    charger();
  }, []);

  const couleurBarre = (taux) => (taux < 50 ? 'bg-danger-text' : taux < 80 ? 'bg-warning-text' : 'bg-success-text');

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-400 px-4 sm:px-6 pt-6 pb-14">
        <div className="max-w-2xl mx-auto">
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-primary-50 text-xs mb-3 hover:text-white transition">
            <ArrowLeft size={14} /> Retour au dashboard
          </Link>
          <h1 className="text-white text-xl sm:text-2xl font-semibold tracking-tight">Vue comparative</h1>
          <p className="text-primary-50 text-sm mt-1">Toutes tes organisations, côte à côte</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 -mt-8 anim-apparition">
        {chargement ? (
          <p className="text-sm text-gray-400 text-center py-8">Chargement...</p>
        ) : organisations.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <BarChart3 className="text-gray-300 mx-auto mb-3" size={32} />
            <p className="text-sm text-gray-400">Aucune organisation pour l'instant.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {organisations.map((org) => (
              <div key={org.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center shrink-0">
                      <Building2 className="text-primary-600" size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{org.nom}</p>
                      <p className="text-xs text-gray-400">{org.type === 'ecole' ? 'École' : 'Association'}</p>
                    </div>
                  </div>
                  <span className="text-lg font-semibold text-gray-800">{org.tauxMoyen}%</span>
                </div>

                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full ${couleurBarre(org.tauxMoyen)} transition-all duration-500`}
                    style={{ width: `${org.tauxMoyen}%` }}
                  ></div>
                </div>

                <div className="flex gap-2">
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                    {org.nombreMembres} membre{org.nombreMembres > 1 ? 's' : ''}
                  </span>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                    {org.nombreSeances} séance{org.nombreSeances > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ComparaisonOrganisations;