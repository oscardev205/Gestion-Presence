import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { IdCard, Shield } from 'lucide-react';
import api from '../api';

function ConnexionMembre() {
  const [identifiant, setIdentifiant] = useState('');
  const [organisations, setOrganisations] = useState(null);
  const [organisationChoisie, setOrganisationChoisie] = useState('');
  const [erreur, setErreur] = useState('');
  const navigate = useNavigate();

  const tenterConnexion = async (organisationId) => {
    setErreur('');
    try {
      const reponse = await api.post('/membre-auth/connexion', {
        identifiant,
        organisationId: organisationId || undefined,
      });
      localStorage.setItem('tokenMembre', reponse.data.token);
      localStorage.setItem('membreInfo', JSON.stringify(reponse.data.membre));
      navigate('/mon-espace');
    } catch (err) {
      if (err.response && err.response.status === 300) {
        setOrganisations(err.response.data.organisations);
      } else if (err.response) {
        setErreur(err.response.data.message);
      } else {
        setErreur('Impossible de contacter le serveur');
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    tenterConnexion();
  };

  const handleChoixOrganisation = (e) => {
    e.preventDefault();
    tenterConnexion(organisationChoisie);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm anim-apparition">
        <div className="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-400 rounded-t-3xl px-8 pt-10 pb-16 text-center">
          <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Shield className="text-white" size={24} />
          </div>
          <h1 className="text-white text-2xl font-semibold tracking-tight">Espace membre</h1>
          <p className="text-primary-50 text-sm mt-1">Consulte ta présence</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg px-6 py-8 -mt-8 relative">
          {!organisations ? (
            <>
              <h2 className="text-center text-lg font-semibold text-gray-900 tracking-tight mb-6">Se connecter</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={identifiant}
                    onChange={(e) => setIdentifiant(e.target.value)}
                    placeholder="Ex : VB-10"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
                  />
                </div>

                {erreur && (
                  <p className="text-sm text-danger-text bg-danger-bg rounded-lg px-3 py-2 anim-apparition">{erreur}</p>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-primary-900 to-primary-400 text-white font-medium rounded-xl hover:opacity-90 active:scale-[0.98] transition"
                >
                  Se connecter
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-center text-lg font-semibold text-gray-900 tracking-tight mb-2">Précise ton organisation</h2>
              <p className="text-sm text-gray-500 text-center mb-6">Plusieurs organisations utilisent cet identifiant.</p>
              <form onSubmit={handleChoixOrganisation} className="space-y-4">
                <select
                  value={organisationChoisie}
                  onChange={(e) => setOrganisationChoisie(e.target.value)}
                  required
                  className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
                >
                  <option value="" disabled>Choisir</option>
                  {organisations.map((o) => (
                    <option key={o.id} value={o.id}>{o.nom}</option>
                  ))}
                </select>

                {erreur && (
                  <p className="text-sm text-danger-text bg-danger-bg rounded-lg px-3 py-2 anim-apparition">{erreur}</p>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-primary-900 to-primary-400 text-white font-medium rounded-xl hover:opacity-90 active:scale-[0.98] transition"
                >
                  Continuer
                </button>
              </form>
            </>
          )}

          <p className="text-center text-sm text-gray-500 mt-6">
            <Link to="/connexion" className="text-primary-600 font-medium hover:underline">
              Espace administrateur
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ConnexionMembre;