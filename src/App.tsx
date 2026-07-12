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
import { OnboardingTour } from './components/OnboardingTour';
import { HelpMenu } from './components/HelpMenu';
import { WelcomeModal } from './components/WelcomeModal';
import { TestExecutionWidget } from './components/TestExecutionWidget';
import { ToastContainer } from './components/ui/ToastContainer';

import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error.message, error.stack, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-[#0b0f19] text-foreground animate-fade-in">
          <div className="relative bg-gradient-to-b from-[#111827] to-[#0b0f19] border border-white/[0.08] shadow-[0_25px_60px_rgba(0,0,0,0.8),_inset_0_1px_0_rgba(255,255,255,0.05)] rounded-2xl max-w-2xl w-full p-8 overflow-hidden text-center space-y-6">
            {/* Top red glow line */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
            
            {/* Warning Icon */}
            <div className="relative flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-red-500/10 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>

            {/* Error Message */}
            <div className="space-y-2">
              <h3 className="text-title text-white uppercase">Application Error</h3>
              <p className="text-body text-slate-400 max-w-md mx-auto">
                An unexpected error occurred in the application shell. You can retry or reload the page.
              </p>
              <div className="mt-4 text-body font-mono text-red-400 bg-red-500/[0.03] border border-red-500/25 px-4 py-2.5 rounded-lg break-all max-w-full shadow-inner inline-block">
                {this.state.error.message}
              </div>
            </div>

            {/* Stack trace detail */}
            {this.state.error.stack && (
              <div className="text-left bg-[#13161B] border border-white/[0.04] p-4 rounded-xl max-h-48 overflow-y-auto custom-scrollbar">
                <span className="text-label text-slate-500 block mb-1">Stack Trace</span>
                <pre className="text-[10px] font-mono text-slate-400 whitespace-pre-wrap break-all leading-normal">
                  {this.state.error.stack}
                </pre>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 rounded-lg border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white text-label transition-all duration-200 cursor-pointer active:scale-[0.98] border-b-[2px] border-b-black/20 hover:border-white/[0.12]"
              >
                Reload Page
              </button>
              <button
                onClick={() => this.setState({ error: null })}
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white text-label font-bold transition-all duration-200 cursor-pointer active:scale-[0.98] active:translate-y-0"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="flex h-[calc(100dvh-4rem)] md:h-screen bg-background text-foreground overflow-hidden">
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
      <OnboardingTour />
      <HelpMenu />
      <WelcomeModal />
      <TestExecutionWidget />
      <ToastContainer />
    </BrowserRouter>
  );
};

export default App;
