import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CompassIntake from './pages/CompassIntake';
import WaitingRoom from './pages/WaitingRoom';
import Encounter from './pages/Encounter';
import Charting from './pages/Charting';
import VisitReview from './pages/VisitReview';

export default function App() {
  return (
    <Routes>
      {/* Compass — patient-facing, no clinician nav */}
      <Route path="/compass" element={<CompassIntake />} />
      <Route path="/compass/:patientId" element={<CompassIntake />} />

      {/* Clinician views — wrapped in Layout */}
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/waiting-room" element={<WaitingRoom />} />
        <Route path="/encounter/:id" element={<Encounter />} />
        <Route path="/charting/:id" element={<Charting />} />
        <Route path="/review/:id" element={<VisitReview />} />
      </Route>
    </Routes>
  );
}
