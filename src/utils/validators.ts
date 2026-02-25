import { ValidationError } from "./errors.js";
import { VALIDATION } from "../constants/config.js";

/**
 * Validation utilities for data validation
 */

/**
 * Validates date format (YYYY-MM-DD)
 * @param date - Date string to validate
 * @throws {ValidationError} If date format is invalid
 */
export function validateDate(date: string): void {
    if (!date) {
        throw new ValidationError('Date must be a non-empty string');
    }

    if (!VALIDATION.DATE_FORMAT.test(date)) {
        throw new ValidationError(`Invalid date format: ${date}. Expected YYYY-MM-DD`);
    }

    // Check if it's a valid date
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
        throw new ValidationError(`Invalid date value: ${date}`);
    }
}

/**
 * Validates spreadsheet ID format
 * @param spreadsheetId - Spreadsheet ID to validate
 * @throws {ValidationError} If ID is invalid
 */
export function validateSpreadsheetId(spreadsheetId: string): void {
    if (!spreadsheetId) {
        throw new ValidationError('Spreadsheet ID must be a non-empty string');
    }

    if (spreadsheetId.trim().length === 0) {
        throw new ValidationError('Spreadsheet ID cannot be empty');
    }

    // Google Sheets IDs are typically 44 characters
    if (spreadsheetId.length < 20) {
        throw new ValidationError(`Spreadsheet ID seems too short: ${spreadsheetId}`);
    }
}

/**
 * Validates warehouse name
 * @param name - Warehouse name to validate
 * @throws {ValidationError} If name is invalid
 */
export function validateWarehouseName(name: string): void {
    if (!name) {
        throw new ValidationError('Warehouse name must be a non-empty string');
    }

    const trimmed = name.trim();
    if (trimmed.length === 0) {
        throw new ValidationError('Warehouse name cannot be empty');
    }

    if (trimmed.length > VALIDATION.MAX_WAREHOUSE_NAME_LENGTH) {
        throw new ValidationError(
            `Warehouse name too long (max ${VALIDATION.MAX_WAREHOUSE_NAME_LENGTH} chars)`
        );
    }
}
