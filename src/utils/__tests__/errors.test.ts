import { describe, it, expect } from '@jest/globals';
import {
    AppError,
    WBApiError,
    DatabaseError,
    GoogleSheetsError,
    ValidationError,
    ConfigurationError,
} from '../errors.js';

describe('Error Classes', () => {
    describe('AppError', () => {
        it('should create error with default values', () => {
            const error = new AppError('Test error');

            expect(error.message).toBe('Test error');
            expect(error.statusCode).toBe(500);
            expect(error.isOperational).toBe(true);
            expect(error.name).toBe('AppError');
        });

        it('should create error with custom status code', () => {
            const error = new AppError('Test error', 400);

            expect(error.statusCode).toBe(400);
        });

        it('should create error with non-operational flag', () => {
            const error = new AppError('Test error', 500, false);

            expect(error.isOperational).toBe(false);
        });

        it('should be instance of Error', () => {
            const error = new AppError('Test error');

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(AppError);
        });
    });

    describe('WBApiError', () => {
        it('should extend AppError', () => {
            const error = new WBApiError('API error', 503);

            expect(error).toBeInstanceOf(AppError);
            expect(error).toBeInstanceOf(WBApiError);
            expect(error.name).toBe('WBApiError');
            expect(error.statusCode).toBe(503);
        });
    });

    describe('DatabaseError', () => {
        it('should extend AppError', () => {
            const error = new DatabaseError('DB error');

            expect(error).toBeInstanceOf(AppError);
            expect(error).toBeInstanceOf(DatabaseError);
            expect(error.name).toBe('DatabaseError');
        });
    });

    describe('GoogleSheetsError', () => {
        it('should extend AppError', () => {
            const error = new GoogleSheetsError('Sheets error');

            expect(error).toBeInstanceOf(AppError);
            expect(error).toBeInstanceOf(GoogleSheetsError);
            expect(error.name).toBe('GoogleSheetsError');
        });
    });

    describe('ValidationError', () => {
        it('should extend AppError with 400 status', () => {
            const error = new ValidationError('Invalid input');

            expect(error).toBeInstanceOf(AppError);
            expect(error).toBeInstanceOf(ValidationError);
            expect(error.name).toBe('ValidationError');
            expect(error.statusCode).toBe(400);
        });
    });

    describe('ConfigurationError', () => {
        it('should extend AppError', () => {
            const error = new ConfigurationError('Config error');

            expect(error).toBeInstanceOf(AppError);
            expect(error).toBeInstanceOf(ConfigurationError);
            expect(error.name).toBe('ConfigurationError');
        });
    });

    describe('Error stack traces', () => {
        it('should capture stack trace', () => {
            const error = new AppError('Test error');

            expect(error.stack).toBeDefined();
            expect(error.stack).toContain('AppError');
        });
    });
});
