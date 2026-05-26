import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Mission } from '../../../types';

interface MissionVariablesTabProps {
    formData: Mission;
    onChange: (updated: Mission) => void;
    variablesJson: string;
    setVariablesJson: (val: string) => void;
    jsonError: string;
    setJsonError: (val: string) => void;
}

export const MissionVariablesTab: React.FC<MissionVariablesTabProps> = ({
    formData,
    onChange,
    variablesJson,
    setVariablesJson,
    jsonError,
    setJsonError,
}) => {
    const handleVarChange = (val: string) => {
        setVariablesJson(val);
        try {
            const parsed = JSON.parse(val);
            onChange({ ...formData, variables: parsed });
            setJsonError('');
        } catch {
            setJsonError('Invalid JSON format');
        }
    };

    return (
        <section className="space-y-4 border border-border/50 p-6 rounded-xl bg-card shadow-sm">
            <h2 className="text-base font-bold text-white uppercase tracking-wider border-b border-border/40 pb-2 flex items-center gap-1.5">
                <span>Scenario Variables (JSON)</span>
                <span title="Input a JSON object/map with array values (e.g. { 'username': ['Alex', 'Bob'], 'product': ['Premium'] }). The system will run tests for all possible combinations.">
                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                </span>
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
                Define lists of inputs inside a JSON map. A separate test run will be triggered dynamically for each possible variable configuration.
            </p>
            <div>
                <textarea
                    className={`w-full h-64 font-mono rounded-md border bg-[#13161B] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring leading-relaxed ${jsonError ? 'border-destructive' : 'border-input'}`}
                    value={variablesJson}
                    onChange={(e) => handleVarChange(e.target.value)}
                />
                {jsonError && (
                    <span className="text-destructive text-xs mt-1 block">
                        {jsonError}
                    </span>
                )}
            </div>
        </section>
    );
};
