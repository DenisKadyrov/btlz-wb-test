/**
 * Application-wide constants
 */

/**
 * API endpoints and configuration
 */
export const API_CONFIG = {
    WB_BASE_URL: "https://common-api.wildberries.ru/api/v1",
    WB_TARIFFS_ENDPOINT: "/tariffs/box",
    REQUEST_TIMEOUT: 30000, // 30 seconds
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000, // 1 second
} as const;

/**
 * Database configuration
 */
export const DB_CONFIG = {
    TABLE_TARIFFS: "box_tariffs",
    TABLE_SPREADSHEETS: "spreadsheets",
    CONNECTION_POOL_MIN: 2,
    CONNECTION_POOL_MAX: 10,
    IDLE_TIMEOUT: 30000, // 30 seconds
    CONNECTION_TIMEOUT: 5000, // 5 seconds
} as const;

/**
 * Google Sheets configuration
 */
export const SHEETS_CONFIG = {
    SHEET_NAME: "stocks_coefs",
    SCOPES: ["https://www.googleapis.com/auth/spreadsheets"],
    BATCH_SIZE: 1000,
    MAX_RETRIES: 3,
    RETRY_DELAY: 2000, // 2 seconds
} as const;

/**
 * Scheduler configuration
 */
export const SCHEDULER_CONFIG = {
    HOURLY_CRON: "0 * * * *", // Every hour at minute 0
    TIMEZONE: "Europe/Moscow",
} as const;

/**
 * Validation rules
 */
export const VALIDATION = {
    DATE_FORMAT: /^\d{4}-\d{2}-\d{2}$/,
    MAX_WAREHOUSE_NAME_LENGTH: 255,
    MAX_GEO_NAME_LENGTH: 255,
} as const;
