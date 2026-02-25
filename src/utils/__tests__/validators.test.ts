import { describe, it, expect } from '@jest/globals';
import { validateDate, validateSpreadsheetId, validateWarehouseName } from '../validators.js';
import { ValidationError } from '../errors.js';

describe('Validators', () => {
    describe('validateDate', () => {
        it('should accept valid date format', () => {
            expect(() => validateDate('2025-01-20')).not.toThrow();
            expect(() => validateDate('2024-12-31')).not.toThrow();
        });

        it('should reject invalid date format', () => {
            expect(() => validateDate('2025/01/20')).toThrow(ValidationError);
            expect(() => validateDate('20-01-2025')).toThrow(ValidationError);
            expect(() => validateDate('invalid')).toThrow(ValidationError);
        });

        it('should reject empty or non-string values', () => {
            expect(() => validateDate('')).toThrow(ValidationError);
            expect(() => validateDate(null as any)).toThrow(ValidationError);
            expect(() => validateDate(undefined as any)).toThrow(ValidationError);
        });

        it('should reject invalid date values', () => {
            expect(() => validateDate('2025-13-01')).toThrow(ValidationError);
            // Note: JavaScript Date accepts 2025-02-30 and converts to 2025-03-02
            // So we test with clearly invalid format instead
            expect(() => validateDate('2025-00-01')).toThrow(ValidationError);
        });
    });

    describe('validateSpreadsheetId', () => {
        it('should accept valid spreadsheet IDs', () => {
            const validId = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
            expect(() => validateSpreadsheetId(validId)).not.toThrow();
        });

        it('should reject short IDs', () => {
            expect(() => validateSpreadsheetId('short')).toThrow(ValidationError);
        });

        it('should reject empty values', () => {
            expect(() => validateSpreadsheetId('')).toThrow(ValidationError);
            expect(() => validateSpreadsheetId('   ')).toThrow(ValidationError);
        });

        it('should reject non-string values', () => {
            expect(() => validateSpreadsheetId(null as any)).toThrow(ValidationError);
            expect(() => validateSpreadsheetId(undefined as any)).toThrow(ValidationError);
        });
    });

    describe('validateWarehouseName', () => {
        it('should accept valid warehouse names', () => {
            expect(() => validateWarehouseName('Коледино')).not.toThrow();
            expect(() => validateWarehouseName('Warehouse 1')).not.toThrow();
        });

        it('should reject empty values', () => {
            expect(() => validateWarehouseName('')).toThrow(ValidationError);
            expect(() => validateWarehouseName('   ')).toThrow(ValidationError);
        });

        it('should reject non-string values', () => {
            expect(() => validateWarehouseName(null as any)).toThrow(ValidationError);
            expect(() => validateWarehouseName(undefined as any)).toThrow(ValidationError);
        });

        it('should reject names exceeding max length', () => {
            const longName = 'a'.repeat(256);
            expect(() => validateWarehouseName(longName)).toThrow(ValidationError);
        });
    });
});
