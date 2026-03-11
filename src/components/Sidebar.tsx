import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ListRestart, Settings, Bot } from 'lucide-react';

export const Sidebar: React.FC = () => {
    const links = [
        { name: 'Missions', path: '/', icon: <LayoutDashboard className="w-5 h-5" /> },
        { name: 'History', path: '/history', icon: <ListRestart className="w-5 h-5" /> },
        { name: 'Settings', path: '/settings', icon: <Settings className="w-5 h-5" /> },
    ];

    return (
        <aside className="w-64 h-screen border-r border-border bg-card flex flex-col">
            <div className="p-6 flex items-center gap-3">
                <Bot className="w-8 h-8 text-primary" />
                <h1 className="text-xl font-bold">Agent QA</h1>
            </div>
            <nav className="flex-1 px-4 space-y-2">
                {links.map((link) => (
                    <NavLink
                        key={link.path}
                        to={link.path}
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
            <div className="p-4 border-t border-border text-xs text-muted-foreground text-center">
                v1.0.0
            </div>
        </aside>
    );
};
