import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import apiResponsable from '../apiResponsable';

function MembresResponsable() {
  const responsable = JSON.parse(localStorage.getItem('responsableInfo'));
  const [membres, setMembres] = useState([]);
  const [recherche, setRecherche] = useState('');
  const [chargement, setChargement] = useState(true);

  const chargerMembres = async (texteRecherche = '') => {
    try {
      const reponse = await apiResponsable.get('/membres', {
        params: { organisationId: responsable.organisationId, recherche: texteRecherche || undefined },
      });
      setMembres(reponse.data);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerMembres();
  }, []);

  const handleRecherche = (e) => {
    const valeur = e.target.value;
    setRecherche(valeur);
    chargerMembres(valeur);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-400 px-4 sm:px-6 pt-6 pb-14">
        <div className="max-w-2xl mx-auto">
          <Link to="/responsable/dashboard" className="inline-flex items-center gap-1 text-primary-50 text-xs mb-3 hover:text-white transition">
            <ArrowLeft size={14} /> Retour
          </Link>
          <h1 className="text-white text-xl sm:text-2xl font-semibold tracking-tight">Membres</h1>
          <p className="text-primary-50 text-sm mt-1">{responsable.organisationNom}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 -mt-8 anim-apparition">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Rechercher par nom ou identifiant"
            value={recherche}
            onChange={handleRecherche}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
          />
        </div>

        {chargement ? (
          <p className="text-sm text-gray-400 text-center py-8">Chargement...</p>
        ) : membres.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Aucun membre.</p>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs">
                    <th className="text-left font-medium px-4 py-3">Identifiant</th>
                    <th className="text-left font-medium px-4 py-3">Nom</th>
                    <th className="text-left font-medium px-4 py-3">
                      {responsable.organisationType === 'ecole' ? 'Classe' : 'Rôle'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {membres.map((m) => (
                    <tr key={m.id} className={`border-t border-gray-100 ${m.statut === 'suspendu' ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3 font-medium text-gray-700">{m.identifiant}</td>
                      <td className="px-4 py-3 text-gray-700">{m.nom}</td>
                      <td className="px-4 py-3 text-gray-500">{m.role || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MembresResponsable;