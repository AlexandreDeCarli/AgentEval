// A specialized mock interceptor using monkey-patching on fetch.
// In a real app we might use MSW (Mock Service Worker), but for this demo, monkey-patching is easier.

const originalFetch = window.fetch;

let mockMessages: Array<{ role: string; content: string }> = [];

export const enableMockService = () => {
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

        if (url.includes('/mock/api/messages')) {
            // Handle the Mock POST
            if (init?.method === 'POST') {
                const body = JSON.parse(init.body as string);
                const userMsg = body.message;

                mockMessages.push({ role: 'user', content: userMsg });

                // Simulate async processing...
                setTimeout(() => {
                    const fakeTargetResponse = [
                        "Olá! Como posso te ajudar hoje?",
                        "Temos várias opções disponíveis. Qual seu orçamento?",
                        "Entendido. Vou verificar essa informação para você.",
                        "Desculpe, não entendi. Pode reformular?",
                        "O processo foi concluído com sucesso. Algo mais?"
                    ][Math.floor(Math.random() * 5)];

                    mockMessages.push({ role: 'assistant', content: fakeTargetResponse });
                }, 3000); // 3 seconds delay for target response

                return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
            }

            // Handle the Mock GET (Polling)
            if (!init?.method || init?.method === 'GET') {
                const currentMessages = [...mockMessages];
                return new Response(
                    JSON.stringify({
                        data: {
                            messages: currentMessages,
                        },
                    }),
                    { status: 200 }
                );
            }
        }

        // Fallback to original fetch
        return originalFetch(input, init);
    };
};

export const resetMockService = () => {
    mockMessages = [];
};
