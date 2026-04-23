import React, { Component, ErrorInfo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { ProjectList } from './features/ProjectList';
import { ProjectEditor } from './features/ProjectEditor';
import { MissionList } from './features/MissionList';
import { MissionEditor } from './features/MissionEditor';
import { TestRunner } from './features/TestRunner';
import { TestHistory } from './features/TestHistory';
import { Settings } from './features/Settings';

class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error.message, error.stack, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, color: '#ff6b6b', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
          <h2>Error</h2>
          <p>{this.state.error.message}</p>
          <pre style={{ fontSize: 11, opacity: 0.7 }}>{this.state.error.stack}</pre>
          <button onClick={() => this.setState({ error: null })} style={{ marginTop: 20, padding: '8px 16px' }}>
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-background text-foreground overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto relative">
          <ErrorBoundary>
          <Routes>
            <Route path="/" element={<ProjectList />} />
            <Route path="/projects/:id" element={<ProjectEditor />} />
            <Route path="/missions" element={<MissionList />} />
            <Route path="/missions/:id" element={<MissionEditor />} />
            <Route path="/run/:missionId" element={<TestRunner />} />
            <Route path="/history" element={<TestHistory />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </ErrorBoundary>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;
