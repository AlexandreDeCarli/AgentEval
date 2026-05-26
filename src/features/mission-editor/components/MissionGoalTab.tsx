import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Input } from '../../../components/ui/Input';
import { Mission } from '../../../types';

interface MissionGoalTabProps {
    formData: Mission;
    onChange: (updated: Mission) => void;
}

export const MissionGoalTab: React.FC<MissionGoalTabProps> = ({
    formData,
    onChange,
}) => {
    return (
        <section className="space-y-4 border border-border/50 p-6 rounded-xl bg-card shadow-sm">
            <h2 className="text-base font-bold text-white uppercase tracking-wider border-b border-border/40 pb-2">
                Mission Goal Config
            </h2>
            <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <span>Mission Title</span>
                    <span title="Give your mission a short and descriptive title (e.g., 'Discount Negotiation' or 'Secret Leak Test').">
                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                    </span>
                </label>
                <Input
                    value={formData.titulo}
                    onChange={(e) => onChange({ ...formData, titulo: e.target.value })}
                />
            </div>
            <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <span>Mission Goal</span>
                    <span className="text-muted-foreground font-normal">
                        (Use {'{{var}}'} for variables)
                    </span>
                    <span title="Define what the evaluator should try to achieve when talking to the agent under test. You can inject variables dynamically.">
                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                    </span>
                </label>
                <textarea
                    className="w-full h-24 rounded-md border border-input bg-[#13161B] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring leading-relaxed"
                    value={formData.mission_goal}
                    onChange={(e) => onChange({ ...formData, mission_goal: e.target.value })}
                />
            </div>
            <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <span>Tester Persona (Instructions for Test Agent)</span>
                    <span title="Define the role, tone, personality, or behavioral guidelines for the Intelligent Evaluator (e.g., 'Act as an angry, impatient customer').">
                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                    </span>
                </label>
                <textarea
                    className="w-full h-28 rounded-md border border-input bg-[#13161B] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring leading-relaxed"
                    value={formData.tester_persona}
                    onChange={(e) => onChange({ ...formData, tester_persona: e.target.value })}
                />
            </div>
            <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <span>Max Turns (Conversation length limit)</span>
                    <span title="The maximum number of message rounds allowed before ending the conversation and making the evaluation.">
                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                    </span>
                </label>
                <Input
                    type="number"
                    value={formData.max_turns}
                    onChange={(e) => onChange({ ...formData, max_turns: parseInt(e.target.value) || 8 })}
                />
            </div>
        </section>
    );
};
