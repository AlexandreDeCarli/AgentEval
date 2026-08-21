export interface ModelFallbackResult<T> {
    model: string;
    result: T;
}

export const isNonRetryableGeminiError = (error: unknown): boolean => {
    const msg = error instanceof Error ? error.message : String(error);
    // 400 (Bad Request), 401 (Invalid API Key / Unauthorized), 403 (Forbidden / Permission Denied)
    if (
        /\b(400|401|403)\b/.test(msg) ||
        /API Key is required/i.test(msg) ||
        /API_KEY_INVALID/i.test(msg)
    ) {
        return true;
    }
    return false;
};

export const executeWithModelFallback = async <T>(
    models: string[],
    attemptFn: (model: string) => Promise<T>,
    routineName = 'LLM'
): Promise<ModelFallbackResult<T>> => {
    if (!models || models.length === 0) {
        throw new Error(`[${routineName}] No models specified for execution.`);
    }

    const errors: string[] = [];

    for (let i = 0; i < models.length; i++) {
        const model = models[i];
        try {
            const result = await attemptFn(model);
            return { model, result };
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            errors.push(`[${model}]: ${msg}`);

            // If it's an unrecoverable auth or bad request error, fail fast without iterating further
            if (isNonRetryableGeminiError(err)) {
                throw new Error(
                    `[${routineName}] Fatal non-retryable error on (${model}): ${msg}`
                );
            }

            if (i < models.length - 1) {
                console.warn(
                    `[${routineName}] Model (${model}) failed, trying fallback (${models[i + 1]})...`,
                    err
                );
            }
        }
    }

    throw new Error(
        `[${routineName}] All attempted models failed (${models.join(', ')}):\n${errors.join('\n')}`
    );
};
