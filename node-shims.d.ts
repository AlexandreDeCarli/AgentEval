declare module 'fs' {
    const fs: {
        mkdirSync(path: string, options?: { recursive?: boolean }): void;
        existsSync(path: string): boolean;
        readFileSync(path: string, encoding: string): string;
        writeFileSync(path: string, data: string, encoding: string): void;
        unlinkSync(path: string): void;
    };

    export default fs;
}

declare module 'path' {
    const path: {
        resolve(...parts: string[]): string;
        basename(path: string): string;
        join(...parts: string[]): string;
    };

    export default path;
}
