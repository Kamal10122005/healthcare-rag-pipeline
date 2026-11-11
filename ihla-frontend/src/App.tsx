import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/shell/AppShell';
import { AssistantPage } from '@/pages/AssistantPage';
import { EvidencePage } from '@/pages/EvidencePage';
import { LibraryPage } from '@/pages/LibraryPage';
import { KnowledgePage } from '@/pages/KnowledgePage';
import { SafetyPage } from '@/pages/SafetyPage';
import { SettingsPage } from '@/pages/SettingsPage';

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/assistant" replace />} />
        <Route path="/assistant" element={<AssistantPage />} />
        <Route path="/evidence" element={<EvidencePage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/knowledge" element={<KnowledgePage />} />
        <Route path="/safety" element={<SafetyPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/assistant" replace />} />
      </Route>
    </Routes>
  );
}
