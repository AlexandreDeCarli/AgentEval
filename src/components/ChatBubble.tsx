import React from 'react';
import { ChatMessage } from '../types';

interface ChatBubbleProps {
    message: ChatMessage;
    animateTyping?: boolean;
    onTypingComplete?: () => void;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message, animateTyping, onTypingComplete }) => {
    const isTester = message.role === 'tester';
    const [displayedText, setDisplayedText] = React.useState(animateTyping ? '' : message.content);

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

    return (
        <div className={`flex w-full mb-4 ${isTester ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[75%] rounded-lg p-4 ${isTester ? 'bg-blue-600/20 text-blue-100 border border-blue-500/30' : 'bg-purple-600/20 text-purple-100 border border-purple-500/30'}`}>
                <div className="text-xs font-semibold mb-1 opacity-70 flex justify-between items-center">
                    <span>{isTester ? 'Tester (Simulated User)' : 'Target Agent'}</span>
                    <span className="font-normal text-[0.65rem] ml-4">{new Date(message.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="whitespace-pre-wrap text-sm">
                    {displayedText}
                    {(animateTyping || message.isProcessing) && displayedText.length <= message.content.length && (
                        <span className={`inline-block w-1.5 h-4 ml-0.5 animate-pulse align-middle ${isTester ? 'bg-blue-400' : 'bg-purple-400'}`}></span>
                    )}
                </div>
                {message.isProcessing && (
                    <div className="mt-2 text-[0.65rem] text-purple-300/80 font-medium italic flex items-center gap-1.5">
                        <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Target is still processing...
                    </div>
                )}
                {message.isCompletedFlag && (
                    <div className="mt-2 text-xs text-green-400 font-semibold border border-green-400/30 rounded px-2 py-1 inline-block">
                        ✓ Mission Completed Declared
                    </div>
                )}
            </div>
        </div>
    );
};
