/**
 * Polyfill for crypto.randomUUID() for older mobile browsers
 * Ensures compatibility with iOS Safari < 15.4 and older Android Chrome
 */

// Check if native randomUUID exists, if not add polyfill
if (typeof crypto !== 'undefined' && !crypto.randomUUID) {
    crypto.randomUUID = function () {
        // RFC4122 version 4 UUID
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };
}

// Also ensure globalThis.crypto exists for older environments
if (typeof globalThis !== 'undefined' && !globalThis.crypto) {
    globalThis.crypto = crypto;
}

export { }; // Make this a module
