import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Send } from 'lucide-react';

function Contact() {
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [sujet, setSujet] = useState('');
  const [messageTexte, setMessageTexte] = useState('');

  const envoyer = (e) => {
    e.preventDefault();
    const corps = `Nom : ${nom}\nEmail : ${email}\n\n${messageTexte}`;
    window.location.href = `mailto:contact@gestion-presence.app?subject=${encodeURIComponent(sujet || 'Contact depuis le site')}&body=${encodeURIComponent(corps)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-400 px-4 sm:px-6 pt-6 pb-14">
        <div className="max-w-xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-1 text-primary-50 text-xs mb-3 hover:text-white transition">
            <ArrowLeft size={14} /> Retour à l'accueil
          </Link>
          <h1 className="text-white text-xl sm:text-2xl font-semibold tracking-tight">Contact</h1>
          <p className="text-primary-50 text-sm mt-1">Une question, un problème ? Écris-nous.</p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 sm:px-6 -mt-8 anim-apparition">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-7">
          <div className="flex items-center gap-2 mb-6 text-sm text-gray-500">
            <Mail size={16} className="text-primary-600" />
            contact@gestion-presence.app
          </div>

          <form onSubmit={envoyer} className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nom</label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Sujet</label>
              <input
                type="text"
                value={sujet}
                onChange={(e) => setSujet(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Message</label>
              <textarea
                value={messageTexte}
                onChange={(e) => setMessageTexte(e.target.value)}
                rows={6}
                required
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition resize-none"
              />
            </div>

            <button
              type="submit"
              className="flex items-center justify-center gap-1.5 w-full py-3 bg-gradient-to-r from-primary-900 to-primary-400 text-white font-medium rounded-xl hover:opacity-90 active:scale-[0.98] transition"
            >
              <Send size={16} /> Envoyer
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Contact;