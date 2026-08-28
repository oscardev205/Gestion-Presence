import { useCallback, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { IdCard, Shield, Camera, CameraOff, KeyRound } from 'lucide-react';
import api from '../api';
import ScannerQR from '../components/ScannerQR';

function ConnexionMembre() {
  const [mode, setMode] = useState('identifiant');
  const [identifiant, setIdentifiant] = useState('');
  const [codePin, setCodePin] = useState('');
  const [organisations, setOrganisations] = useState(null);
  const [organisationChoisie, setOrganisationChoisie] = useState('');
  const [erreur, setErreur] = useState('');
  const [scanActif, setScanActif] = useState(false);
  const scannerApiRef = useRef(null);
  const navigate = useNavigate();

  const gererConnexionReussie = (reponse) => {
    localStorage.setItem('tokenMembre', reponse.data.token);
    localStorage.setItem('membreInfo', JSON.stringify(reponse.data.membre));
    navigate('/mon-espace');
  };

  const tenterConnexion = async (organisationId) => {
    setErreur('');
    try {
      const reponse = await api.post('/membre-auth/connexion', {
        identifiant,
        codePin,
        organisationId: organisationId || undefined,
      });
      gererConnexionReussie(reponse);
    } catch (err) {
      if (err.response && err.response.status === 300) {
        setOrganisations(err.response.data.organisations);
      } else if (err.response) {
        setErreur(err.response.data.message);
      } else {
        setErreur('Impossible de contacter le serveur');
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    tenterConnexion();
  };

  const handleChoixOrganisation = (e) => {
    e.preventDefault();
    tenterConnexion(organisationChoisie);
  };

  const gererResultatScan = useCallback(async (texteDecode) => {
    setErreur('');
    try {
      const reponse = await api.post('/membre-auth/connexion-qr', { qrCodeValeur: texteDecode });
      gererConnexionReussie(reponse);
    } catch (err) {
      setErreur(err.response ? err.response.data.message : 'Erreur lors de la connexion');
    }
  }, []);

  const demarrerScan = async () => {
    setScanActif(true);
    setErreur('');
    try {
      await scannerApiRef.current.demarrer();
    } catch (err) {
      setErreur('Impossible d\'accéder à la caméra, réessaie dans quelques secondes.');
      setScanActif(false);
    }
  };

  const arreterScan = async () => {
    await scannerApiRef.current.arreter();
    setScanActif(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm anim-apparition">
        <div className="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-400 rounded-t-3xl px-8 pt-10 pb-16 text-center">
          <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Shield className="text-white" size={24} />
          </div>
          <h1 className="text-white text-2xl font-semibold tracking-tight">Espace membre</h1>
          <p className="text-primary-50 text-sm mt-1">Consulte ta présence</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg px-6 py-8 -mt-8 relative">
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            <button
              type="button"
              onClick={() => setMode('identifiant')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition ${
                mode === 'identifiant' ? 'bg-white text-primary-800 shadow-sm' : 'text-gray-500'
              }`}
            >
              <KeyRound size={14} /> Identifiant
            </button>
            <button
              type="button"
              onClick={() => setMode('scan')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition ${
                mode === 'scan' ? 'bg-white text-primary-800 shadow-sm' : 'text-gray-500'
              }`}
            >
              <Camera size={14} /> Scanner mon QR
            </button>
          </div>

          {mode === 'identifiant' ? (
            !organisations ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={identifiant}
                    onChange={(e) => setIdentifiant(e.target.value)}
                    placeholder="Identifiant (ex : VB-10)"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
                  />
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={codePin}
                    onChange={(e) => setCodePin(e.target.value.replace(/\D/g, ''))}
                    placeholder="Code PIN à 4 chiffres"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
                  />
                </div>

                {erreur && (
                  <p className="text-sm text-danger-text bg-danger-bg rounded-lg px-3 py-2 anim-apparition">{erreur}</p>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-primary-900 to-primary-400 text-white font-medium rounded-xl hover:opacity-90 active:scale-[0.98] transition"
                >
                  Se connecter
                </button>
              </form>
            ) : (
              <form onSubmit={handleChoixOrganisation} className="space-y-4">
                <p className="text-sm text-gray-500">Plusieurs organisations utilisent cet identifiant, précise la tienne :</p>
                <select
                  value={organisationChoisie}
                  onChange={(e) => setOrganisationChoisie(e.target.value)}
                  required
                  className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
                >
                  <option value="" disabled>Choisir</option>
                  {organisations.map((o) => (
                    <option key={o.id} value={o.id}>{o.nom}</option>
                  ))}
                </select>

                {erreur && (
                  <p className="text-sm text-danger-text bg-danger-bg rounded-lg px-3 py-2 anim-apparition">{erreur}</p>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-primary-900 to-primary-400 text-white font-medium rounded-xl hover:opacity-90 active:scale-[0.98] transition"
                >
                  Continuer
                </button>
              </form>
            )
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-4 text-center">Scanne le QR de ta fiche pour te connecter directement.</p>

              {!scanActif ? (
                <button
                  onClick={demarrerScan}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-primary-900 to-primary-400 text-white font-medium rounded-xl hover:opacity-90 active:scale-[0.98] transition"
                >
                  <Camera size={18} /> Démarrer le scan
                </button>
              ) : (
                <button
                  onClick={arreterScan}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 active:scale-[0.98] transition"
                >
                  <CameraOff size={18} /> Arrêter le scan
                </button>
              )}

              <ScannerQR ref={scannerApiRef} elementId="lecteur-qr-membre-connexion" onResultat={gererResultatScan} />

              {erreur && (
                <p className="text-sm text-danger-text bg-danger-bg rounded-lg px-3 py-2 mt-4 anim-apparition">{erreur}</p>
              )}
            </div>
          )}

          <p className="text-center text-sm text-gray-500 mt-6">
            <Link to="/connexion" className="text-primary-600 font-medium hover:underline">
              Espace administrateur
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ConnexionMembre;