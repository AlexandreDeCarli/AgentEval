import React from 'react';
import { HelpCircle, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Mission, EvaluationCriterion } from '../../../types';

interface MissionCriteriaTabProps {
    formData: Mission;
    onChange: (updated: Mission) => void;
}

export const MissionCriteriaTab: React.FC<MissionCriteriaTabProps> = ({
    formData,
    onChange,
}) => {
    const criteria = formData.evaluation_criteria || [];

    const handleAddCriterion = () => {
        const newCriterion: EvaluationCriterion = {
            id: crypto.randomUUID(),
            name: '',
            description: '',
        };
        onChange({
            ...formData,
            evaluation_criteria: [...criteria, newCriterion]
        });
    };

    const handleUpdateCriterion = (idx: number, field: keyof EvaluationCriterion, val: string) => {
        onChange({
            ...formData,
            evaluation_criteria: criteria.map((c, i) =>
                i === idx ? { ...c, [field]: val } : c
            )
        });
    };

    const handleRemoveCriterion = (idx: number) => {
        onChange({
            ...formData,
            evaluation_criteria: criteria.filter((_, i) => i !== idx)
        });
    };

    return (
        <section className="space-y-4 border border-border/50 p-6 rounded-xl bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <span>Evaluation Criteria</span>
                    <span title="Define the list of checks or rules that Gemini will evaluate at the end of the chat. The score (0-100) will be calculated based on passing these criteria.">
                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                    </span>
                </h2>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddCriterion}
                    className="h-8 gap-2 font-bold text-xs uppercase"
                >
                    <Plus className="w-3 h-3" /> Add Criterion
                </Button>
            </div>
            <p className="text-xs text-muted-foreground">
                The Evaluator LLM will grade the interaction against these specific rules.
            </p>
            <div className="space-y-4">
                {criteria.map((crit, idx) => (
                    <div
                        key={crit.id}
                        className="flex gap-4 items-start bg-muted/40 p-4 rounded-lg border border-border/40"
                    >
                        <div className="flex-1 space-y-3">
                            <Input
                                placeholder="Criterion Name (e.g., Tone, Accuracy)"
                                value={crit.name}
                                onChange={(e) =>
                                    handleUpdateCriterion(idx, 'name', e.target.value)
                                }
                                className="bg-[#13161B] h-8 font-semibold"
                            />
                            <textarea
                                placeholder="Description: How should the AI evaluate this?"
                                className="w-full h-16 rounded-md border border-input bg-[#13161B] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                value={crit.description}
                                onChange={(e) =>
                                    handleUpdateCriterion(
                                        idx,
                                        'description',
                                        e.target.value
                                    )
                                }
                            />
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveCriterion(idx)}
                            className="text-destructive hover:bg-destructive/10 mt-1 h-8 w-8 p-0"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                ))}
                {criteria.length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-8 border border-dashed rounded-lg border-border/50">
                        No custom criteria defined. The evaluator will use its default judgment.
                    </div>
                )}
            </div>
        </section>
    );
};
