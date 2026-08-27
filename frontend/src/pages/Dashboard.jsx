import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, Users, CalendarClock, History, BarChart3, Settings, ClipboardCheck, ChevronDown } from 'lucide-react';
import api from '../api';

function Dashboard() {
  const admin = JSON.parse(localStorage.getItem('admin'));
  const [organisations, setOrganisations] = useState([]);
  const [organisationActive, setOrganisationActive] = useState(
    JSON.parse(localStorage.getItem('organisationActive')) || null
  );
  const [chargement, setChargement] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const chargerOrganisations = async () => {
      try {
        const reponse = await api.get('/organisations');
        setOrganisations(reponse.data);

        if (!organisationActive && reponse.data.length > 0) {
          setOrganisationActive(reponse.data[0]);
          localStorage.setItem('organisationActive', JSON.stringify(reponse.data[0]));
        }
      } catch (err) {
        if (err.response && err.response.status === 401) {
          navigate('/connexion');
        }
      } finally {
        setChargement(false);
      }
    };

    chargerOrganisations();
  }, []);

  const changerOrganisation = (e) => {
    const org = organisations.find((o) => o.id === Number(e.target.value));
    setOrganisationActive(org);
    localStorage.setItem('organisationActive', JSON.stringify(org));
  };

  const initiales = admin?.nom
    ? admin.nom.split(' ').map((mot) => mot[0]).slice(0, 2).join('').toUpperCase()
    : '';

  if (chargement) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Chargement...</p>
      </div>
    );
  }

  if (organisations.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center anim-apparition">
          <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="text-primary-600" size={26} />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 tracking-tight mb-2">Bienvenue {admin?.nom}</h2>
          <p className="text-sm text-gray-500 mb-6">Tu n'as pas encore d'organisation. Crée la première pour commencer.</p>
          <Link
            to="/organisation/nouvelle"
            className="inline-block w-full py-3 bg-gradient-to-r from-primary-900 to-primary-400 text-white font-medium rounded-xl hover:opacity-90 active:scale-[0.98] transition"
          >
            Créer une organisation
          </Link>
        </div>
      </div>
    );
  }

  const boutons = [
    { to: '/membres', label: 'Membres', icone: Users },
    { to: '/seance/nouvelle', label: 'Nouvelle séance', icone: CalendarClock },
    { to: '/historique', label: 'Historique', icone: History },
    { to: '/statistiques', label: 'Statistiques', icone: BarChart3 },
    { to: '/reglages', label: 'Réglages', icone: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-400 px-4 sm:px-6 pt-8 pb-16">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary-50 text-xs mb-1">
              <ClipboardCheck size={14} />
              <span>Gestion de présence</span>
            </div>
            <h1 className="text-white text-xl sm:text-2xl font-semibold tracking-tight">Bonjour {admin?.nom}</h1>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-white text-sm font-medium shrink-0">
            {initiales}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 -mt-10 anim-apparition">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5">
          <label className="text-xs text-gray-500 mb-1.5 block">Organisation active</label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-600" size={18} />
            <select
              value={organisationActive?.id}
              onChange={changerOrganisation}
              className="w-full pl-10 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
            >
              {organisations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.nom} ({org.type === 'ecole' ? 'École' : 'Association'})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Sigle : <span className="text-gray-600 font-medium">{organisationActive?.sigle}</span>
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
          {boutons.map(({ to, label, icone: Icone }) => (
            <Link
              key={to}
              to={to}
              className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col items-center gap-2 text-center hover:border-primary-200 hover:shadow-sm active:scale-[0.97] transition"
            >
              <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center">
                <Icone className="text-primary-600" size={18} />
              </div>
              <span className="text-xs font-medium text-gray-700">{label}</span>
            </Link>
          ))}
        </div>

        <Link
          to="/organisation/nouvelle"
          className="block text-center text-sm text-primary-600 font-medium mt-6 hover:underline"
        >
          + Créer une autre organisation
        </Link>
      </div>
    </div>
  );
}

export default Dashboard;