import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CalendarClock, Clock, Timer, ArrowLeft } from 'lucide-react';
import api from '../api';

function NouvelleSeance() {
  const organisationActive = JSON.parse(localStorage.getItem('organisationActive'));
  const [titre, setTitre] = useState('');
  const [dateSeance, setDateSeance] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [margeRetard, setMargeRetard] = useState(10);
  const [classesChoisies, setClassesChoisies] = useState([]);
  const [erreur, setErreur] = useState('');
  const navigate = useNavigate();

  const basculerClasse = (c) => {
    setClassesChoisies((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur('');

    try {
      const reponse = await api.post('/seances', {
        organisationId: organisationActive.id,
        titre,
        dateSeance: new Date(dateSeance).toISOString(),
        margeRetardMinutes: Number(margeRetard),
        classes: classesChoisies,
        heureFin: dateFin ? new Date(dateFin).toISOString() : undefined,
      });
      navigate(`/pointage/${reponse.data.id}`);
    } catch (err) {
      if (err.response) {
        setErreur(err.response.data.message);
      } else {
        setErreur('Impossible de contacter le serveur');
      }
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm anim-apparition">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-gray-500 text-xs mb-3 hover:text-gray-700 transition">
          <ArrowLeft size={14} /> Retour au dashboard
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-7">
          <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center mb-4">
            <CalendarClock className="text-primary-600" size={22} />
          </div>
          <h1 className="text-lg font-semibold text-gray-900 tracking-tight mb-1">Nouvelle séance</h1>
          <p className="text-sm text-gray-500 mb-6">{organisationActive.nom}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Titre</label>
              <input
                type="text"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Date et heure</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="datetime-local"
                  value={dateSeance}
                  onChange={(e) => setDateSeance(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Heure de fin (optionnel)</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="datetime-local"
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
                />
              </div>
            </div>

            {organisationActive.type === 'ecole' && (organisationActive.roles_hierarchie || []).length > 0 && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Classes concernées {classesChoisies.length === 0 && <span className="text-gray-400">(aucune sélectionnée = toute l'école)</span>}
                </label>
                <div className="flex flex-wrap gap-2">
                  {organisationActive.roles_hierarchie.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => basculerClasse(c)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                        classesChoisies.includes(c)
                          ? 'bg-primary-50 border-primary-200 text-primary-800'
                          : 'bg-gray-50 border-gray-200 text-gray-500'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Marge de retard (minutes)</label>
              <div className="relative">
                <Timer className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="number"
                  value={margeRetard}
                  onChange={(e) => setMargeRetard(e.target.value)}
                  min={0}
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
              Créer et démarrer le pointage
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default NouvelleSeance;