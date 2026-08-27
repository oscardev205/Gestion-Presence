import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Save, ListOrdered, UserPlus, Trash2, Users } from 'lucide-react';
import api from '../api';

function ReglagesOrganisation() {
  const organisationActive = JSON.parse(localStorage.getItem('organisationActive'));
  const [roles, setRoles] = useState((organisationActive?.roles_hierarchie || []).join('\n'));
  const [message, setMessage] = useState('');
  const [responsables, setResponsables] = useState([]);
  const [nomResponsable, setNomResponsable] = useState('');
  const [emailResponsable, setEmailResponsable] = useState('');
  const [motDePasseResponsable, setMotDePasseResponsable] = useState('');
  const [messageResponsable, setMessageResponsable] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    const rolesHierarchie = roles
      .split('\n')
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    try {
      const reponse = await api.patch(`/organisations/${organisationActive.id}/roles-hierarchie`, { rolesHierarchie });
      localStorage.setItem('organisationActive', JSON.stringify(reponse.data));
      setMessage('Enregistré');
    } catch (err) {
      setMessage('Erreur lors de l\'enregistrement');
    }
  };

  const chargerResponsables = async () => {
    try {
      const reponse = await api.get(`/responsables/organisation/${organisationActive.id}`);
      setResponsables(reponse.data);
    } catch (err) {
      // silencieux, pas critique
    }
  };

  useEffect(() => {
    if (organisationActive) chargerResponsables();
  }, []);

  const ajouterResponsable = async (e) => {
    e.preventDefault();
    setMessageResponsable('');

    try {
      await api.post('/responsables/creer', {
        organisationId: organisationActive.id,
        nom: nomResponsable,
        email: emailResponsable,
        motDePasse: motDePasseResponsable,
      });
      setNomResponsable('');
      setEmailResponsable('');
      setMotDePasseResponsable('');
      chargerResponsables();
    } catch (err) {
      setMessageResponsable(err.response ? err.response.data.message : 'Erreur lors de la création');
    }
  };

  const supprimerResponsable = async (id) => {
    const confirmation = window.confirm('Supprimer ce responsable ? Il ne pourra plus se connecter.');
    if (!confirmation) return;

    try {
      await api.delete(`/responsables/${id}`);
      chargerResponsables();
    } catch (err) {
      setMessageResponsable('Erreur lors de la suppression');
    }
  };

  if (!organisationActive) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <p className="text-sm text-gray-500">Sélectionne d'abord une organisation depuis le dashboard.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-400 px-4 sm:px-6 pt-6 pb-14">
        <div className="max-w-xl mx-auto">
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-primary-50 text-xs mb-3 hover:text-white transition">
            <ArrowLeft size={14} /> Retour au dashboard
          </Link>
          <h1 className="text-white text-xl sm:text-2xl font-semibold tracking-tight">Réglages</h1>
          <p className="text-primary-50 text-sm mt-1">{organisationActive.nom}</p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 sm:px-6 -mt-8 anim-apparition">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-2">
            <ListOrdered className="text-primary-600" size={18} />
            <h2 className="text-sm font-semibold text-gray-800">
              {organisationActive.type === 'ecole' ? 'Classes de l\'école' : 'Hiérarchie des rôles'}
            </h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            {organisationActive.type === 'ecole'
              ? 'Une classe par ligne (ex : 6ème A, 5ème B). Elles serviront à filtrer les séances et les membres.'
              : 'Un rôle par ligne, du plus haut au plus bas. Les membres seront triés selon cet ordre dans les listes et les exports.'}
          </p>
          <form onSubmit={handleSubmit}>
            <textarea
              value={roles}
              onChange={(e) => setRoles(e.target.value)}
              placeholder={organisationActive.type === 'ecole' ? '6ème A\n6ème B\n5ème A\n5ème B' : 'Président\nVice-président\nSecrétaire\nTrésorier\nMembre'}
              rows={8}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition resize-none"
            />
            {message && (
              <p className="text-sm text-success-text bg-success-bg rounded-lg px-3 py-2 mt-3 anim-apparition">{message}</p>
            )}
            <button
              type="submit"
              className="flex items-center justify-center gap-1.5 w-full mt-4 py-3 bg-gradient-to-r from-primary-900 to-primary-400 text-white font-medium rounded-xl hover:opacity-90 active:scale-[0.98] transition"
            >
              <Save size={16} /> Enregistrer
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 mt-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="text-primary-600" size={18} />
            <h2 className="text-sm font-semibold text-gray-800">Responsables</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Un responsable peut se connecter pour pointer les présences, sans accès aux réglages ni à la gestion des membres.
          </p>

          <form onSubmit={ajouterResponsable} className="space-y-3 mb-4">
            <input
              type="text"
              placeholder="Nom"
              value={nomResponsable}
              onChange={(e) => setNomResponsable(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
            />
            <input
              type="email"
              placeholder="Email"
              value={emailResponsable}
              onChange={(e) => setEmailResponsable(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
            />
            <input
              type="password"
              placeholder="Mot de passe"
              value={motDePasseResponsable}
              onChange={(e) => setMotDePasseResponsable(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
            />
            {messageResponsable && (
              <p className="text-sm text-danger-text bg-danger-bg rounded-lg px-3 py-2 anim-apparition">{messageResponsable}</p>
            )}
            <button
              type="submit"
              className="flex items-center justify-center gap-1.5 w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:opacity-90 active:scale-[0.98] transition"
            >
              <UserPlus size={16} /> Ajouter un responsable
            </button>
          </form>

          {responsables.length > 0 && (
            <div className="space-y-2">
              {responsables.map((r) => (
                <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{r.nom}</p>
                    <p className="text-xs text-gray-400">{r.email}</p>
                  </div>
                  <button onClick={() => supprimerResponsable(r.id)} className="text-gray-400 hover:text-danger-text transition">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReglagesOrganisation;