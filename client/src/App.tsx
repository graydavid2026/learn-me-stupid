import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AppShell } from './components/layout/AppShell';
import { StudyView } from './components/study/StudyView';
import { CardsView } from './components/cards/CardsView';
import { DeepDiveView } from './components/deepdive/DeepDiveView';
import { DashboardView } from './components/dashboard/DashboardView';
import { SettingsView } from './components/settings/SettingsView';
import { MemoryPalaceView } from './components/palace/MemoryPalaceView';
import { SearchOverlay } from './components/layout/SearchOverlay';
import { OnboardingFlow, useOnboarding } from './components/onboarding/OnboardingFlow';

export default function App() {
  const location = useLocation();
  const { showOnboarding, dismiss } = useOnboarding();

  return (
    <AppShell>
      {showOnboarding && <OnboardingFlow onComplete={dismiss} />}
      <SearchOverlay />
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          <Routes location={location}>
            <Route path="/" element={<Navigate to="/study" replace />} />
            <Route path="/study" element={<StudyView />} />
            <Route path="/cards" element={<CardsView />} />
            <Route path="/deep-dive" element={<DeepDiveView />} />
            <Route path="/stats" element={<DashboardView />} />
            <Route path="/palace" element={<MemoryPalaceView />} />
            <Route path="/settings" element={<SettingsView />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </AppShell>
  );
}
