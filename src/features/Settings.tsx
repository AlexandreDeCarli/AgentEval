import React, { useState, useCallback, useEffect } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Key } from 'lucide-react';

export const Settings: React.FC = () => {
    const { geminiApiKey, setGeminiApiKey } = useSettingsStore();

    const [inputKey, setInputKey] = useState(geminiApiKey);
    const [showKey, setShowKey] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSave = useCallback(() => {
        setGeminiApiKey(inputKey);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    }, [inputKey, setGeminiApiKey]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleSave]);

    return (
        <div className="p-8 max-w-3xl mx-auto">
            <div className="mb-8 select-none">
                <h1 className="text-display text-white">Settings</h1>
                <p className="text-label text-muted-foreground mt-1">Configure global application settings.</p>
            </div>

            <div className="border border-border bg-card rounded-xl shadow-sm p-6 space-y-6">
                <div>
                    <h2 className="text-title flex items-center gap-2">
                        <Key className="w-5 h-5 text-primary" /> API Keys
                    </h2>
                    <p className="text-body text-muted-foreground mb-4 max-w-[75ch]">
                        The Tester and Evaluator agents use Gemini. If a project tests a Gemini
                        model directly, AgentEval reuses this same Google AI Studio API key for the
                        target call.
                    </p>

                    <div className="space-y-2">
                        <label className="text-label">Gemini API Key</label>
                        <div className="flex gap-3">
                            <Input
                                type={showKey ? "text" : "password"}
                                value={inputKey}
                                onChange={(e) => setInputKey(e.target.value)}
                                placeholder="AIzaSy..."
                                className="font-mono bg-background"
                            />
                            <Button variant="outline" onClick={() => setShowKey(!showKey)}>
                                {showKey ? 'Hide' : 'Show'}
                            </Button>
                        </div>
                        <p className="text-label text-muted-foreground">
                            Stored locally in AgentEval settings on this machine.
                        </p>
                    </div>
                </div>

                <div className="pt-4 border-t border-border flex items-center gap-4">
                    <Button onClick={handleSave}>Save Settings</Button>
                    {saved && <span className="text-body text-green-500 font-medium">Saved successfully!</span>}
                </div>
            </div>
        </div>
    );
};
