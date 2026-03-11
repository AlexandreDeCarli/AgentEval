import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMissionStore, defaultMockMission } from '../store/useMissionStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Mission } from '../types';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';

export const MissionEditor: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { missions, addMission, updateMission } = useMissionStore();

    const isNew = id === 'new';

    const [formData, setFormData] = useState<Mission>({
        id: crypto.randomUUID(),
        titulo: 'New Mission',
        target_system_prompt: '',
        tester_persona: '',
        mission_goal: '',
        variables: {},
        max_turns: 8,
        api_config: {
            post_url: '',
            get_url: '',
            auth_header: '',
            payload_template: '{\n  "message": "{{message}}"\n}',
            response_path: '',
            polling_interval: 2000,
            max_timeout: 30
        }
    });

    const [variablesJson, setVariablesJson] = useState('{}');
    const [jsonError, setJsonError] = useState('');

    useEffect(() => {
        if (!isNew && id) {
            const existing = missions.find(m => m.id === id);
            if (existing) {
                setFormData(existing);
                setVariablesJson(JSON.stringify(existing.variables, null, 2));
            } else {
                navigate('/');
            }
        } else if (isNew) {
            setVariablesJson(JSON.stringify(defaultMockMission.variables, null, 2));
            setFormData(prev => ({ ...prev, variables: defaultMockMission.variables }));
        }
    }, [id, isNew, missions, navigate]);

    const handleVarChange = (val: string) => {
        setVariablesJson(val);
        try {
            const parsed = JSON.parse(val);
            setFormData(prev => ({ ...prev, variables: parsed }));
            setJsonError('');
        } catch (e) {
            setJsonError('Invalid JSON format');
        }
    };

    const handleSave = () => {
        if (jsonError) return alert('Fix JSON errors before saving');
        if (isNew) {
            addMission(formData);
        } else {
            updateMission(formData.id, formData);
        }
        navigate('/');
    };

    const handleAddCriterion = () => {
        setFormData(prev => ({
            ...prev,
            evaluation_criteria: [
                ...(prev.evaluation_criteria || []),
                { id: `crit-${Date.now()}`, name: '', description: '' }
            ]
        }));
    };

    const handleUpdateCriterion = (index: number, field: string, value: string) => {
        setFormData(prev => {
            const newCriteria = [...(prev.evaluation_criteria || [])];
            newCriteria[index] = { ...newCriteria[index], [field]: value };
            return { ...prev, evaluation_criteria: newCriteria };
        });
    };

    const handleRemoveCriterion = (index: number) => {
        setFormData(prev => {
            const newCriteria = [...(prev.evaluation_criteria || [])];
            newCriteria.splice(index, 1);
            return { ...prev, evaluation_criteria: newCriteria };
        });
    };

    return (
        <div className="p-8 max-w-4xl mx-auto pb-24">
            <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <h1 className="text-3xl font-bold tracking-tight">{isNew ? 'Create Mission' : 'Edit Mission'}</h1>
                <div className="ml-auto">
                    <Button onClick={handleSave} className="gap-2">
                        <Save className="w-4 h-4" /> Save Mission
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* General Info */}
                <section className="space-y-4 border border-border p-6 rounded-xl bg-card">
                    <h2 className="text-xl font-semibold border-b border-border pb-2">General Info</h2>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Mission Title</label>
                        <Input
                            value={formData.titulo}
                            onChange={e => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Mission Goal <span className="text-muted-foreground font-normal">(Use {'{{var}}'} for variables)</span></label>
                        <textarea
                            className="w-full h-20 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            value={formData.mission_goal}
                            onChange={e => setFormData(prev => ({ ...prev, mission_goal: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Tester Persona (Instructions for Test Agent)</label>
                        <textarea
                            className="w-full h-24 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            value={formData.tester_persona}
                            onChange={e => setFormData(prev => ({ ...prev, tester_persona: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Variables (JSON)</label>
                        <textarea
                            className={`w-full h-32 font-mono rounded-md border bg-muted px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${jsonError ? 'border-destructive' : 'border-input'}`}
                            value={variablesJson}
                            onChange={e => handleVarChange(e.target.value)}
                        />
                        {jsonError && <span className="text-destructive text-xs mt-1 block">{jsonError}</span>}
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Max Turns (Conversation length limit)</label>
                        <Input
                            type="number"
                            value={formData.max_turns}
                            onChange={e => setFormData(prev => ({ ...prev, max_turns: parseInt(e.target.value) || 8 }))}
                        />
                    </div>
                </section>

                {/* Evaluation Info */}
                <section className="space-y-4 border border-border p-6 rounded-xl bg-card">
                    <h2 className="text-xl font-semibold border-b border-border pb-2">Evaluation Settings</h2>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Target System Prompt (Used by evaluator to suggest improvements)</label>
                        <textarea
                            className="w-full h-32 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            value={formData.target_system_prompt}
                            onChange={e => setFormData(prev => ({ ...prev, target_system_prompt: e.target.value }))}
                        />
                    </div>

                    <div className="pt-4 border-t border-border mt-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <label className="text-sm font-medium block">Custom Evaluation Criteria</label>
                                <p className="text-xs text-muted-foreground">The Evaluator LLM will grade the interaction against these specific rules.</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={handleAddCriterion} className="h-8 gap-2">
                                <Plus className="w-3 h-3" /> Add Criterion
                            </Button>
                        </div>
                        <div className="space-y-4">
                            {(formData.evaluation_criteria || []).map((crit, idx) => (
                                <div key={crit.id} className="flex gap-4 items-start bg-muted p-4 rounded-lg border border-border">
                                    <div className="flex-1 space-y-3">
                                        <Input
                                            placeholder="Criterion Name (e.g., Tone, Accuracy)"
                                            value={crit.name}
                                            onChange={e => handleUpdateCriterion(idx, 'name', e.target.value)}
                                            className="bg-background h-8 font-semibold"
                                        />
                                        <textarea
                                            placeholder="Description: How should the AI evaluate this?"
                                            className="w-full h-16 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            value={crit.description}
                                            onChange={e => handleUpdateCriterion(idx, 'description', e.target.value)}
                                        />
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => handleRemoveCriterion(idx)} className="text-destructive hover:bg-destructive/10 mt-1 h-8 w-8 p-0">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                            {(!formData.evaluation_criteria || formData.evaluation_criteria.length === 0) && (
                                <div className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg border-border">
                                    No custom criteria defined. The evaluator will use its default judgment.
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* API Info */}
                <section className="space-y-4 border border-border p-6 rounded-xl bg-card">
                    <h2 className="text-xl font-semibold border-b border-border pb-2">API Integration (Target Agent)</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">POST URL (Send Message)</label>
                            <Input
                                placeholder="https://api.example.com/chat"
                                value={formData.api_config.post_url}
                                onChange={e => setFormData(prev => ({ ...prev, api_config: { ...prev.api_config, post_url: e.target.value } }))}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">GET URL (Polling)</label>
                            <Input
                                placeholder="https://api.example.com/chat/history"
                                value={formData.api_config.get_url}
                                onChange={e => setFormData(prev => ({ ...prev, api_config: { ...prev.api_config, get_url: e.target.value } }))}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Authorization Header</label>
                        <Input
                            placeholder="Bearer token..."
                            value={formData.api_config.auth_header}
                            onChange={e => setFormData(prev => ({ ...prev, api_config: { ...prev.api_config, auth_header: e.target.value } }))}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Payload Template (JSON) <span className="text-muted-foreground font-normal">Use {'{{message}}'}</span></label>
                        <textarea
                            className="w-full h-32 font-mono bg-muted rounded-md border border-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            value={formData.api_config.payload_template}
                            onChange={e => setFormData(prev => ({ ...prev, api_config: { ...prev.api_config, payload_template: e.target.value } }))}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Response Data Path <span className="text-muted-foreground font-normal">(e.g., `data.messages[-1].content`)</span></label>
                        <Input
                            placeholder="data.messages[-1].content"
                            value={formData.api_config.response_path}
                            onChange={e => setFormData(prev => ({ ...prev, api_config: { ...prev.api_config, response_path: e.target.value } }))}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Polling Interval (ms)</label>
                            <Input
                                type="number"
                                value={formData.api_config.polling_interval}
                                onChange={e => setFormData(prev => ({ ...prev, api_config: { ...prev.api_config, polling_interval: parseInt(e.target.value) || 2000 } }))}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Max Timeout (s)</label>
                            <Input
                                type="number"
                                value={formData.api_config.max_timeout}
                                onChange={e => setFormData(prev => ({ ...prev, api_config: { ...prev.api_config, max_timeout: parseInt(e.target.value) || 30 } }))}
                            />
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};
