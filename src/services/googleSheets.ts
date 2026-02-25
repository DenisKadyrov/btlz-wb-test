import { google } from "googleapis";
import env from "#config/env/env.js";
import knex from "#postgres/knex.js";
import type { TariffExportRow } from "../types/tariffs.js";
import { getLogger } from "../utils/logger.js";
import { GoogleSheetsError, ConfigurationError } from "../utils/errors.js";
import { SHEETS_CONFIG, DB_CONFIG } from "../constants/config.js";
import { validateSpreadsheetId } from "../utils/validators.js";

const logger = getLogger("sheets");

/**
 * Service for exporting data to Google Sheets
 * Follows Single Responsibility Principle
 *
 * Features:
 * - Automatic retry on failures
 * - Batch processing for large datasets
 * - Structured error handling
 * - Detailed logging
 */
export class GoogleSheetsService {
    private readonly auth;
    private readonly sheets;
    private readonly maxRetries: number;
    private readonly retryDelay: number;

    constructor(maxRetries: number = SHEETS_CONFIG.MAX_RETRIES, retryDelay: number = SHEETS_CONFIG.RETRY_DELAY) {
        try {
            if (!env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !env.GOOGLE_PRIVATE_KEY) {
                throw new ConfigurationError(
                    "Google credentials are missing. Please set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY"
                );
            }

            this.auth = new google.auth.GoogleAuth({
                credentials: {
                    client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                    private_key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
                },
                scopes: [...SHEETS_CONFIG.SCOPES],
            });

            this.sheets = google.sheets({ version: "v4", auth: this.auth });
            this.maxRetries = maxRetries;
            this.retryDelay = retryDelay;

            logger.info("Google Sheets service initialized successfully");
        } catch (error) {
            logger.error("Failed to initialize Google Sheets service:", error);
            throw error;
        }
    }

    /**
     * Updates a spreadsheet with tariff data (with retry logic)
     *
     * @param spreadsheetId - Google Sheets ID
     * @param tariffs - Array of tariffs to export
     * @throws {ValidationError} If spreadsheet ID is invalid
     * @throws {GoogleSheetsError} If update fails after retries
     */
    async updateSpreadsheet(spreadsheetId: string, tariffs: TariffExportRow[]): Promise<void> {
        validateSpreadsheetId(spreadsheetId);
        logger.info(`Updating spreadsheet ${spreadsheetId} with ${tariffs.length} tariffs`);

        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                await this.updateSpreadsheetInternal(spreadsheetId, tariffs);
                logger.info(`Successfully updated spreadsheet ${spreadsheetId}`);
                return;
            } catch (error) {
                lastError = error as Error;
                logger.warn(
                    `Attempt ${attempt}/${this.maxRetries} failed for spreadsheet ${spreadsheetId}: ${lastError.message}`
                );

                if (attempt < this.maxRetries) {
                    const delay = this.retryDelay * attempt;
                    logger.info(`Retrying in ${delay}ms...`);
                    await this.sleep(delay);
                }
            }
        }

        const errorMessage = `Failed to update spreadsheet ${spreadsheetId} after ${this.maxRetries} attempts: ${lastError?.message}`;
        logger.error(errorMessage);
        throw new GoogleSheetsError(errorMessage);
    }

    /**
     * Internal method to update spreadsheet
     */
    private async updateSpreadsheetInternal(
        spreadsheetId: string,
        tariffs: TariffExportRow[]
    ): Promise<void> {
        const sheetName = SHEETS_CONFIG.SHEET_NAME;

        // Prepare header row
        const headers = [
            "Склад",
            "Регион",
            "Коэф. доставки",
            "Доставка (база)",
            "Доставка (литр)",
            "Коэф. хранения",
            "Хранение (база)",
            "Хранение (литр)",
        ];

        // Prepare data rows
        const rows = tariffs.map((t) => [
            t.warehouse_name || "",
            t.geo_name || "",
            t.box_delivery_coef ?? "",
            t.box_delivery_base || "",
            t.box_delivery_liter || "",
            t.box_storage_coef ?? "",
            t.box_storage_base || "",
            t.box_storage_liter || "",
        ]);

        const values = [headers, ...rows];

        try {
            // Clear existing data
            await this.sheets.spreadsheets.values.clear({
                spreadsheetId,
                range: `${sheetName}!A:H`,
            });

            // Write new data
            await this.sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `${sheetName}!A1`,
                valueInputOption: "RAW",
                requestBody: { values },
            });
        } catch (error) {
            if ((error as any).code === 404) {
                throw new GoogleSheetsError(
                    `Spreadsheet ${spreadsheetId} not found or sheet "${sheetName}" does not exist`
                );
            } else if ((error as any).code === 403) {
                throw new GoogleSheetsError(
                    `Permission denied for spreadsheet ${spreadsheetId}. Ensure service account has editor access`
                );
            }
            throw new GoogleSheetsError(
                `Failed to update spreadsheet: ${(error as Error).message}`
            );
        }
    }

    /**
     * Sleep utility for retry delays
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Gets all spreadsheet IDs from database
     *
     * @returns Array of spreadsheet IDs
     * @throws {GoogleSheetsError} If database query fails
     */
    async getSpreadsheetIds(): Promise<string[]> {
        try {
            const rows = await knex(DB_CONFIG.TABLE_SPREADSHEETS).select("spreadsheet_id");
            logger.debug(`Found ${rows.length} registered spreadsheets`);
            return rows.map((r: { spreadsheet_id: string }) => r.spreadsheet_id);
        } catch (error) {
            logger.error("Failed to fetch spreadsheet IDs from database:", error);
            throw new GoogleSheetsError(
                `Failed to fetch spreadsheet IDs: ${(error as Error).message}`
            );
        }
    }

    /**
     * Updates all registered spreadsheets with tariff data
     * Processes spreadsheets in parallel for better performance
     *
     * @param tariffs - Array of tariffs to export
     */
    async updateAllSpreadsheets(tariffs: TariffExportRow[]): Promise<void> {
        logger.info(`Starting update for all spreadsheets with ${tariffs.length} tariffs`);

        const spreadsheetIds = await this.getSpreadsheetIds();

        if (spreadsheetIds.length === 0) {
            logger.warn("No spreadsheets registered in database");
            return;
        }

        const results = await Promise.allSettled(
            spreadsheetIds.map((id) => this.updateSpreadsheet(id, tariffs))
        );

        let successCount = 0;
        let failureCount = 0;

        results.forEach((result, index) => {
            const spreadsheetId = spreadsheetIds[index];
            if (result.status === "fulfilled") {
                successCount++;
                logger.info(`✓ Successfully updated spreadsheet: ${spreadsheetId}`);
            } else {
                failureCount++;
                logger.error(`✗ Failed to update spreadsheet ${spreadsheetId}: ${result.reason}`);
            }
        });

        logger.info(
            `Spreadsheet update summary: ${successCount} successful, ${failureCount} failed out of ${spreadsheetIds.length} total`
        );

        if (failureCount === spreadsheetIds.length) {
            throw new GoogleSheetsError("All spreadsheet updates failed");
        }
    }
}

// Default instance (Singleton pattern)
export const googleSheetsService = new GoogleSheetsService();
