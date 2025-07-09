// Security validation utilities
const validator = require('validator');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

class SecurityValidator {
    // Input validation
    static validateEmail(email) {
        return validator.isEmail(email) && validator.isLength(email, { max: 254 });
    }

    static validatePhone(phone) {
        const cleanPhone = phone.replace(/\D/g, '');
        return cleanPhone.length >= 10 && cleanPhone.length <= 11 && /^[0-9]+$/.test(cleanPhone);
    }

    static validateName(name) {
        return validator.isLength(name, { min: 2, max: 100 }) && 
               /^[a-zA-ZÀ-ÿ\s]+$/.test(name);
    }

    static validateCity(city) {
        return validator.isLength(city, { min: 2, max: 100 }) && 
               /^[a-zA-ZÀ-ÿ\s\-]+$/.test(city);
    }

    static validateNumber(number, min = 1, max = 999999) {
        const num = parseInt(number);
        return Number.isInteger(num) && num >= min && num <= max;
    }

    static validatePrice(price) {
        const num = parseFloat(price);
        return !isNaN(num) && num > 0 && num <= 10000;
    }

    static validateText(text, maxLength = 1000) {
        return validator.isLength(text, { max: maxLength }) && 
               !/<script|javascript:|data:/i.test(text);
    }

    // SQL injection prevention
    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        return input.replace(/['"\\]/g, '');
    }

    // XSS prevention
    static escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Rate limiting configurations
    static createRateLimit(windowMs = 15 * 60 * 1000, max = 100) {
        return rateLimit({
            windowMs: windowMs,
            max: max,
            message: {
                error: 'Muitas tentativas. Tente novamente mais tarde.'
            },
            standardHeaders: true,
            legacyHeaders: false,
        });
    }

    // Payment rate limiting (more restrictive)
    static paymentRateLimit() {
        return rateLimit({
            windowMs: 60 * 1000, // 1 minute
            max: 5, // 5 payment attempts per minute
            message: {
                error: 'Muitas tentativas de pagamento. Aguarde um momento.'
            }
        });
    }

    // Admin rate limiting
    static adminRateLimit() {
        return rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 10, // 10 admin attempts per 15 minutes
            message: {
                error: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
            }
        });
    }

    // Security headers
    static securityHeaders() {
        return helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
                    scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'", "https://api.mercadopago.com"],
                    fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'self'"],
                    frameSrc: ["'none'"],
                },
            },
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true
            }
        });
    }
}

module.exports = SecurityValidator;