import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogOut, ArrowRight, CalendarDays, Users } from 'lucide-react';
import apiResponsable from '../apiResponsable';

function DashboardResponsable() {
  const responsable = JSON.parse(localStorage.getItem('responsableInfo'));
  const [seances, setSeances] = useState([]);
  const [chargement, setChargement] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const charger = async () => {
      try {
        const reponse = await apiResponsable.get('/seances', {
          params: { organisationId: responsable.organisationId },
        });
        setSeances(reponse.data);
      } catch (err) {
        if (err.response && err.response.status === 401) {
          navigate('/responsable/connexion');
        }
      } finally {
        setChargement(false);
      }
    };
    charger();
  }, []);

  const deconnexion = () => {
    localStorage.removeItem('tokenResponsable');
    localStorage.removeItem('responsableInfo');
    navigate('/responsable/connexion');
  };

  if (!responsable) {
    navigate('/responsable/connexion');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-400 px-4 sm:px-6 pt-6 pb-14">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-white text-xl sm:text-2xl font-semibold tracking-tight">Bonjour {responsable.nom}</h1>
            <p className="text-primary-50 text-sm mt-1">{responsable.organisationNom}</p>
          </div>
          <button
            onClick={deconnexion}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/15 text-white text-xs font-medium rounded-lg hover:bg-white/25 transition shrink-0"
          >
            <LogOut size={14} /> Quitter
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 -mt-8 anim-apparition">
        <Link
          to="/responsable/membres"
          className="flex items-center gap-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4 hover:border-primary-200 transition"
        >
          <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center">
            <Users className="text-primary-600" size={18} />
          </div>
          <span className="text-sm font-medium text-gray-700">Consulter les membres</span>
          <ArrowRight className="text-gray-300 ml-auto" size={18} />
        </Link>

        <h2 className="text-sm font-semibold text-gray-700 mb-3 px-1">Séances</h2>

        {chargement ? (
          <p className="text-sm text-gray-400 text-center py-8">Chargement...</p>
        ) : seances.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <CalendarDays className="text-gray-300 mx-auto mb-3" size={32} />
            <p className="text-sm text-gray-400">Aucune séance pour l'instant.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {seances.map((s) => (
              <Link
                key={s.id}
                to={`/responsable/pointage/${s.id}`}
                className="block bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 hover:border-primary-200 hover:shadow-md active:scale-[0.99] transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{s.titre}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(s.date_seance).toLocaleString('fr-FR')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.cloturee && (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">Clôturée</span>
                    )}
                    <ArrowRight className="text-gray-300" size={18} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardResponsable;