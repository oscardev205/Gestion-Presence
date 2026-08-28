import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

function PolitiqueConfidentialite() {
  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-400 px-4 sm:px-6 pt-6 pb-14">
        <div className="max-w-2xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-1 text-primary-50 text-xs mb-3 hover:text-white transition">
            <ArrowLeft size={14} /> Retour à l'accueil
          </Link>
          <h1 className="text-white text-xl sm:text-2xl font-semibold tracking-tight">Politique de confidentialité</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 -mt-8 anim-apparition">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-7 space-y-5 text-sm text-gray-600 leading-relaxed">
          <p>Cette politique explique quelles données sont collectées sur la plateforme et comment elles sont utilisées.</p>

          <div>
            <h2 className="text-sm font-semibold text-gray-800 mb-2">Données collectées</h2>
            <p>Lors de l'utilisation de la plateforme, les données suivantes peuvent être enregistrées : nom et email de l'administrateur, nom et rôle ou classe des membres, dates et statuts de présence lors des séances, et nom et email des responsables délégués.</p>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-800 mb-2">Utilisation des données</h2>
            <p>Ces données servent uniquement au fonctionnement de la plateforme : gestion des membres, suivi de présence, génération de rapports et statistiques pour l'organisation concernée.</p>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-800 mb-2">Séparation des données</h2>
            <p>Chaque organisation est isolée. Les données d'une organisation ne sont accessibles qu'à son administrateur et aux responsables qu'il a désignés, ainsi qu'aux membres pour leurs propres informations.</p>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-800 mb-2">Conservation</h2>
            <p>Les données sont conservées tant que le compte administrateur reste actif. Un administrateur peut supprimer un membre ou une organisation, ce qui entraîne la suppression des données associées.</p>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-800 mb-2">Contact</h2>
            <p>Pour toute question concernant tes données, tu peux nous contacter via la <Link to="/contact" className="text-primary-600 hover:underline">page contact</Link>.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PolitiqueConfidentialite;