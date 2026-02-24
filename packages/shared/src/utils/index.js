"use strict";
/**
 * Shared utility functions for use across all apps.
 * Add common, pure utilities here — keep this free of Node-only or browser-only APIs.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeJsonParse = safeJsonParse;
exports.sleep = sleep;
exports.stripTrailingSlash = stripTrailingSlash;
/**
 * Safely parses a JSON string, returning null on failure.
 */
function safeJsonParse(value) {
    try {
        return JSON.parse(value);
    }
    catch {
        return null;
    }
}
/**
 * Returns a promise that resolves after `ms` milliseconds.
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Strips trailing slashes from a URL string.
 */
function stripTrailingSlash(url) {
    return url.replace(/\/+$/, "");
}
//# sourceMappingURL=index.js.map