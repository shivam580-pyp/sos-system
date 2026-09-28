/**
 * Zero-Dependency Password Hashing & Encryption Service
 * Uses Node.js native crypto module for secure authentication & PII protection.
 */
const crypto = require('crypto');

class CryptoService {
    /**
     * Hash password using SHA-256 with salt
     */
    static hashPassword(password) {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
        return { salt, hash };
    }

    /**
     * Verify password against stored salt and hash
     */
    static verifyPassword(password, salt, storedHash) {
        const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
        return hash === storedHash;
    }

    /**
     * Generate secure random session token
     */
    static generateToken() {
        return crypto.randomBytes(32).toString('hex');
    }
}

module.exports = CryptoService;
