import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

function ConditionsUtilisation() {
  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-400 px-4 sm:px-6 pt-6 pb-14">
        <div className="max-w-2xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-1 text-primary-50 text-xs mb-3 hover:text-white transition">
            <ArrowLeft size={14} /> Retour à l'accueil
          </Link>
          <h1 className="text-white text-xl sm:text-2xl font-semibold tracking-tight">Conditions d'utilisation</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 -mt-8 anim-apparition">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-7 space-y-5 text-sm text-gray-600 leading-relaxed">
          <p>En créant un compte et en utilisant cette plateforme, tu acceptes les conditions suivantes.</p>

          <div>
            <h2 className="text-sm font-semibold text-gray-800 mb-2">Utilisation du service</h2>
            <p>La plateforme est destinée à la gestion de présence pour des écoles et des associations. Chaque administrateur est responsable des données qu'il enregistre pour son organisation.</p>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-800 mb-2">Comptes et accès</h2>
            <p>L'administrateur est responsable de la confidentialité de son mot de passe. Les responsables et membres accèdent à des espaces limités à leurs droits respectifs, définis par l'administrateur.</p>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-800 mb-2">Exactitude des données</h2>
            <p>L'administrateur et les responsables sont responsables de l'exactitude des informations de présence enregistrées sur la plateforme.</p>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-800 mb-2">Disponibilité</h2>
            <p>La plateforme est fournie en l'état. Des interruptions ponctuelles peuvent survenir, notamment pour maintenance.</p>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-800 mb-2">Modification des conditions</h2>
            <p>Ces conditions peuvent évoluer. La poursuite de l'utilisation de la plateforme après une mise à jour vaut acceptation des nouvelles conditions.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConditionsUtilisation;