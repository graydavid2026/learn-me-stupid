import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { StudyView } from './components/study/StudyView';
import { CardsView } from './components/cards/CardsView';
import { MindMapView } from './components/mindmap/MindMapView';
import { DashboardView } from './components/dashboard/DashboardView';

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/study" replace />} />
        <Route path="/study" element={<StudyView />} />
        <Route path="/cards" element={<CardsView />} />
        <Route path="/mindmap" element={<MindMapView />} />
        <Route path="/stats" element={<DashboardView />} />
      </Routes>
    </AppShell>
  );
}
