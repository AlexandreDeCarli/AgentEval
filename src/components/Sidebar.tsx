import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Ellipsis, FolderOpen, LayoutDashboard, ListRestart, Settings, HelpCircle, Info } from 'lucide-react';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { APP_VERSION, APP_BUILD_TIME, formatBuildDate, formatBuildDateShort } from '../utils/buildInfo';

export const Sidebar: React.FC = () => {
    const { setShowHelpMenu, setShowWelcomeModal } = useOnboardingStore();
    const [showMobileMore, setShowMobileMore] = useState(false);
    const mobileMoreButtonRef = useRef<HTMLButtonElement>(null);
    const mobileMoreMenuRef = useRef<HTMLDivElement>(null);
    const firstMobileMenuItemRef = useRef<HTMLButtonElement>(null);
    const links = [
        { name: 'Projects', path: '/', icon: <FolderOpen className="w-5 h-5" />, domId: 'sidebar-projects' },
        { name: 'All Missions', path: '/missions', icon: <LayoutDashboard className="w-5 h-5" />, domId: 'sidebar-missions' },
        { name: 'History', path: '/history', icon: <ListRestart className="w-5 h-5" />, domId: 'sidebar-history' },
        { name: 'Settings', path: '/settings', icon: <Settings className="w-5 h-5" />, domId: 'sidebar-settings' },
    ];

    useEffect(() => {
        if (!showMobileMore) return;
        firstMobileMenuItemRef.current?.focus();
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            setShowMobileMore(false);
            mobileMoreButtonRef.current?.focus();
        };
        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target as Node;
            if (
                mobileMoreMenuRef.current?.contains(target) ||
                mobileMoreButtonRef.current?.contains(target)
            ) return;
            setShowMobileMore(false);
        };
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('pointerdown', handlePointerDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('pointerdown', handlePointerDown);
        };
    }, [showMobileMore]);

    return (
        <>
        <aside className="hidden md:flex w-64 h-screen border-r border-border bg-card flex-col select-none">
            {/* Header with gradient logo ring and BETA tag */}
            <div id="sidebar-header" className="p-6 border-b border-border/40">
                <Link to="/" className="flex items-center gap-2.5 group cursor-pointer decoration-none">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#4A72FF] to-[#1c2e6b] flex items-center justify-center p-[2.5px] shadow-[0_0_15px_rgba(74,114,255,0.25)] group-hover:shadow-[0_0_20px_rgba(74,114,255,0.4)] transition-all duration-300">
                        <div className="w-full h-full rounded-full bg-[#1C2026] flex items-center justify-center text-xs font-bold text-white tracking-tight">
                            AE
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <h1 className="text-sm font-extrabold text-[#F9FAFB] tracking-tight group-hover:text-[#4A72FF] transition-colors">AgentEval</h1>
                            <span className="text-label px-1.5 py-0.5 bg-[#4A72FF]/20 text-[#4A72FF] rounded border border-[#4A72FF]/30">BETA</span>
                        </div>
                        <span className="text-label text-muted-foreground block font-bold">AI Test Mission Engine</span>
                    </div>
                </Link>
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
            <div
                className="p-3 border-t border-border text-center bg-[#13161B]/50 select-none group cursor-default"
                title={`Build: ${formatBuildDate(APP_BUILD_TIME)} (${APP_BUILD_TIME})`}
            >
                <div className="text-label text-slate-300 font-bold flex items-center justify-center gap-1.5">
                    <span>v{APP_VERSION}</span>
                    <span className="w-1 h-1 rounded-full bg-primary/60"></span>
                    <span className="text-muted-foreground font-mono text-[10px]" title={`Build timestamp: ${APP_BUILD_TIME}`}>
                        {formatBuildDateShort(APP_BUILD_TIME)}
                    </span>
                </div>
            </div>
        </aside>
        {showMobileMore && (
            <div
                ref={mobileMoreMenuRef}
                className="md:hidden fixed right-3 bottom-[4.75rem] z-50 w-56 overflow-hidden rounded-lg border border-border bg-card shadow-[0_18px_40px_rgba(0,0,0,0.45)]"
            >
                <div id="mobile-more-menu" role="menu" aria-label="More options">
                    <button
                        ref={firstMobileMenuItemRef}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                            setShowMobileMore(false);
                            setShowWelcomeModal(true);
                        }}
                        className="min-h-11 w-full px-4 flex items-center gap-3 text-body text-muted-foreground hover:bg-muted hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                    >
                        <Info className="w-5 h-5" /> About the Developer
                    </button>
                    <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                            setShowMobileMore(false);
                            setShowHelpMenu(true);
                        }}
                        className="min-h-11 w-full px-4 flex items-center gap-3 text-body text-muted-foreground hover:bg-muted hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                    >
                        <HelpCircle className="w-5 h-5" /> Help & Tutorials
                    </button>
                </div>
                <div
                    className="px-4 py-2 border-t border-border/40 text-center bg-[#13161B]/30 select-none"
                    title={`Build: ${formatBuildDate(APP_BUILD_TIME)} (${APP_BUILD_TIME})`}
                >
                    <div className="text-[11px] text-slate-300 font-bold flex items-center justify-center gap-1.5">
                        <span>v{APP_VERSION}</span>
                        <span className="w-1 h-1 rounded-full bg-primary/60"></span>
                        <span className="text-muted-foreground font-mono text-[10px]">
                            {formatBuildDateShort(APP_BUILD_TIME)}
                        </span>
                    </div>
                </div>
            </div>
        )}
        <nav className="md:hidden fixed inset-x-0 bottom-0 z-40 h-16 border-t border-border bg-card flex items-stretch select-none" aria-label="Primary navigation">
            {links.map((link) => (
                <NavLink
                    key={link.path}
                    to={link.path}
                    end={link.path === '/'}
                    onClick={() => setShowMobileMore(false)}
                    className={({ isActive }) =>
                        `flex-1 min-w-0 flex flex-col items-center justify-center gap-1 px-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${
                            isActive ? 'text-[#4A72FF] bg-[#4A72FF]/10' : 'text-muted-foreground'
                        }`
                    }
                >
                    {React.cloneElement(link.icon, { className: 'w-5 h-5' })}
                    <span className="text-xs font-bold truncate max-w-full">{link.name}</span>
                </NavLink>
            ))}
            <button
                ref={mobileMoreButtonRef}
                type="button"
                aria-label="More navigation options"
                aria-haspopup="menu"
                aria-expanded={showMobileMore}
                aria-controls="mobile-more-menu"
                onClick={() => setShowMobileMore((visible) => !visible)}
                className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-1 px-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${
                    showMobileMore ? 'text-[#4A72FF] bg-[#4A72FF]/10' : 'text-muted-foreground'
                }`}
            >
                <Ellipsis className="w-5 h-5" />
                <span className="text-xs font-bold">More</span>
            </button>
        </nav>
        </>
    );
};
