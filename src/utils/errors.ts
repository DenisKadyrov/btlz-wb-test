/**
 * Custom error classes for better error handling
 */

/**
 * Base application error
 */
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * WB API related errors
 */
export class WBApiError extends AppError {
    constructor(message: string, statusCode: number = 500) {
        super(`WB API Error: ${message}`, statusCode);
    }
}

/**
 * Database related errors
 */
export class DatabaseError extends AppError {
    constructor(message: string) {
        super(`Database Error: ${message}`, 500);
    }
}

/**
 * Google Sheets related errors
 */
export class GoogleSheetsError extends AppError {
    constructor(message: string) {
        super(`Google Sheets Error: ${message}`, 500);
    }
}

/**
 * Validation errors
 */
export class ValidationError extends AppError {
    constructor(message: string) {
        super(`Validation Error: ${message}`, 400);
    }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends AppError {
    constructor(message: string) {
        super(`Configuration Error: ${message}`, 500, false);
    }
}
