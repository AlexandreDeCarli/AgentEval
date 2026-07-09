import React from 'react';
import { Braces, CheckCircle2, Loader2 } from 'lucide-react';
import { ChatMessage } from '../types';
import {
    ChatMessageContentDescription,
    describeChatMessageContent,
} from '../utils/chatMessageFormatting';

interface ChatBubbleProps {
    message: ChatMessage;
    animateTyping?: boolean;
    onTypingComplete?: () => void;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message, animateTyping, onTypingComplete }) => {
    const isTester = message.role === 'tester';
    const [displayedText, setDisplayedText] = React.useState(animateTyping ? '' : message.content);
    const formattedContent = React.useMemo(
        () => describeChatMessageContent(message.structuredContent ?? message.content),
        [message.content, message.structuredContent]
    );

    React.useEffect(() => {
        if (!animateTyping) {
            setDisplayedText(message.content);
            return;
        }

        let i = 0;
        const speed = 40; // ms per char
        const timer = setInterval(() => {
            setDisplayedText(message.content.substring(0, i));
            i++;
            if (i > message.content.length) {
                clearInterval(timer);
                if (onTypingComplete) onTypingComplete();
            }
        }, speed);

        return () => clearInterval(timer);
    }, [message.content, animateTyping, onTypingComplete]);

    const isStructured = formattedContent.kind !== 'plain_text';
    const bubbleWidth = isStructured ? 'max-w-[85%] md:max-w-[44rem]' : 'max-w-[75%]';
    const roleStyles = isTester
        ? 'bg-blue-600/20 text-blue-100 border border-blue-500/30'
        : 'bg-purple-600/20 text-purple-100 border border-purple-500/30';
    const cursorStyles = isTester ? 'bg-blue-400' : 'bg-purple-400';

    return (
        <div className={`flex w-full mb-4 ${isTester ? 'justify-start' : 'justify-end'}`}>
            <div className={`${bubbleWidth} min-w-0 rounded-lg p-4 ${roleStyles}`}>
                <div className="text-xs font-semibold mb-1 opacity-70 flex justify-between items-center">
                    <span>{isTester ? 'Tester (Simulated User)' : 'Target Agent'}</span>
                    <span className="font-normal text-[0.65rem] ml-4">{new Date(message.timestamp).toLocaleTimeString()}</span>
                </div>
                {isStructured ? (
                    <StructuredMessageContent description={formattedContent} />
                ) : (
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {displayedText}
                        {(animateTyping || message.isProcessing) && displayedText.length <= message.content.length && (
                            <span className={`inline-block w-1.5 h-4 ml-0.5 animate-pulse align-middle ${cursorStyles}`}></span>
                        )}
                    </div>
                )}
                {message.isProcessing && (
                    <div className="mt-2 text-[0.65rem] text-purple-300/80 font-medium italic flex items-center gap-1.5">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Target is still processing...
                    </div>
                )}
                {message.isCompletedFlag && (
                    <div className="mt-2 text-xs text-green-400 font-semibold border border-green-400/30 rounded px-2 py-1 inline-flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Mission Completed Declared
                    </div>
                )}
            </div>
        </div>
    );
};

type StructuredDescription = Extract<
    ChatMessageContentDescription,
    { kind: 'function_call' | 'structured_output' }
>;

const StructuredMessageContent: React.FC<{ description: StructuredDescription }> = ({ description }) => {
    const isFunctionCall = description.kind === 'function_call';

    return (
        <div className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-label ${
                    isFunctionCall
                        ? 'border-amber-400/25 bg-amber-400/10 text-amber-200'
                        : 'border-[#4A72FF]/25 bg-[#4A72FF]/10 text-blue-100'
                }`}>
                    <Braces className="h-3.5 w-3.5" />
                    {description.title}
                </span>
                {description.topLevelKeys.slice(0, 5).map((key) => (
                    <span
                        key={key}
                        className="rounded border border-white/10 bg-[#13161B]/70 px-2 py-1 font-mono text-[0.68rem] leading-none text-slate-300"
                    >
                        {key}
                    </span>
                ))}
                {description.topLevelKeys.length > 5 && (
                    <span className="text-[0.68rem] text-slate-400">
                        +{description.topLevelKeys.length - 5} more
                    </span>
                )}
            </div>

            {description.summaryFields.length > 0 && (
                <div className="space-y-2 rounded-lg border border-white/10 bg-[#13161B]/55 p-3">
                    {description.summaryFields.map((field) => (
                        <div key={field.label} className="space-y-1">
                            <div className="text-label text-slate-400">{field.label}</div>
                            <div className={`whitespace-pre-wrap break-words leading-relaxed ${
                                field.tone === 'code'
                                    ? 'font-mono text-xs text-emerald-200'
                                    : 'text-slate-100'
                            }`}>
                                {field.value}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="space-y-1.5">
                <div className="text-label text-slate-400">JSON payload</div>
                <pre className="max-h-72 overflow-auto rounded-lg border border-white/10 bg-[#0f1217] p-3 font-mono text-xs leading-relaxed text-slate-200 whitespace-pre-wrap break-words">
                    {description.formattedJson}
                </pre>
            </div>
        </div>
    );
};
