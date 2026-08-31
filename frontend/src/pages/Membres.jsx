import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { Search, Plus, Download, QrCode, UserX, UserCheck, FileDown, ArrowLeft, FileStack, ImagePlus } from 'lucide-react';
import api from '../api';
import BottomNavAdmin from '../components/BottomNavAdmin';

const COULEURS_AVATAR = ['#085041', '#0F6E56', '#1D9E75', '#5DCAA5'];

function couleurAvatar(nom) {
  const index = nom ? nom.charCodeAt(0) % COULEURS_AVATAR.length : 0;
  return COULEURS_AVATAR[index];
}

function initialesDe(nom) {
  return nom
    ? nom.split(' ').map((mot) => mot[0]).slice(0, 2).join('').toUpperCase()
    : '?';
}

function Membres() {
  const organisationActive = JSON.parse(localStorage.getItem('organisationActive'));
  const [membres, setMembres] = useState([]);
  const [nom, setNom] = useState('');
  const [role, setRole] = useState('');
    const [telephone, setTelephone] = useState('');
  const [societe, setSociete] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoApercu, setPhotoApercu] = useState('');
  const [uploadEnCours, setUploadEnCours] = useState(false);
  const [recherche, setRecherche] = useState('');
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(true);
  const [classeExport, setClasseExport] = useState('');

  const chargerMembres = async (texteRecherche = '') => {
    try {
      const reponse = await api.get('/membres', {
        params: {
          organisationId: organisationActive.id,
          recherche: texteRecherche || undefined,
        },
      });
      setMembres(reponse.data);
    } catch (err) {
      setErreur('Impossible de charger les membres');
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerMembres();
  }, []);

    const handleAjout = async (e) => {
    e.preventDefault();
    setErreur('');

    try {
      let photoUrl = '';

      if (photoFile) {
        setUploadEnCours(true);
        const formData = new FormData();
        formData.append('fichier', photoFile);
        formData.append('dossier', 'membres');
        const reponseUpload = await api.post('/upload', formData);
        photoUrl = reponseUpload.data.url;
        setUploadEnCours(false);
      }

      await api.post('/membres', {
        organisationId: organisationActive.id,
        nom,
        role,
        telephone: telephone || undefined,
        societe: organisationActive.type === 'association' ? (societe || undefined) : undefined,
        photoUrl: photoUrl || undefined,
      });
      setNom('');
      setRole('');
      setTelephone('');
      setSociete('');
      setPhotoFile(null);
      setPhotoApercu('');
      chargerMembres();
    } catch (err) {
      setUploadEnCours(false);
      if (err.response) {
        setErreur(err.response.data.message);
      } else {
        setErreur('Impossible de contacter le serveur');
      }
    }
  };

  const handleRecherche = (e) => {
    const valeur = e.target.value;
    setRecherche(valeur);
    chargerMembres(valeur);
  };
    const handleChoixPhoto = (e) => {
    const fichier = e.target.files[0];
    if (!fichier) return;
    setPhotoFile(fichier);
    setPhotoApercu(URL.createObjectURL(fichier));
  };

  const genererImage = (membre, qrDataUrl) => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 500;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(organisationActive.nom, canvas.width / 2, 40);

    const qrImage = new Image();
    qrImage.src = qrDataUrl;

    qrImage.onload = () => {
      ctx.drawImage(qrImage, 50, 70, 300, 300);

      ctx.font = 'bold 24px Arial';
      ctx.fillText(membre.identifiant, canvas.width / 2, 410);

      ctx.font = '16px Arial';
      ctx.fillStyle = '#444444';
      ctx.fillText(membre.nom, canvas.width / 2, 440);

      if (membre.code_pin) {
        ctx.font = 'bold 15px Arial';
        ctx.fillStyle = '#085041';
        ctx.fillText(`Code PIN : ${membre.code_pin}`, canvas.width / 2, 465);
      }

      const lien = document.createElement('a');
      lien.download = `${membre.identifiant}.png`;
      lien.href = canvas.toDataURL('image/png');
      lien.click();
    };
  };

  const telechargerFiche = async (membre) => {
    const qrDataUrl = await QRCode.toDataURL(membre.qr_code_valeur, { width: 300, margin: 1 });
    genererImage(membre, qrDataUrl);
  };

  const changerStatut = async (membre) => {
    const nouveauStatut = membre.statut === 'actif' ? 'suspendu' : 'actif';
    try {
      await api.patch(`/membres/${membre.id}/statut`, { statut: nouveauStatut });
      chargerMembres(recherche);
    } catch (err) {
      setErreur('Erreur lors du changement de statut');
    }
  };

  const regenererQr = async (membre) => {
    const confirmation = window.confirm(
      `Régénérer le QR de ${membre.nom} ? L'ancienne fiche ne fonctionnera plus.`
    );
    if (!confirmation) return;

    try {
      const reponse = await api.post(`/membres/${membre.id}/regenerer-qr`);
      const qrDataUrl = await QRCode.toDataURL(reponse.data.qr_code_valeur, { width: 300, margin: 1 });
      genererImage(reponse.data, qrDataUrl);
      chargerMembres(recherche);
    } catch (err) {
      setErreur('Erreur lors de la régénération du QR');
    }
  };

  const telechargerHistoriqueMembre = async (membre, format) => {
    const extensions = { excel: 'xlsx', pdf: 'pdf', word: 'docx' };
    const reponse = await api.get(`/exports/membre/${membre.id}/${format}`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([reponse.data]));
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = `historique_${membre.identifiant}.${extensions[format]}`;
    lien.click();
    window.URL.revokeObjectURL(url);
  };

  const telechargerFichesGroupees = async () => {
    try {
      const reponse = await api.get(`/exports/organisation/${organisationActive.id}/fiches-qr`, {
        params: { classe: classeExport || undefined },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([reponse.data]));
      const lien = document.createElement('a');
      lien.href = url;
      lien.download = `fiches_qr_${organisationActive.nom}.pdf`;
      lien.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setErreur('Erreur lors de la génération des fiches QR');
    }
  };

  if (!organisationActive) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <p className="text-sm text-gray-500">Sélectionne d'abord une organisation depuis le dashboard.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-400 px-4 sm:px-6 pt-6 pb-14">
        <div className="max-w-2xl mx-auto">
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-primary-50 text-xs mb-3 hover:text-white transition">
            <ArrowLeft size={14} /> Retour au dashboard
          </Link>
          <h1 className="text-white text-xl sm:text-2xl font-semibold tracking-tight">Membres</h1>
          <p className="text-primary-50 text-sm mt-1">{organisationActive.nom}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 -mt-8 anim-apparition">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 mb-4">
          <form onSubmit={handleAjout} className="space-y-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Nom du membre"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                required
                className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
              />
              {(organisationActive.roles_hierarchie || []).length > 0 ? (
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  required
                  className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
                >
                  <option value="" disabled>{organisationActive.type === 'ecole' ? 'Choisir une classe' : 'Choisir un rôle'}</option>
                  {organisationActive.roles_hierarchie.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder={organisationActive.type === 'ecole' ? 'Classe (optionnel)' : 'Rôle (optionnel)'}
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
                />
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="tel"
                placeholder="Téléphone (optionnel)"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
              />
              {organisationActive.type === 'association' && (
                <input
                  type="text"
                  placeholder="Société (optionnel)"
                  value={societe}
                  onChange={(e) => setSociete(e.target.value)}
                  className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
                />
              )}
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600 cursor-pointer hover:bg-gray-100 transition">
                <ImagePlus size={16} />
                Photo (optionnel)
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleChoixPhoto} className="hidden" />
              </label>
              {photoApercu && (
                <img src={photoApercu} alt="Aperçu" className="w-10 h-10 rounded-full object-cover border border-gray-200" />
              )}
              <button
                type="submit"
                disabled={uploadEnCours}
                className="ml-auto flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-primary-900 to-primary-400 text-white text-sm font-medium rounded-xl hover:opacity-90 active:scale-[0.98] transition whitespace-nowrap disabled:opacity-60"
              >
                <Plus size={16} /> {uploadEnCours ? 'Envoi...' : 'Ajouter'}
              </button>
            </div>
          </form>
          {erreur && (
            <p className="text-sm text-danger-text bg-danger-bg rounded-lg px-3 py-2 mt-3 anim-apparition">{erreur}</p>
          )}
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Rechercher par nom ou identifiant"
            value={recherche}
            onChange={handleRecherche}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {organisationActive.type === 'ecole' && (organisationActive.roles_hierarchie || []).length > 0 && (
            <select
              value={classeExport}
              onChange={(e) => setClasseExport(e.target.value)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-400 transition"
            >
              <option value="">Toutes les classes</option>
              {organisationActive.roles_hierarchie.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
          <button
            onClick={telechargerFichesGroupees}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
          >
            <FileStack size={14} /> Exporter les fiches QR (PDF)
          </button>
        </div>

        {chargement ? (
          <p className="text-sm text-gray-400 text-center py-8">Chargement...</p>
        ) : membres.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Aucun membre pour l'instant.</p>
        ) : (
          <div className="space-y-3">
            {membres.map((membre) => (
              <div
                key={membre.id}
                className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-4 ${membre.statut === 'suspendu' ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
                    style={{ backgroundColor: couleurAvatar(membre.nom) }}
                  >
                    {initialesDe(membre.nom)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{membre.nom}</p>
                    <p className="text-xs text-gray-400">{membre.identifiant}{membre.role ? ` · ${membre.role}` : ''}</p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${
                      membre.statut === 'actif' ? 'bg-success-bg text-success-text' : 'bg-danger-bg text-danger-text'
                    }`}
                  >
                    {membre.statut === 'actif' ? 'Actif' : 'Suspendu'}
                  </span>
                </div>

                <div className="flex items-center gap-4 pt-3 border-t border-gray-100 text-gray-400">
                  <button onClick={() => telechargerFiche(membre)} title="Télécharger la fiche" className="flex items-center gap-1.5 text-xs hover:text-primary-600 transition">
                    <Download size={15} /> Fiche
                  </button>
                  <button onClick={() => regenererQr(membre)} title="Régénérer le QR" className="flex items-center gap-1.5 text-xs hover:text-primary-600 transition">
                    <QrCode size={15} /> QR
                  </button>
                  <button onClick={() => changerStatut(membre)} title={membre.statut === 'actif' ? 'Suspendre' : 'Réactiver'} className="flex items-center gap-1.5 text-xs hover:text-primary-600 transition">
                    {membre.statut === 'actif' ? <UserX size={15} /> : <UserCheck size={15} />}
                    {membre.statut === 'actif' ? 'Suspendre' : 'Réactiver'}
                  </button>
                  <button onClick={() => telechargerHistoriqueMembre(membre, 'pdf')} title="Historique PDF" className="flex items-center gap-1.5 text-xs hover:text-primary-600 transition">
                    <FileDown size={15} /> PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNavAdmin />
    </div>
  );
}

export default Membres;