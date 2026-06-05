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
        <aside className="w-64 h-screen border-r border-border bg-card flex flex-col select-none">
            {/* Header with gradient logo ring and BETA tag */}
            <div id="sidebar-header" className="p-6 flex items-center justify-between gap-2 border-b border-border/40">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#4A72FF] to-[#1c2e6b] flex items-center justify-center p-[2.5px] shadow-[0_0_15px_rgba(74,114,255,0.25)]">
                        <div className="w-full h-full rounded-full bg-[#1C2026] flex items-center justify-center text-xs font-bold text-white tracking-tight">
                            AE
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <h1 className="text-sm font-extrabold text-[#F9FAFB] tracking-tight">AgentEval</h1>
                            <span className="text-[7.5px] font-extrabold px-1.5 py-0.5 bg-[#4A72FF]/20 text-[#4A72FF] rounded uppercase tracking-widest border border-[#4A72FF]/30">BETA</span>
                        </div>
                        <span className="text-label text-muted-foreground block font-bold">AI Test Mission Engine</span>
                    </div>
                </div>
            </div>

            {/* Navigation links with active side marker */}
            <nav className="flex-1 py-6 space-y-1.5">
                {links.map((link) => (
                    <NavLink
                        key={link.path}
                        id={link.domId}
                        to={link.path}
                        end={link.path === '/'}
                        className={({ isActive }) =>
                            `flex items-center gap-3 mx-3 px-3 py-3 rounded-lg transition-all ${isActive
                                ? 'bg-[#4A72FF]/15 text-[#4A72FF] font-semibold'
                                : 'text-muted-foreground hover:bg-[#272D35] hover:text-foreground'
                            }`
                        }
                    >
                        {link.icon}
                        <span className="text-body font-semibold">{link.name}</span>
                    </NavLink>
                ))}
            </nav>

            {/* Sidebar footer */}
            <div className="px-4 py-4 border-t border-border/40 bg-[#13161B]/35 space-y-1.5">
                <button
                    id="sidebar-about-button"
                    onClick={() => setShowWelcomeModal(true)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-muted-foreground hover:bg-[#272D35] hover:text-foreground cursor-pointer text-left"
                >
                    <Info className="w-5 h-5 text-muted-foreground" />
                    <span className="text-body font-bold">About the Developer</span>
                </button>
                <button
                    id="sidebar-help-button"
                    onClick={() => setShowHelpMenu(true)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-muted-foreground hover:bg-[#272D35] hover:text-foreground cursor-pointer text-left"
                >
                    <HelpCircle className="w-5 h-5 text-muted-foreground" />
                    <span className="text-body font-bold">Help & Tutorials</span>
                </button>
            </div>
            <div className="p-3 border-t border-border text-label text-muted-foreground text-center bg-[#13161B]/50 font-bold">
                v2.3.2
            </div>
        </aside>
    );
};

