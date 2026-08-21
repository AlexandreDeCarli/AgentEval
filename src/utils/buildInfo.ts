// Inject build constants defined by Vite during compilation
export const APP_VERSION =
    typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.5.0';

export const APP_BUILD_TIME =
    typeof __APP_BUILD_TIME__ !== 'undefined'
        ? __APP_BUILD_TIME__
        : new Date().toISOString();

export const formatBuildDate = (isoString = APP_BUILD_TIME): string => {
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return isoString;
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        }).format(date);
    } catch {
        return isoString;
    }
};

export const formatBuildDateShort = (isoString = APP_BUILD_TIME): string => {
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return isoString;
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch {
        return isoString;
    }
};
