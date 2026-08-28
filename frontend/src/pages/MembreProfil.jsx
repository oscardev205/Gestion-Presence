import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { ArrowLeft, LogOut, Bell, BellOff } from 'lucide-react';
import BottomNavMembre from '../components/BottomNavMembre';

function MembreProfil() {
  const membre = JSON.parse(localStorage.getItem('membreInfo') || 'null');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [notificationsActivees, setNotificationsActivees] = useState(
    localStorage.getItem('notificationsMembre') !== 'false'
  );
  const navigate = useNavigate();

  useEffect(() => {
    const genererQr = async () => {
      if (membre && membre.qrCodeValeur) {
        const dataUrl = await QRCode.toDataURL(membre.qrCodeValeur, { width: 220, margin: 1 });
        setQrDataUrl(dataUrl);
      }
    };
    genererQr();
  }, []);

  const basculerNotifications = () => {
    const nouvelleValeur = !notificationsActivees;
    setNotificationsActivees(nouvelleValeur);
    localStorage.setItem('notificationsMembre', String(nouvelleValeur));
  };

  const deconnexion = () => {
    localStorage.removeItem('tokenMembre');
    localStorage.removeItem('membreInfo');
    navigate('/espace-membre/connexion');
  };

  if (!membre) {
    navigate('/espace-membre/connexion');
    return null;
  }

  const initiales = membre.nom
    ? membre.nom.split(' ').map((mot) => mot[0]).slice(0, 2).join('').toUpperCase()
    : '';

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-400 px-4 sm:px-6 pt-6 pb-16 text-center">
        <div className="max-w-md mx-auto text-left">
          <Link to="/mon-espace" className="inline-flex items-center gap-1 text-primary-50 text-xs mb-3 hover:text-white transition">
            <ArrowLeft size={14} /> Retour
          </Link>
        </div>
        <div className="w-16 h-16 rounded-full bg-white/15 flex items-center justify-center text-white text-lg font-semibold mx-auto mb-3">
          {initiales}
        </div>
        <p className="text-white text-lg font-semibold tracking-tight">{membre.nom}</p>
        <p className="text-primary-50 text-sm mt-0.5">
          {membre.role ? `${membre.role} · ` : ''}{membre.organisationNom}
        </p>
      </div>

      <div className="max-w-md mx-auto px-4 sm:px-6 -mt-8 anim-apparition space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 text-center">
          <p className="text-sm font-semibold text-gray-800 mb-3">Mon QR personnel</p>
          {qrDataUrl && (
            <img src={qrDataUrl} alt="Mon QR" className="mx-auto rounded-xl border border-gray-100 p-2" />
          )}
          <p className="text-xs text-gray-400 mt-3">Sert à la connexion et au pointage de secours</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100">
          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-sm text-gray-600">Identifiant</span>
            <span className="text-sm font-medium text-gray-800">{membre.identifiant}</span>
          </div>
          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-sm text-gray-600">Organisation</span>
            <span className="text-sm font-medium text-gray-800">{membre.organisationNom}</span>
          </div>
          <button
            onClick={basculerNotifications}
            className="w-full flex items-center justify-between px-5 py-4 text-left"
          >
            <span className="flex items-center gap-2 text-sm text-gray-600">
              {notificationsActivees ? <Bell size={16} className="text-primary-600" /> : <BellOff size={16} className="text-gray-400" />}
              Notifications de séance
            </span>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${notificationsActivees ? 'bg-success-bg text-success-text' : 'bg-gray-100 text-gray-500'}`}>
              {notificationsActivees ? 'Activées' : 'Désactivées'}
            </span>
          </button>
        </div>

        <button
          onClick={deconnexion}
          className="w-full flex items-center justify-center gap-1.5 py-3 bg-danger-bg text-danger-text font-medium rounded-xl hover:opacity-80 active:scale-[0.98] transition"
        >
          <LogOut size={16} /> Se déconnecter
        </button>
      </div>

      <BottomNavMembre />
    </div>
  );
}

export default MembreProfil;