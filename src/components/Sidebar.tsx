import React from 'react';
import { NavLink } from 'react-router-dom';
import { FolderOpen, LayoutDashboard, ListRestart, Settings, HelpCircle, Info } from 'lucide-react';
import { useOnboardingStore } from '../store/useOnboardingStore';

export const Sidebar: React.FC = () => {
    const { setShowHelpMenu, setShowWelcomeModal } = useOnboardingStore();
    const links = [
        { name: 'Projects', path: '/', icon: <FolderOpen className="w-5 h-5" />, domId: 'sidebar-projects' },
        { name: 'All Missions', path: '/missions', icon: <LayoutDashboard className="w-5 h-5" />, domId: 'sidebar-missions' },
        { name: 'History', path: '/history', icon: <ListRestart className="w-5 h-5" />, domId: 'sidebar-history' },
        { name: 'Settings', path: '/settings', icon: <Settings className="w-5 h-5" />, domId: 'sidebar-settings' },
    ];

    return (
        <aside className="w-64 h-screen border-r border-border bg-card flex flex-col">
            <div id="sidebar-header" className="p-6 flex items-center gap-3">
                <img src="/icon.png" alt="AgentEval Logo" className="w-8 h-8 rounded-lg shadow-sm" />
                <h1 className="text-xl font-bold">AgentEval</h1>
            </div>
            <nav className="flex-1 px-4 space-y-2">
                {links.map((link) => (
                    <NavLink
                        key={link.path}
                        id={link.domId}
                        to={link.path}
                        end={link.path === '/'}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${isActive
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                            }`
                        }
                    >
                        {link.icon}
                        {link.name}
                    </NavLink>
                ))}
            </nav>
            <div className="px-4 py-3 border-t border-border bg-muted/10 space-y-1">
                <button
                    id="sidebar-about-button"
                    onClick={() => setShowWelcomeModal(true)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-md transition-all text-muted-foreground hover:bg-primary/10 hover:text-primary hover:font-medium cursor-pointer"
                >
                    <Info className="w-5 h-5" />
                    <span className="text-sm font-semibold">Sobre o Desenvolvedor</span>
                </button>
                <button
                    id="sidebar-help-button"
                    onClick={() => setShowHelpMenu(true)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-md transition-all text-muted-foreground hover:bg-primary/10 hover:text-primary hover:font-medium cursor-pointer"
                >
                    <HelpCircle className="w-5 h-5" />
                    <span className="text-sm font-semibold">Ajuda & Tutoriais</span>
                </button>
            </div>
            <div className="p-4 border-t border-border text-xs text-muted-foreground text-center bg-muted/5 font-semibold">
                v2.3.0 (Safety Modals & Stability Update)
            </div>
        </aside>
    );
};

