import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Connexion from './pages/Connexion';
import Inscription from './pages/Inscription';
import Dashboard from './pages/Dashboard';
import NouvelleOrganisation from './pages/NouvelleOrganisation';
import Membres from './pages/Membres';
import NouvelleSeance from './pages/NouvelleSeance';
import Pointage from './pages/Pointage';
import Historique from './pages/Historique';
import Statistiques from './pages/Statistiques';
import ReglagesOrganisation from './pages/ReglagesOrganisation';
import ConnexionMembre from './pages/ConnexionMembre';
import EspaceMembre from './pages/EspaceMembre';
import MembreDetail from './pages/MembreDetail';
import ConnexionResponsable from './pages/ConnexionResponsable';
import DashboardResponsable from './pages/DashboardResponsable';
import MembresResponsable from './pages/MembresResponsable';
import PointageResponsable from './pages/PointageResponsable';
import Accueil from './pages/Accueil';
import FAQ from './pages/FAQ';
import Contact from './pages/Contact';
import PolitiqueConfidentialite from './pages/PolitiqueConfidentialite';
import ConditionsUtilisation from './pages/ConditionsUtilisation';
import Logo from './components/Logo';
import MonCompte from './pages/MonCompte';
import ComparaisonOrganisations from './pages/ComparaisonOrganisations';

function App() {
  return (
    <BrowserRouter>
      <div className="fixed top-3 right-3 z-50">
        <Logo size={40} />
      </div>
      <Routes>
        <Route path="/" element={<Accueil />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/politique-confidentialite" element={<PolitiqueConfidentialite />} />
        <Route path="/conditions-utilisation" element={<ConditionsUtilisation />} />
        <Route path="/connexion" element={<Connexion />} />
        <Route path="/inscription" element={<Inscription />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/organisation/nouvelle" element={<NouvelleOrganisation />} />
        <Route path="/membres" element={<Membres />} />
        <Route path="/membre/:membreId" element={<MembreDetail />} />
        <Route path="/seance/nouvelle" element={<NouvelleSeance />} />
        <Route path="/pointage/:seanceId" element={<Pointage />} />
        <Route path="/historique" element={<Historique />} />
        <Route path="/statistiques" element={<Statistiques />} />
        <Route path="/reglages" element={<ReglagesOrganisation />} />
        <Route path="/espace-membre/connexion" element={<ConnexionMembre />} />
        <Route path="/mon-espace" element={<EspaceMembre />} />
        <Route path="/responsable/connexion" element={<ConnexionResponsable />} />
        <Route path="/responsable/dashboard" element={<DashboardResponsable />} />
        <Route path="/responsable/membres" element={<MembresResponsable />} />
        <Route path="/responsable/pointage/:seanceId" element={<PointageResponsable />} />
        <Route path="/comparaison" element={<ComparaisonOrganisations />} />
        <Route path="*" element={<Navigate to="/" />} />
        <Route path="/mon-compte" element={<MonCompte />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;