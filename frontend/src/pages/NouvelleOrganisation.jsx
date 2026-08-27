import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, Tag, ArrowLeft } from 'lucide-react';
import api from '../api';

function NouvelleOrganisation() {
  const [nom, setNom] = useState('');
  const [type, setType] = useState('ecole');
  const [sigle, setSigle] = useState('');
  const [erreur, setErreur] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur('');

    try {
      const reponse = await api.post('/organisations', { nom, type, sigle });
      localStorage.setItem('organisationActive', JSON.stringify(reponse.data));
      navigate('/dashboard');
    } catch (err) {
      if (err.response) {
        setErreur(err.response.data.message);
      } else {
        setErreur('Impossible de contacter le serveur');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm anim-apparition">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-gray-500 text-xs mb-3 hover:text-gray-700 transition">
          <ArrowLeft size={14} /> Retour au dashboard
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-7">
          <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center mb-4">
            <Building2 className="text-primary-600" size={22} />
          </div>
          <h1 className="text-lg font-semibold text-gray-900 tracking-tight mb-1">Créer une organisation</h1>
          <p className="text-sm text-gray-500 mb-6">Une école ou une association, gérée depuis ton compte.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nom de l'organisation</label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType('ecole')}
                  className={`py-2.5 rounded-xl text-sm font-medium border transition ${
                    type === 'ecole'
                      ? 'bg-primary-50 border-primary-200 text-primary-800'
                      : 'bg-gray-50 border-gray-200 text-gray-500'
                  }`}
                >
                  École
                </button>
                <button
                  type="button"
                  onClick={() => setType('association')}
                  className={`py-2.5 rounded-xl text-sm font-medium border transition ${
                    type === 'association'
                      ? 'bg-primary-50 border-primary-200 text-primary-800'
                      : 'bg-gray-50 border-gray-200 text-gray-500'
                  }`}
                >
                  Association
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Sigle (ex : VB)</label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  value={sigle}
                  onChange={(e) => setSigle(e.target.value)}
                  maxLength={10}
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
                />
              </div>
            </div>

            {erreur && (
              <p className="text-sm text-danger-text bg-danger-bg rounded-lg px-3 py-2 anim-apparition">{erreur}</p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-primary-900 to-primary-400 text-white font-medium rounded-xl hover:opacity-90 active:scale-[0.98] transition"
            >
              Créer
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default NouvelleOrganisation;