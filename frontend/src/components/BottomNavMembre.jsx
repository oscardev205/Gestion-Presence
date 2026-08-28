import { NavLink } from 'react-router-dom';
import { Home, Camera, History, User } from 'lucide-react';

const items = [
  { to: '/mon-espace', label: 'Accueil', icone: Home },
  { to: '/membre/scanner', label: 'Scanner', icone: Camera },
  { to: '/membre/historique', label: 'Historique', icone: History },
  { to: '/membre/profil', label: 'Profil', icone: User },
];

function BottomNavMembre() {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex items-center justify-around py-2 z-40">
      {items.map(({ to, label, icone: Icone }) => (
        <NavLink
          key={to}
          to={to}
          end
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg transition ${
              isActive ? 'text-primary-600' : 'text-gray-400'
            }`
          }
        >
          <Icone size={20} />
          <span className="text-[10px] font-medium">{label}</span>
        </NavLink>
      ))}
    </div>
  );
}

export default BottomNavMembre;