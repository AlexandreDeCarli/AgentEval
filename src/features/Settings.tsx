import React, { useState } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Key } from 'lucide-react';

export const Settings: React.FC = () => {
    const { geminiApiKey, setGeminiApiKey } = useSettingsStore();

    const [inputKey, setInputKey] = useState(geminiApiKey);
    const [showKey, setShowKey] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        setGeminiApiKey(inputKey);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="p-8 max-w-3xl mx-auto">
            <div className="mb-8 select-none">
                <h1 className="text-3xl font-extrabold tracking-tight text-white uppercase">Settings</h1>
                <p className="text-xs text-muted-foreground mt-1 tracking-wider font-bold uppercase">Configure global application settings.</p>
            </div>

            <div className="border border-border bg-card rounded-xl shadow-sm p-6 space-y-6">
                <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Key className="w-5 h-5 text-primary" /> API Keys
                    </h2>
                    <p className="text-sm text-muted-foreground mb-4">
                        The Tester and Evaluator agents use Gemini. If a project tests a Gemini
                        model directly, AgentEval reuses this same Google AI Studio API key for the
                        target call.
                    </p>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Gemini API Key</label>
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
                        <p className="text-xs text-muted-foreground">
                            Stored locally in AgentEval settings on this machine.
                        </p>
                    </div>
                </div>

                <div className="pt-4 border-t border-border flex items-center gap-4">
                    <Button onClick={handleSave}>Save Settings</Button>
                    {saved && <span className="text-sm text-green-500 font-medium">Saved successfully!</span>}
                </div>
            </div>
        </div>
    );
};
