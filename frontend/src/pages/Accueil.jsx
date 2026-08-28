import { Link } from 'react-router-dom';
import { QrCode, Users, FileDown, ShieldCheck, Building2, ArrowRight, LogOut } from 'lucide-react';
import Logo from '../components/Logo';

function Accueil() {
  const admin = JSON.parse(localStorage.getItem('admin') || 'null');
  const token = localStorage.getItem('token');
  const estConnecte = admin && token;

  const deconnexion = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
    localStorage.removeItem('organisationActive');
    window.location.reload();
  };

  const fonctionnalites = [
    { icone: QrCode, titre: 'Pointage par QR code', description: 'Chaque membre a son propre QR, et chaque séance aussi. Le pointage se fait en quelques secondes.' },
    { icone: Building2, titre: 'Écoles et associations', description: 'Gérez plusieurs organisations depuis un seul compte, avec classes ou rôles selon le type.' },
    { icone: FileDown, titre: 'Rapports exportables', description: 'Statistiques et présence détaillées, exportables en PDF, Excel ou Word, protégées contre les modifications.' },
    { icone: Users, titre: 'Espaces séparés', description: 'Un espace pour l\'administrateur, un pour les responsables délégués, un pour les membres.' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-400 px-4 sm:px-6 pt-10 pb-20">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex justify-center mb-4">
            <Logo size={64} lien="/" />
          </div>

          {estConnecte ? (
            <>
              <h1 className="text-white text-2xl sm:text-4xl font-semibold tracking-tight mb-3">
                Content de te revoir, {admin.nom}
              </h1>
              <p className="text-primary-50 text-sm sm:text-base max-w-xl mx-auto mb-8">
                Reprends où tu t'étais arrêté, ou déconnecte-toi si ce n'est pas ton appareil.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  to="/dashboard"
                  className="px-6 py-3 bg-white text-primary-800 font-medium rounded-xl hover:opacity-90 active:scale-[0.98] transition"
                >
                  Aller au tableau de bord
                </Link>
                <button
                  onClick={deconnexion}
                  className="flex items-center gap-1.5 px-6 py-3 bg-white/15 text-white font-medium rounded-xl hover:bg-white/25 active:scale-[0.98] transition"
                >
                  <LogOut size={16} /> Se déconnecter
                </button>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-white text-2xl sm:text-4xl font-semibold tracking-tight mb-3">
                La gestion de présence, simplifiée
              </h1>
              <p className="text-primary-50 text-sm sm:text-base max-w-xl mx-auto mb-8">
                Une plateforme pensée pour les écoles et les associations : pointage par QR code, suivi en temps réel, et rapports prêts à l'emploi.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  to="/connexion"
                  className="px-6 py-3 bg-white text-primary-800 font-medium rounded-xl hover:opacity-90 active:scale-[0.98] transition"
                >
                  Se connecter
                </Link>
                <Link
                  to="/inscription"
                  className="px-6 py-3 bg-white/15 text-white font-medium rounded-xl hover:bg-white/25 active:scale-[0.98] transition"
                >
                  Créer un compte
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-10 anim-apparition">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {fonctionnalites.map(({ icone: Icone, titre, description }) => (
            <div key={titre} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center mb-3">
                <Icone className="text-primary-600" size={20} />
              </div>
              <h3 className="text-sm font-semibold text-gray-800 mb-1">{titre}</h3>
              <p className="text-sm text-gray-500">{description}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-10 flex items-center gap-4">
          <div className="w-11 h-11 bg-success-bg rounded-xl flex items-center justify-center shrink-0">
            <ShieldCheck className="text-success-text" size={22} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Vos données restent les vôtres</p>
            <p className="text-sm text-gray-500">Chaque organisation est isolée, vos membres et vos séances ne sont visibles que par vous.</p>
          </div>
        </div>

        {!estConnecte && (
          <div className="text-center mb-10">
            <Link to="/espace-membre/connexion" className="inline-flex items-center gap-1.5 text-sm text-primary-600 font-medium hover:underline">
              Tu es membre d'une organisation ? Accède à ton espace <ArrowRight size={14} />
            </Link>
          </div>
        )}

        <footer className="border-t border-gray-200 py-8 text-center">
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
            <Link to="/faq" className="hover:text-primary-600 transition">FAQ</Link>
            <Link to="/contact" className="hover:text-primary-600 transition">Contact</Link>
            <Link to="/politique-confidentialite" className="hover:text-primary-600 transition">Politique de confidentialité</Link>
            <Link to="/conditions-utilisation" className="hover:text-primary-600 transition">Conditions d'utilisation</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default Accueil;