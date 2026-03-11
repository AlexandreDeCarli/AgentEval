import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { MissionList } from './features/MissionList';
import { MissionEditor } from './features/MissionEditor';
import { TestRunner } from './features/TestRunner';
import { TestHistory } from './features/TestHistory';
import { Settings } from './features/Settings';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-background text-foreground overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto relative">
          <Routes>
            <Route path="/" element={<MissionList />} />
            <Route path="/missions/:id" element={<MissionEditor />} />
            <Route path="/run/:missionId" element={<TestRunner />} />
            <Route path="/history" element={<TestHistory />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;
