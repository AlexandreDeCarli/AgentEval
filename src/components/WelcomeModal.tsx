import React, { useState, useEffect } from 'react';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { 
    X, 
    Linkedin, 
    Github, 
    Coffee, 
    Sparkles, 
    User, 
    ArrowRight, 
    ExternalLink, 
    Globe,
    Eye,
    EyeOff,
    Key,
    Shield,
    ChevronLeft
} from 'lucide-react';

type ModalStep = 'welcome' | 'terms' | 'apiKey';

export const WelcomeModal: React.FC = () => {
    const {
        isHydrated,
        hasCompletedWelcomeModal,
        setHasCompletedWelcomeModal,
        showWelcomeModal,
        setShowWelcomeModal,
        triggerTour
    } = useOnboardingStore();

    const { geminiApiKey, setGeminiApiKey } = useSettingsStore();

    // Wizard step control
    const [step, setStep] = useState<ModalStep>('welcome');
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Sync input with the current store value when showing the modal
    useEffect(() => {
        if (isHydrated && (showWelcomeModal || !hasCompletedWelcomeModal)) {
            setApiKeyInput(geminiApiKey || '');
            setStep('welcome');
            setAcceptedTerms(false);
            setShowPassword(false);
        }
    }, [showWelcomeModal, hasCompletedWelcomeModal, geminiApiKey, isHydrated]);

    const isVisible = isHydrated && (!hasCompletedWelcomeModal || showWelcomeModal);

    if (!isVisible) return null;

    // Handles the general onboarding wizard close
    const handleCloseOnboarding = (startTutorial: boolean) => {
        const isFirstTime = !hasCompletedWelcomeModal;

        if (isFirstTime) {
            setHasCompletedWelcomeModal(true);
            setShowWelcomeModal(false);
            // Always trigger the guided onboarding tour on first access
            triggerTour();
        } else {
            setShowWelcomeModal(false);
            if (startTutorial) {
                triggerTour();
            }
        }
    };

    // Close button click handler
    const handleCloseButtonClick = () => {
        const isFirstTime = !hasCompletedWelcomeModal;

        if (isFirstTime) {
            if (step === 'welcome') {
                setStep('terms');
            } else if (step === 'terms') {
                setStep('apiKey');
            } else {
                handleCloseOnboarding(true);
            }
        } else {
            setShowWelcomeModal(false);
        }
    };

    // Save key and finish wizard
    const handleSaveAndFinish = () => {
        setGeminiApiKey(apiKeyInput.trim());
        handleCloseOnboarding(true);
    };

    const handleSkip = () => {
        handleCloseOnboarding(true);
    };

    const handleBackStep = () => {
        if (step === 'apiKey') {
            setStep('terms');
        } else if (step === 'terms') {
            setStep('welcome');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop blur with fade-in animation */}
            <div 
                className="absolute inset-0 bg-background/80 backdrop-blur-md transition-opacity duration-300 animate-modal-fade-in cursor-pointer"
                onClick={() => {
                    // Prevent accidental clicks outside on first-time usage
                    if (hasCompletedWelcomeModal) {
                        setShowWelcomeModal(false);
                    }
                }}
            />

            {/* Premium Modal Card */}
            <div className="relative bg-gradient-to-b from-[#111827] to-[#0b0f19] border border-white/[0.08] shadow-[0_25px_60px_rgba(0,0,0,0.8),_inset_0_1px_0_rgba(255,255,255,0.05)] rounded-2xl max-w-2xl w-full p-8 z-10 animate-modal-scale-in overflow-hidden">
                
                {/* Shiny top outline */}
                <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#4A72FF] to-transparent" />
                
                {/* Back Button */}
                {step !== 'welcome' && (
                    <button
                        onClick={handleBackStep}
                        className="absolute top-4 left-4 p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all duration-200 cursor-pointer flex items-center gap-1 text-xs font-semibold"
                        aria-label="Back"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Back</span>
                    </button>
                )}

                {/* Close Button (Visible only on manual open sessions) */}
                {hasCompletedWelcomeModal && (
                    <button
                        onClick={handleCloseButtonClick}
                        className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all duration-200 cursor-pointer"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}

                {/* --- STEP 1: WELCOME PRESENTATION --- */}
                {step === 'welcome' && (
                    <div className="space-y-6">
                        {/* Two-Column Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left pt-2">
                            
                            {/* Left Column: Project Overview */}
                            <div className="space-y-6 pr-0 md:pr-4 border-r-0 md:border-r border-white/[0.06] flex flex-col justify-start">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-[#4A72FF]">
                                        <Sparkles className="w-5 h-5 animate-pulse" />
                                        <span className="text-label">About the Project</span>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <h2 className="text-title text-white flex items-center gap-2">
                                            AgentEval
                                        </h2>
                                        <p className="text-label text-[#4A72FF]/90">
                                            Premium AI Agent Evaluation Platform
                                        </p>
                                    </div>

                                    <p className="text-body text-muted-foreground">
                                        <strong>AgentEval</strong> is a premium ecosystem designed to structure, execute, and analyze automated Quality Assurance (QA) tests on LLM-based conversational agents.
                                    </p>
 
                                    <div className="space-y-2 text-body text-slate-400">
                                        <div className="flex gap-2.5 items-start">
                                            <span className="text-[#4A72FF] mt-0.5">✔</span>
                                            <p><strong>Intelligent Evaluator:</strong> Gemini acts as a simulated user, dynamically testing your agent and scoring complex conversational success criteria.</p>
                                        </div>
                                        <div className="flex gap-2.5 items-start">
                                            <span className="text-[#4A72FF] mt-0.5">✔</span>
                                            <p><strong>Flexible Targets:</strong> Supports testing Gemini models directly or connecting to external APIs via highly configurable HTTP requests.</p>
                                        </div>
                                        <div className="flex gap-2.5 items-start">
                                            <span className="text-[#4A72FF] mt-0.5">✔</span>
                                            <p><strong>Variables & Criteria:</strong> Define parameterized test scenarios and strict success/failure rules in a fully visual dashboard.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Open Source Repository Highlight */}
                                <div className="p-4 rounded-xl border border-[#4A72FF]/30 bg-[#4A72FF]/5 space-y-3 relative overflow-hidden group hover:border-[#4A72FF]/50 transition-all duration-300">
                                    {/* Subtle background glow */}
                                    <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-[#4A72FF]/10 rounded-full blur-xl group-hover:bg-[#4A72FF]/15 transition-all duration-300" />
                                    
                                    <div className="flex items-center gap-2">
                                        <Github className="w-4 h-4 text-white" />
                                        <span className="text-label text-white font-extrabold tracking-wider uppercase">Open Source</span>
                                    </div>
                                    <p className="text-xs text-slate-300 relative z-10 leading-relaxed">
                                        AgentEval is open source. <strong>Every contribution is highly welcome!</strong> Join us on GitHub to help build the future of AI Agent QA.
                                    </p>
                                    <a 
                                        href="https://github.com/AlexandreDeCarli/AgentEval" 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#4A72FF] hover:bg-[#3b5cd9] active:scale-[0.98] text-white text-xs font-bold transition-all shadow-[0_2px_10px_rgba(74,114,255,0.2)] hover:shadow-[0_2px_15px_rgba(74,114,255,0.3)] relative z-10 w-fit"
                                    >
                                        <span>Access Repository</span>
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            </div>

                            {/* Right Column: Developer Presentation */}
                            <div className="space-y-6 flex flex-col justify-start">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-indigo-400">
                                        <User className="w-5 h-5" />
                                        <span className="text-label">Developer</span>
                                    </div>
 
                                    <div className="space-y-2">
                                        <h3 className="text-title text-white">Alexandre De Carli</h3>
                                        <p className="text-indigo-300 text-xs font-bold uppercase tracking-wider">
                                            Tech Manager & Hands-on Leader
                                        </p>
                                    </div>
 
                                    <p className="text-body text-muted-foreground leading-relaxed">
                                        Hands-on Tech Manager and Architect with 16 years of experience bridging software engineering, system architecture, and strategic business leadership. Experienced in leading multi-squads, defining engineering standards, and deploying platform architectures processing R$100B+ in annual transactions.
                                    </p>
                                    <p className="text-body text-muted-foreground leading-relaxed">
                                        Ecosystem specialist in applying AI to the development lifecycle—including multi-agent systems, LLMs (Gemini, OpenAI, Claude), and production-grade RAG—to act as a catalyst for engineering teams.{' '}
                                        <a 
                                            href="https://www.linkedin.com/in/alexandredecarli/" 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="text-[#4A72FF] hover:text-[#4A72FF]/85 hover:underline font-semibold inline-flex items-center gap-0.5"
                                        >
                                            See more <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </p>
                                </div>

                                {/* Social Links & Support */}
                                <div className="space-y-3">
                                    <span className="text-label text-slate-400 block">Connect with me</span>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        <a 
                                            href="https://potencial.tec.br" 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="flex items-center justify-between px-3 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-emerald-500/10 hover:border-emerald-500/40 text-muted-foreground hover:text-white text-xs font-semibold transition-all duration-200 group"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Globe className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                                                <span>potencial.tec.br</span>
                                            </div>
                                            <ExternalLink className="w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity" />
                                        </a>
 
                                        <a 
                                            href="https://www.linkedin.com/in/alexandredecarli/" 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="flex items-center justify-between px-3 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-[#0077b5]/10 hover:border-[#0077b5]/40 text-muted-foreground hover:text-white text-xs font-semibold transition-all duration-200 group"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Linkedin className="w-3.5 h-3.5 text-[#0077b5] group-hover:scale-110 transition-transform" />
                                                <span>LinkedIn</span>
                                            </div>
                                            <ExternalLink className="w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity" />
                                        </a>
 
                                        <a 
                                            href="https://github.com/AlexandreDeCarli" 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="flex items-center justify-between px-3 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.08] hover:border-slate-500/40 text-muted-foreground hover:text-white text-xs font-semibold transition-all duration-200 group"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Github className="w-3.5 h-3.5 text-white group-hover:scale-110 transition-transform" />
                                                <span>GitHub</span>
                                            </div>
                                            <ExternalLink className="w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity" />
                                        </a>
 
                                        <a 
                                            href="https://www.buymeacoffee.com/AlexandreDeCarli" 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="flex items-center justify-between px-3 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-[#ffdd00]/10 hover:border-[#ffdd00]/40 text-muted-foreground hover:text-[#ffdd00] text-xs font-semibold transition-all duration-200 group"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Coffee className="w-3.5 h-3.5 text-[#ffdd00] group-hover:scale-110 transition-transform" />
                                                <span>Buy Me a Coffee</span>
                                            </div>
                                            <ExternalLink className="w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity" />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Central Proceed Button */}
                        <div className="pt-4 flex flex-col items-center">
                            <button
                                onClick={() => setStep('terms')}
                                className="w-full max-w-sm px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#4A72FF] to-violet-500 hover:from-[#4A72FF]/95 hover:to-violet-400 text-white font-bold text-body tracking-wide uppercase shadow-[0_4px_20px_rgba(74,114,255,0.25)] hover:shadow-[0_4px_25px_rgba(74,114,255,0.35)] hover:-translate-y-[1px] transition-all duration-200 cursor-pointer active:scale-[0.98] active:translate-y-0 flex items-center justify-center gap-2 group"
                            >
                                <span>Get Started</span>
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                )}

                {/* --- STEP 2: TERMS OF USE --- */}
                {step === 'terms' && (
                    <div className="space-y-6 pt-2 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#4A72FF]/10 border border-[#4A72FF]/20 shadow-[0_0_15px_rgba(74,114,255,0.1)]">
                                <Shield className="w-6 h-6 text-[#4A72FF]" />
                            </div>
                            <h2 className="text-title text-white mt-2">
                                Terms of Use & Liability Limits
                            </h2>
                            <p className="text-label text-[#4A72FF]/90 uppercase">
                                Please read and accept the conditions before proceeding
                            </p>
                        </div>

                        {/* Scrollable Terms Textbox */}
                        <div className="overflow-y-auto max-h-56 pr-2 border border-white/[0.08] bg-white/[0.01] p-4 rounded-xl text-body text-muted-foreground space-y-4 text-left custom-scrollbar max-w-[75ch]">
                            <p>
                                Welcome to <strong>AgentEval</strong>! Before getting started, you must read and accept the terms of use, privacy policy, and liability limits established for this tool.
                            </p>
                            
                            <h4 className="text-label text-white">1. Free and Open Source Tool</h4>
                            <p>
                                AgentEval is provided completely <strong>free of charge and open source</strong>, designed to assist developers and QA analysts in the automated testing of AI conversational agents.
                            </p>
                            
                            <h4 className="text-label text-white">2. Zero Data Collection Policy</h4>
                            <p>
                                🔒 <strong>Complete Local Privacy:</strong> We value your privacy. AgentEval runs **100% locally and autonomously** in your web browser. **No data**, API credentials, project setups, custom system prompts, or execution histories are ever transmitted or saved on external servers.
                            </p>
                            
                            <h4 className="text-label text-white">3. Limitation of Liability</h4>
                            <p>
                                The software is provided "as is" at your own risk. The developer of AgentEval **assumes no legal or financial liability** in cases of:
                            </p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li><strong>External API Token Costs:</strong> Accumulated charges or high billing invoices resulting from using your own API keys (such as Google Gemini API) during test runs.</li>
                                <li><strong>Software Bugs or Failures:</strong> Data loss, local storage corruption, or inaccurate results generated by the evaluation engine.</li>
                                <li><strong>Improper Decisions:</strong> Code deployments made in production environments based on autonomous scores generated by the AI agent evaluator.</li>
                            </ul>
                            
                            <h4 className="text-label text-white">4. Independent Technologies</h4>
                            <p>
                                AgentEval integrates third-party tools (such as Google Gemini API, Tailwind CSS, React, etc.). Each of these services operates under its own independent terms. AgentEval is **not associated with** and shares no contractual liability with these brands.
                            </p>
                        </div>

                        {/* Consent Checkbox */}
                        <div className="flex items-center gap-3 justify-center pt-2">
                            <input 
                                type="checkbox" 
                                id="accept-terms-checkbox"
                                checked={acceptedTerms}
                                onChange={(e) => setAcceptedTerms(e.target.checked)}
                                className="w-4.5 h-4.5 rounded border-white/20 bg-[#111827] text-[#4A72FF] focus:ring-[#4A72FF]/40 cursor-pointer"
                            />
                            <label htmlFor="accept-terms-checkbox" className="text-body text-muted-foreground cursor-pointer select-none">
                                I have read and agree to the Terms of Use and Privacy Policy of AgentEval.
                            </label>
                        </div>

                        {/* Proceed Button */}
                        <div className="pt-2 flex flex-col items-center">
                            <button
                                disabled={!acceptedTerms}
                                onClick={() => setStep('apiKey')}
                                className={`w-full max-w-sm px-6 py-3.5 rounded-xl text-white font-bold text-body tracking-wide uppercase flex items-center justify-center gap-2 group transition-all duration-200 cursor-pointer ${
                                    acceptedTerms 
                                    ? 'bg-gradient-to-r from-[#4A72FF] to-violet-500 hover:from-[#4A72FF]/95 hover:to-violet-400 shadow-[0_4px_20px_rgba(74,114,255,0.25)] hover:shadow-[0_4px_25px_rgba(74,114,255,0.35)] hover:-translate-y-[1px] active:scale-[0.98]'
                                    : 'bg-white/5 text-slate-600 border border-white/5 cursor-not-allowed opacity-50'
                                }`}
                            >
                                <span>Accept and Proceed</span>
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                )}

                {/* --- STEP 3: API KEY CONFIGURATION --- */}
                {step === 'apiKey' && (
                    <div className="space-y-6 pt-2 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                                <Key className="w-6 h-6 text-amber-400" />
                            </div>
                            <h2 className="text-title text-white mt-2">
                                Gemini API Key (Evaluator Credentials)
                            </h2>
                            <p className="text-label text-amber-400/80 uppercase">
                                Required to execute intelligent conversational QA simulations
                            </p>
                        </div>

                        {/* Local Privacy Warning */}
                        <div className="border border-amber-500/20 bg-muted p-4 rounded-xl text-left text-body text-muted-foreground space-y-2 max-w-[75ch] mx-auto">
                            <p>
                                AgentEval uses **Gemini 2.5 Pro** to intelligently simulate user interactions, chatting with your agent and scoring conversational success metrics.
                            </p>
                            <p className="text-body text-amber-400/90 font-medium">
                                🔒 <strong>Guaranteed Local Security:</strong> Thanks to our local Web Crypto AES-GCM encryption layer, your API key is encrypted and stored locally in your browser's IndexedDB. It is **never** sent to any external servers.
                            </p>
                        </div>

                        {/* API Key Input Field */}
                        <div className="space-y-2 text-left max-w-lg mx-auto">
                            <div className="flex items-center justify-between">
                                <label className="text-label text-slate-400">
                                    Gemini API Key
                                </label>
                                <a 
                                    href="https://aistudio.google.com/" 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-label text-[#4A72FF] hover:text-[#4A72FF]/80 flex items-center gap-1 transition-colors group"
                                >
                                    <span>Get a free API key at AI Studio</span>
                                    <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                                </a>
                            </div>
                            <div className="relative">
                                <input 
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Paste your API key here (e.g., AIzaSy...)"
                                    value={apiKeyInput}
                                    onChange={(e) => setApiKeyInput(e.target.value)}
                                    className="w-full bg-[#0b0f19]/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#4A72FF]/50 focus:border-transparent placeholder:text-slate-600 transition-all font-mono"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Save & Finish Action Buttons */}
                        <div className="pt-2 flex flex-col items-center gap-3">
                            <button
                                onClick={handleSaveAndFinish}
                                className="w-full max-w-sm px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#4A72FF] to-violet-500 hover:from-[#4A72FF]/95 hover:to-violet-400 text-white font-bold text-body tracking-wide uppercase shadow-[0_4px_20px_rgba(74,114,255,0.25)] hover:shadow-[0_4px_25px_rgba(74,114,255,0.35)] hover:-translate-y-[1px] transition-all duration-200 cursor-pointer active:scale-[0.98] active:translate-y-0 flex items-center justify-center gap-2 group"
                            >
                                <span>Save and Start Onboarding</span>
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                            
                            <button
                                onClick={handleSkip}
                                className="text-label text-slate-500 hover:text-slate-300 font-medium transition-colors cursor-pointer"
                            >
                                Skip for now / Configure later
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};
