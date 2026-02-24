/**
 * Shared utility functions for use across all apps.
 * Add common, pure utilities here — keep this free of Node-only or browser-only APIs.
 */
/**
 * Safely parses a JSON string, returning null on failure.
 */
export declare function safeJsonParse<T = unknown>(value: string): T | null;
/**
 * Returns a promise that resolves after `ms` milliseconds.
 */
export declare function sleep(ms: number): Promise<void>;
/**
 * Strips trailing slashes from a URL string.
 */
export declare function stripTrailingSlash(url: string): string;
//# sourceMappingURL=index.d.ts.map