import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileDown, FileSpreadsheet, FileText, TrendingUp } from 'lucide-react';
import api from '../api';

function Statistiques() {
  const organisationActive = JSON.parse(localStorage.getItem('organisationActive'));
  const [donnees, setDonnees] = useState(null);
  const [chargement, setChargement] = useState(true);
    const [classeFiltre, setClasseFiltre] = useState('');

  const chargerDonnees = async (classe) => {
    setChargement(true);
    try {
      const reponse = await api.get(`/membres/organisation/${organisationActive.id}/vue-ensemble`, {
        params: { classe: classe || undefined },
      });
      setDonnees(reponse.data);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerDonnees();
  }, []);

  const handleChangementClasse = (e) => {
    const valeur = e.target.value;
    setClasseFiltre(valeur);
    chargerDonnees(valeur);
  };

   const telechargerExportOrg = async (format) => {
    const extensions = { excel: 'xlsx', pdf: 'pdf', word: 'docx' };
    const reponse = await api.get(`/exports/organisation/${organisationActive.id}/${format}`, {
      params: { classe: classeFiltre || undefined },
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([reponse.data]));
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = `vue_ensemble.${extensions[format]}`;
    lien.click();
    window.URL.revokeObjectURL(url);
  };

  if (!organisationActive) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <p className="text-sm text-gray-500">Sélectionne d'abord une organisation depuis le dashboard.</p>
      </div>
    );
  }

  if (chargement) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Chargement...</p>
      </div>
    );
  }

  const membresTriesParTaux = [...donnees.membres].sort((a, b) => a.tauxPresence - b.tauxPresence);

    const tauxGlobal = membresTriesParTaux.length > 0
    ? Math.round(membresTriesParTaux.reduce((somme, m) => somme + m.tauxPresence, 0) / membresTriesParTaux.length)
    : 0;
  const couleurBarre = (taux) => (taux < 50 ? 'bg-danger-text' : taux < 80 ? 'bg-warning-text' : 'bg-success-text');

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-400 px-4 sm:px-6 pt-6 pb-14">
        <div className="max-w-3xl mx-auto">
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-primary-50 text-xs mb-3 hover:text-white transition">
            <ArrowLeft size={14} /> Retour au dashboard
          </Link>
          <h1 className="text-white text-xl sm:text-2xl font-semibold tracking-tight">Statistiques</h1>
          <p className="text-primary-50 text-sm mt-1">
            {organisationActive.nom} · {donnees.nombreSeances} séance{donnees.nombreSeances > 1 ? 's' : ''} enregistrée{donnees.nombreSeances > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-8 anim-apparition">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 mb-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Taux de présence moyen, toutes séances confondues</p>
          <p className="text-3xl font-semibold text-primary-800">{tauxGlobal}%</p>
        </div>

                {organisationActive.type === 'ecole' && (organisationActive.roles_hierarchie || []).length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 mb-4">
            <label className="text-xs text-gray-500 mb-1.5 block">Filtrer par classe</label>
            <select
              value={classeFiltre}
              onChange={handleChangementClasse}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
            >
              <option value="">Toutes les classes</option>
              {organisationActive.roles_hierarchie.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => telechargerExportOrg('pdf')}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition"
          >
            <FileDown size={14} /> PDF
          </button>
          <button
            onClick={() => telechargerExportOrg('excel')}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition"
          >
            <FileSpreadsheet size={14} /> Excel
          </button>
          <button
            onClick={() => telechargerExportOrg('word')}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition"
          >
            <FileText size={14} /> Word
          </button>
        </div>

        {membresTriesParTaux.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <TrendingUp className="text-gray-300 mx-auto mb-3" size={32} />
            <p className="text-sm text-gray-400">Aucune donnée pour l'instant.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {membresTriesParTaux.map((m) => (
              <Link
                key={m.id}
                to={`/membre/${m.id}`}
                className="block bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 hover:border-primary-200 hover:shadow-md active:scale-[0.99] transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{m.nom}</p>
                    <p className="text-xs text-gray-400">{m.identifiant}</p>
                  </div>
                  <span className="text-lg font-semibold text-gray-800">{m.tauxPresence}%</span>
                </div>

                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full ${couleurBarre(m.tauxPresence)} transition-all duration-500`}
                    style={{ width: `${m.tauxPresence}%` }}
                  ></div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-success-bg text-success-text">
                    {m.present} présent{m.present > 1 ? 's' : ''} · {donnees.nombreSeances > 0 ? Math.round((m.present / donnees.nombreSeances) * 100) : 0}%
                  </span>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-warning-bg text-warning-text">
                    {m.retard} retard{m.retard > 1 ? 's' : ''} · {donnees.nombreSeances > 0 ? Math.round((m.retard / donnees.nombreSeances) * 100) : 0}%
                  </span>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-danger-bg text-danger-text">
                    {m.absent} absent{m.absent > 1 ? 's' : ''} · {donnees.nombreSeances > 0 ? Math.round((m.absent / donnees.nombreSeances) * 100) : 0}%
                  </span>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-info-bg text-info-text">
                    {m.permissionnaire} permission{m.permissionnaire > 1 ? 's' : ''} · {donnees.nombreSeances > 0 ? Math.round((m.permissionnaire / donnees.nombreSeances) * 100) : 0}%
                  </span>
                </div>
                </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Statistiques;