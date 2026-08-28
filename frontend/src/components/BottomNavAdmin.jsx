import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutGrid, CalendarClock, Users, BarChart3 } from 'lucide-react';
import api from '../api';

function BottomNavAdmin() {
  const navigate = useNavigate();

  const allerSeance = async () => {
    const organisationActive = JSON.parse(localStorage.getItem('organisationActive') || 'null');
    if (!organisationActive) {
      navigate('/dashboard');
      return;
    }
    try {
      const reponse = await api.get('/seances', { params: { organisationId: organisationActive.id } });
      const seanceActive = reponse.data.find((s) => !s.cloturee);
      if (seanceActive) {
        navigate(`/pointage/${seanceActive.id}`);
      } else {
        navigate('/seance/nouvelle');
      }
    } catch (err) {
      navigate('/seance/nouvelle');
    }
  };

  const lienClasse = ({ isActive }) =>
    `flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg transition ${isActive ? 'text-primary-600' : 'text-gray-400'}`;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex items-center justify-around py-2 z-40">
      <NavLink to="/dashboard" className={lienClasse}>
        <LayoutGrid size={20} />
        <span className="text-[10px] font-medium">Tableau</span>
      </NavLink>
      <button onClick={allerSeance} className="flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg transition text-gray-400">
        <CalendarClock size={20} />
        <span className="text-[10px] font-medium">Séance</span>
      </button>
      <NavLink to="/membres" className={lienClasse}>
        <Users size={20} />
        <span className="text-[10px] font-medium">Membres</span>
      </NavLink>
      <NavLink to="/statistiques" className={lienClasse}>
        <BarChart3 size={20} />
        <span className="text-[10px] font-medium">Stats</span>
      </NavLink>
    </div>
  );
}

export default BottomNavAdmin;