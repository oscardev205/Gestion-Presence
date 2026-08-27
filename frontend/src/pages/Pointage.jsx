import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import QRCode from 'qrcode';
import { Camera, CameraOff, FileDown, FileSpreadsheet, FileText, ArrowLeft, CheckCircle2, XCircle, QrCode, Download } from 'lucide-react';
import api from '../api';
import socket from '../socket';

const LABELS_STATUT = { present: 'Présent', retard: 'En retard', absent: 'Absent', permissionnaire: 'Permissionnaire' };
const STYLES_STATUT = {
  present: 'bg-success-bg text-success-text',
  retard: 'bg-warning-bg text-warning-text',
  absent: 'bg-danger-bg text-danger-text',
  permissionnaire: 'bg-info-bg text-info-text',
};

function Pointage() {
  const { seanceId } = useParams();
  const [membres, setMembres] = useState([]);
  const [scanActif, setScanActif] = useState(false);
  const [message, setMessage] = useState('');
  const [messageErreur, setMessageErreur] = useState(false);
  const [qrSeanceDataUrl, setQrSeanceDataUrl] = useState('');
  const [seance, setSeance] = useState(null);
  const scannerRef = useRef(null);
  const traitementEnCours = useRef(false);

  const chargerListe = async () => {
    const reponse = await api.get(`/presences/seance/${seanceId}`);
    setMembres(reponse.data);
  };

  const chargerSeance = async () => {
    const reponse = await api.get(`/seances/${seanceId}`);
    setSeance(reponse.data);
    const dataUrl = await QRCode.toDataURL(reponse.data.qr_valeur, { width: 260, margin: 1 });
    setQrSeanceDataUrl(dataUrl);
  };

  const cloturerSeance = async () => {
    const confirmation = window.confirm(
      'Clôturer la séance ? Tous les membres non pointés seront marqués absents. Cette action ne peut pas être annulée.'
    );
    if (!confirmation) return;

    try {
      const reponse = await api.post(`/seances/${seanceId}/cloturer`);
      setSeance(reponse.data);
      chargerListe();
    } catch (err) {
      setMessage('Erreur lors de la clôture');
      setMessageErreur(true);
    }
  };

  const telechargerQrSeance = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(seance.titre, canvas.width / 2, 40);

    ctx.font = '14px Arial';
    ctx.fillStyle = '#666666';
    ctx.fillText(new Date(seance.date_seance).toLocaleString('fr-FR'), canvas.width / 2, 65);

    const qrImage = new Image();
    qrImage.src = qrSeanceDataUrl;

    qrImage.onload = () => {
      ctx.drawImage(qrImage, 50, 90, 300, 300);

      ctx.font = '13px Arial';
      ctx.fillStyle = '#888888';
      ctx.fillText('Scanne ce QR depuis ton espace membre', canvas.width / 2, 420);

      const lien = document.createElement('a');
      lien.download = `qr_seance_${seance.titre}.png`;
      lien.href = canvas.toDataURL('image/png');
      lien.click();
    };
  };

  useEffect(() => {
    chargerListe();
    chargerSeance();

    socket.emit('rejoindre-seance', seanceId);

    const gererPointageRecu = () => {
      chargerListe();
    };

    socket.on('pointage-effectue', gererPointageRecu);

    return () => {
      socket.emit('quitter-seance', seanceId);
      socket.off('pointage-effectue', gererPointageRecu);
    };
  }, [seanceId]);

  const demarrerScan = () => {
    setScanActif(true);
    setMessage('');

    const scanner = new Html5Qrcode('lecteur-qr');
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: 250 },
      async (texteDecode) => {
        if (traitementEnCours.current) return;
        traitementEnCours.current = true;

        try {
          const reponse = await api.post('/presences/scan', {
            seanceId: Number(seanceId),
            qrCodeValeur: texteDecode,
          });
          setMessage(`${reponse.data.membre.nom} pointé (${LABELS_STATUT[reponse.data.presence.statut]})`);
          setMessageErreur(false);
          chargerListe();
        } catch (err) {
          if (err.response) {
            setMessage(err.response.data.message);
          } else {
            setMessage('Erreur de pointage');
          }
          setMessageErreur(true);
        } finally {
          setTimeout(() => {
            traitementEnCours.current = false;
          }, 2000);
        }
      },
      () => {}
    );
  };

  const arreterScan = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        scannerRef.current.clear();
        setScanActif(false);
      });
    }
  };

  const pointerManuellement = async (membreId, statut) => {
    try {
      await api.post('/presences/manuel', {
        seanceId: Number(seanceId),
        membreId,
        statut,
      });
      chargerListe();
    } catch (err) {
      setMessage('Erreur lors du pointage manuel');
      setMessageErreur(true);
    }
  };

  const telechargerExport = async (format) => {
    const extensions = { excel: 'xlsx', pdf: 'pdf', word: 'docx' };
    try {
      const reponse = await api.get(`/exports/seance/${seanceId}/${format}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([reponse.data]));
      const lien = document.createElement('a');
      lien.href = url;
      lien.download = `presence_seance.${extensions[format]}`;
      lien.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setMessage('Erreur lors du téléchargement du fichier');
      setMessageErreur(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-400 px-4 sm:px-6 pt-6 pb-14">
        <div className="max-w-2xl mx-auto">
          <Link to="/historique" className="inline-flex items-center gap-1 text-primary-50 text-xs mb-3 hover:text-white transition">
            <ArrowLeft size={14} /> Retour à l'historique
          </Link>
          <h1 className="text-white text-xl sm:text-2xl font-semibold tracking-tight">Pointage de la séance</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 -mt-8 anim-apparition space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5">
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => telechargerExport('pdf')}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition"
            >
              <FileDown size={14} /> PDF
            </button>
            <button
              onClick={() => telechargerExport('excel')}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition"
            >
              <FileSpreadsheet size={14} /> Excel
            </button>
            <button
              onClick={() => telechargerExport('word')}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition"
            >
              <FileText size={14} /> Word
            </button>
          </div>

          {qrSeanceDataUrl && (
            <div className="bg-primary-50 rounded-xl p-4 mb-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-primary-800 text-sm font-medium mb-3">
                <QrCode size={16} /> QR de la séance — à afficher pour les membres
              </div>
              <img src={qrSeanceDataUrl} alt="QR de la séance" className="mx-auto rounded-lg bg-white p-2" />
              <p className="text-xs text-gray-500 mt-2 mb-3">{seance?.titre}</p>
              <button
                onClick={telechargerQrSeance}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-primary-200 rounded-lg text-xs font-medium text-primary-700 hover:bg-primary-50 transition"
              >
                <Download size={14} /> Télécharger le QR
              </button>
            </div>
          )}

          {seance?.cloturee ? (
            <div className="w-full flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-500 font-medium rounded-xl">
              Séance clôturée
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              {!scanActif ? (
                <button
                  onClick={demarrerScan}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-primary-900 to-primary-400 text-white font-medium rounded-xl hover:opacity-90 active:scale-[0.98] transition"
                >
                  <Camera size={18} /> Démarrer le scan
                </button>
              ) : (
                <button
                  onClick={arreterScan}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 active:scale-[0.98] transition"
                >
                  <CameraOff size={18} /> Arrêter le scan
                </button>
              )}
              <button
                onClick={cloturerSeance}
                className="sm:w-auto px-4 py-3 bg-danger-bg text-danger-text font-medium rounded-xl hover:opacity-80 active:scale-[0.98] transition text-sm"
              >
                Clôturer
              </button>
            </div>
          )}

          <div id="lecteur-qr" className="mt-4 max-w-xs mx-auto rounded-xl overflow-hidden"></div>

          {message && (
            <div
              className={`flex items-center gap-2 mt-4 px-3 py-2.5 rounded-xl text-sm font-medium anim-apparition ${
                messageErreur ? 'bg-danger-bg text-danger-text' : 'bg-success-bg text-success-text'
              }`}
            >
              {messageErreur ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
              {message}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Liste des membres (secours manuel)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs">
                  <th className="text-left font-medium px-4 py-3">Identifiant</th>
                  <th className="text-left font-medium px-4 py-3">Nom</th>
                  <th className="text-left font-medium px-4 py-3">Statut</th>
                  <th className="text-left font-medium px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {membres.map((m) => (
                  <tr key={m.membre_id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-medium text-gray-700">{m.identifiant}</td>
                    <td className="px-4 py-3 text-gray-700">{m.nom}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${STYLES_STATUT[m.statut] || STYLES_STATUT.absent}`}>
                        {m.statut ? LABELS_STATUT[m.statut] : 'Absent'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={m.statut || ''}
                        onChange={(e) => pointerManuellement(m.membre_id, e.target.value)}
                        disabled={seance?.cloturee}
                        className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-400 transition disabled:opacity-50"
                      >
                        <option value="" disabled>Choisir</option>
                        <option value="present">Présent</option>
                        <option value="retard">En retard</option>
                        <option value="absent">Absent</option>
                        <option value="permissionnaire">Permissionnaire</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Pointage;