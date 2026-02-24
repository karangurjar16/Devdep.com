/**
 * Shared utility functions for use across all apps.
 * Add common, pure utilities here — keep this free of Node-only or browser-only APIs.
 */

/**
 * Safely parses a JSON string, returning null on failure.
 */
export function safeJsonParse<T = unknown>(value: string): T | null {
    try {
        return JSON.parse(value) as T;
    } catch {
        return null;
    }
}

/**
 * Returns a promise that resolves after `ms` milliseconds.
 */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Strips trailing slashes from a URL string.
 */
export function stripTrailingSlash(url: string): string {
    return url.replace(/\/+$/, "");
}
