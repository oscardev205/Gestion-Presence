import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ClipboardCheck } from 'lucide-react';
import api from '../api';

function Connexion() {
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [voirMotDePasse, setVoirMotDePasse] = useState(false);
    const [resterConnecte, setResterConnecte] = useState(false);
  const [erreur, setErreur] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur('');

    try {
      const reponse = await api.post('/auth/connexion', { email, motDePasse, resterConnecte });
      localStorage.setItem('token', reponse.data.token);
      localStorage.setItem('admin', JSON.stringify(reponse.data.admin));
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
        <div className="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-400 rounded-t-3xl px-8 pt-10 pb-16 text-center">
          <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <ClipboardCheck className="text-white" size={24} />
          </div>
          <h1 className="text-white text-2xl font-semibold tracking-tight">Connexion</h1>
          <p className="text-primary-50 text-sm mt-1">Gestion de présence</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg px-6 py-8 -mt-8 relative">
          <h2 className="text-center text-lg font-semibold text-gray-900 tracking-tight mb-6">Se connecter</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Adresse email"
                required
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type={voirMotDePasse ? 'text' : 'password'}
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                placeholder="Mot de passe"
                required
                className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
              />
              <button
                type="button"
                onClick={() => setVoirMotDePasse(!voirMotDePasse)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
              >
                {voirMotDePasse ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
                        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={resterConnecte}
                onChange={(e) => setResterConnecte(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-400"
              />
              Rester connecté
            </label>

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

          <p className="text-center text-sm text-gray-500 mt-6">
            Pas encore de compte ?{' '}
            <Link to="/inscription" className="text-primary-600 font-medium hover:underline">
              S'inscrire
            </Link>
          </p>
          <p className="text-center text-sm text-gray-500 mt-2">
            Tu es membre ?{' '}
            <Link to="/espace-membre/connexion" className="text-primary-600 font-medium hover:underline">
              Accède à ton espace
            </Link>
          </p>
                    <p className="text-center text-sm text-gray-500 mt-2">
            Tu es responsable ?{' '}
            <Link to="/responsable/connexion" className="text-primary-600 font-medium hover:underline">
              Accède à ton espace
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Connexion;