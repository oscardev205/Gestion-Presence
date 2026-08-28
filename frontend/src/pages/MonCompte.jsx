import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Lock, Eye, EyeOff, KeyRound, User, Save } from 'lucide-react';
import api from '../api';

function MonCompte() {
  const adminStocke = JSON.parse(localStorage.getItem('admin'));
  const [admin, setAdmin] = useState(adminStocke);
  const [nom, setNom] = useState(adminStocke?.nom || '');
  const [messageNom, setMessageNom] = useState('');
  const [messageNomErreur, setMessageNomErreur] = useState(false);

  const [ancienMotDePasse, setAncienMotDePasse] = useState('');
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('');
  const [confirmationMotDePasse, setConfirmationMotDePasse] = useState('');
  const [voirMotsDePasse, setVoirMotsDePasse] = useState(false);
  const [message, setMessage] = useState('');
  const [messageErreur, setMessageErreur] = useState(false);

  const handleSubmitNom = async (e) => {
    e.preventDefault();
    setMessageNom('');

    try {
      const reponse = await api.patch('/auth/profil', { nom });
      const adminMisAJour = { ...admin, nom: reponse.data.nom };
      localStorage.setItem('admin', JSON.stringify(adminMisAJour));
      setAdmin(adminMisAJour);
      setMessageNom('Nom mis à jour');
      setMessageNomErreur(false);
    } catch (err) {
      setMessageNom(err.response ? err.response.data.message : 'Erreur lors de la mise à jour');
      setMessageNomErreur(true);
    }
  };

  const handleSubmitMotDePasse = async (e) => {
    e.preventDefault();
    setMessage('');

    if (nouveauMotDePasse !== confirmationMotDePasse) {
      setMessage('La confirmation ne correspond pas au nouveau mot de passe');
      setMessageErreur(true);
      return;
    }

    try {
      await api.patch('/auth/mot-de-passe', { ancienMotDePasse, nouveauMotDePasse });
      setMessage('Mot de passe mis à jour avec succès');
      setMessageErreur(false);
      setAncienMotDePasse('');
      setNouveauMotDePasse('');
      setConfirmationMotDePasse('');
    } catch (err) {
      setMessage(err.response ? err.response.data.message : 'Erreur lors de la mise à jour');
      setMessageErreur(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-400 px-4 sm:px-6 pt-6 pb-14">
        <div className="max-w-xl mx-auto">
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-primary-50 text-xs mb-3 hover:text-white transition">
            <ArrowLeft size={14} /> Retour au dashboard
          </Link>
          <h1 className="text-white text-xl sm:text-2xl font-semibold tracking-tight">Mon compte</h1>
          <p className="text-primary-50 text-sm mt-1">{admin?.nom} · {admin?.email}</p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 sm:px-6 -mt-8 anim-apparition space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-2">
            <User className="text-primary-600" size={18} />
            <h2 className="text-sm font-semibold text-gray-800">Nom et prénom</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">Le nom affiché sur ton compte administrateur.</p>

          <form onSubmit={handleSubmitNom} className="space-y-4">
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
            />

            {messageNom && (
              <p className={`text-sm rounded-lg px-3 py-2 anim-apparition ${messageNomErreur ? 'text-danger-text bg-danger-bg' : 'text-success-text bg-success-bg'}`}>
                {messageNom}
              </p>
            )}

            <button
              type="submit"
              className="flex items-center justify-center gap-1.5 w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:opacity-90 active:scale-[0.98] transition"
            >
              <Save size={16} /> Enregistrer le nom
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-2">
            <KeyRound className="text-primary-600" size={18} />
            <h2 className="text-sm font-semibold text-gray-800">Changer le mot de passe</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">Choisis un nouveau mot de passe d'au moins 6 caractères.</p>

          <form onSubmit={handleSubmitMotDePasse} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type={voirMotsDePasse ? 'text' : 'password'}
                value={ancienMotDePasse}
                onChange={(e) => setAncienMotDePasse(e.target.value)}
                placeholder="Mot de passe actuel"
                required
                className="w-full pl-9 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
              />
              <button
                type="button"
                onClick={() => setVoirMotsDePasse(!voirMotsDePasse)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
              >
                {voirMotsDePasse ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type={voirMotsDePasse ? 'text' : 'password'}
                value={nouveauMotDePasse}
                onChange={(e) => setNouveauMotDePasse(e.target.value)}
                placeholder="Nouveau mot de passe"
                required
                minLength={6}
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type={voirMotsDePasse ? 'text' : 'password'}
                value={confirmationMotDePasse}
                onChange={(e) => setConfirmationMotDePasse(e.target.value)}
                placeholder="Confirmer le nouveau mot de passe"
                required
                minLength={6}
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
              />
            </div>

            {message && (
              <p className={`text-sm rounded-lg px-3 py-2 anim-apparition ${messageErreur ? 'text-danger-text bg-danger-bg' : 'text-success-text bg-success-bg'}`}>
                {message}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-primary-900 to-primary-400 text-white font-medium rounded-xl hover:opacity-90 active:scale-[0.98] transition"
            >
              Mettre à jour le mot de passe
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default MonCompte;