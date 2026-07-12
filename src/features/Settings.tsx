import React, { KeyboardEvent, Suspense, useRef, useState } from 'react';
import { BarChart3, KeyRound, Move } from 'lucide-react';
import { AiConfigurationSettings } from './settings/AiConfigurationSettings';
import { WorkspaceMigrationSettings } from './settings/WorkspaceMigrationSettings';

const AiUsageDashboard = React.lazy(() =>
    import('./settings/AiUsageDashboard').then((module) => ({ default: module.AiUsageDashboard }))
);

type SettingsSection = 'ai' | 'usage' | 'workspace';

const sections = [
    { key: 'ai' as const, label: 'AI Configuration', shortLabel: 'AI', icon: KeyRound },
    { key: 'usage' as const, label: 'Usage & Costs', shortLabel: 'Usage', icon: BarChart3 },
    { key: 'workspace' as const, label: 'Workspace Migration', shortLabel: 'Migration', icon: Move },
];

export const Settings: React.FC = () => {
    const [activeSection, setActiveSection] = useState<SettingsSection>('ai');
    const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

    const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
        let nextIndex: number | null = null;
        if (event.key === 'ArrowRight') nextIndex = (index + 1) % sections.length;
        if (event.key === 'ArrowLeft') nextIndex = (index - 1 + sections.length) % sections.length;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = sections.length - 1;
        if (nextIndex === null) return;
        event.preventDefault();
        setActiveSection(sections[nextIndex].key);
        tabRefs.current[nextIndex]?.focus();
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            <header>
                <h1 className="text-display text-white">Settings</h1>
                <p className="text-body text-muted-foreground mt-1">Configure AI access, inspect usage, and move workspace data.</p>
            </header>

            <div className="overflow-x-auto border-b border-border">
                <div className="flex min-w-max gap-1" role="tablist" aria-label="Settings sections">
                    {sections.map(({ key, label, shortLabel, icon: Icon }, index) => (
                        <button
                            ref={(element) => { tabRefs.current[index] = element; }}
                            key={key}
                            id={`settings-tab-${key}`}
                            type="button"
                            role="tab"
                            aria-label={label}
                            aria-selected={activeSection === key}
                            aria-controls={`settings-panel-${key}`}
                            tabIndex={activeSection === key ? 0 : -1}
                            onClick={() => setActiveSection(key)}
                            onKeyDown={(event) => handleTabKeyDown(event, index)}
                            className={`min-h-11 px-4 inline-flex items-center gap-2 border-b-2 text-body font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
                                activeSection === key
                                    ? 'border-[#4A72FF] text-white'
                                    : 'border-transparent text-muted-foreground hover:text-white hover:bg-muted/30'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            <span className="sm:hidden">{shortLabel}</span>
                            <span className="hidden sm:inline">{label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div
                id={`settings-panel-${activeSection}`}
                role="tabpanel"
                aria-labelledby={`settings-tab-${activeSection}`}
                className="animate-fade-in"
            >
                {activeSection === 'ai' && <AiConfigurationSettings />}
                {activeSection === 'usage' && (
                    <Suspense fallback={<div className="h-80 animate-pulse rounded-lg bg-card" aria-label="Loading usage dashboard" />}>
                        <AiUsageDashboard />
                    </Suspense>
                )}
                {activeSection === 'workspace' && <WorkspaceMigrationSettings />}
            </div>
        </div>
    );
};
