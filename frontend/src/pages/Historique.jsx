import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Filter, ArrowLeft, ArrowRight, CalendarDays } from 'lucide-react';
import api from '../api';

function Historique() {
  const organisationActive = JSON.parse(localStorage.getItem('organisationActive'));
  const [seances, setSeances] = useState([]);
  const [resumes, setResumes] = useState({});
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [chargement, setChargement] = useState(true);

  const chargerSeances = async () => {
    setChargement(true);
    try {
      const reponse = await api.get('/seances', {
        params: {
          organisationId: organisationActive.id,
          dateDebut: dateDebut || undefined,
          dateFin: dateFin || undefined,
        },
      });
      setSeances(reponse.data);

      const resumesTemp = {};
      await Promise.all(
        reponse.data.map(async (s) => {
          const r = await api.get(`/seances/${s.id}/resume`);
          resumesTemp[s.id] = r.data.compteurs;
        })
      );
      setResumes(resumesTemp);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerSeances();
  }, []);

  const appliquerFiltre = (e) => {
    e.preventDefault();
    chargerSeances();
  };

  if (!organisationActive) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <p className="text-sm text-gray-500">Sélectionne d'abord une organisation depuis le dashboard.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-400 px-4 sm:px-6 pt-6 pb-14">
        <div className="max-w-3xl mx-auto">
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-primary-50 text-xs mb-3 hover:text-white transition">
            <ArrowLeft size={14} /> Retour au dashboard
          </Link>
          <h1 className="text-white text-xl sm:text-2xl font-semibold tracking-tight">Historique des séances</h1>
          <p className="text-primary-50 text-sm mt-1">{organisationActive.nom}</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-8 anim-apparition">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 mb-4">
          <form onSubmit={appliquerFiltre} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Du</label>
              <input
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Au</label>
              <input
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
              />
            </div>
            <button
              type="submit"
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-primary-900 to-primary-400 text-white text-sm font-medium rounded-xl hover:opacity-90 active:scale-[0.98] transition whitespace-nowrap"
            >
              <Filter size={15} /> Filtrer
            </button>
          </form>
        </div>

        {chargement ? (
          <p className="text-sm text-gray-400 text-center py-8">Chargement...</p>
        ) : seances.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <CalendarDays className="text-gray-300 mx-auto mb-3" size={32} />
            <p className="text-sm text-gray-400">Aucune séance sur cette période.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {seances.map((s) => {
              const c = resumes[s.id] || { present: 0, retard: 0, absent: 0, permissionnaire: 0 };
              return (
                <Link
                  key={s.id}
                  to={`/pointage/${s.id}`}
                  className="block bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 hover:border-primary-200 hover:shadow-md active:scale-[0.99] transition"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{s.titre}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(s.date_seance).toLocaleString('fr-FR')}</p>
                    </div>
                    <ArrowRight className="text-gray-300" size={18} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-success-bg text-success-text">
                      {c.present} présent{c.present > 1 ? 's' : ''}
                    </span>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-warning-bg text-warning-text">
                      {c.retard} retard{c.retard > 1 ? 's' : ''}
                    </span>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-danger-bg text-danger-text">
                      {c.absent} absent{c.absent > 1 ? 's' : ''}
                    </span>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-info-bg text-info-text">
                      {c.permissionnaire} permission{c.permissionnaire > 1 ? 's' : ''}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Historique;