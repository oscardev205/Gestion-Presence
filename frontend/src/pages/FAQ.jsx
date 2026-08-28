import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown } from 'lucide-react';

const QUESTIONS = [
  {
    question: 'Comment un membre est-il ajouté à une organisation ?',
    reponse: 'C\'est l\'administrateur qui enregistre chaque membre depuis son compte. Un identifiant et un code QR sont générés automatiquement, à conserver par le membre.',
  },
  {
    question: 'Comment fonctionne le pointage ?',
    reponse: 'Le pointage se fait par scan de QR code, soit par un responsable désigné, soit par le membre lui-même qui scanne le QR affiché de la séance depuis son propre espace.',
  },
  {
    question: 'Peut-on gérer plusieurs organisations avec un seul compte ?',
    reponse: 'Oui, un administrateur peut créer et gérer plusieurs écoles ou associations depuis un même compte, chacune dans un espace séparé.',
  },
  {
    question: 'Quels formats d\'export sont disponibles ?',
    reponse: 'Les rapports de présence peuvent être exportés en PDF, Excel ou Word. Les fichiers Excel sont protégés contre les modifications accidentelles.',
  },
  {
    question: 'Que se passe-t-il si un membre n\'est jamais pointé ?',
    reponse: 'Une fois la séance clôturée par l\'administrateur ou un responsable, tous les membres non pointés sont automatiquement marqués absents.',
  },
  {
    question: 'Un responsable a-t-il les mêmes droits qu\'un administrateur ?',
    reponse: 'Non. Un responsable peut scanner et pointer les présences, mais ne peut pas modifier les réglages, ajouter des membres ou supprimer une organisation.',
  },
];

function FAQ() {
  const [ouvert, setOuvert] = useState(null);

  const basculer = (index) => {
    setOuvert(ouvert === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-400 px-4 sm:px-6 pt-6 pb-14">
        <div className="max-w-2xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-1 text-primary-50 text-xs mb-3 hover:text-white transition">
            <ArrowLeft size={14} /> Retour à l'accueil
          </Link>
          <h1 className="text-white text-xl sm:text-2xl font-semibold tracking-tight">Questions fréquentes</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 -mt-8 anim-apparition space-y-3">
        {QUESTIONS.map((item, index) => (
          <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <button
              onClick={() => basculer(index)}
              className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-left"
            >
              <span className="text-sm font-medium text-gray-800">{item.question}</span>
              <ChevronDown
                className={`text-gray-400 shrink-0 transition-transform ${ouvert === index ? 'rotate-180' : ''}`}
                size={18}
              />
            </button>
            {ouvert === index && (
              <div className="px-4 sm:px-5 pb-4 sm:pb-5 anim-apparition">
                <p className="text-sm text-gray-500">{item.reponse}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default FAQ;