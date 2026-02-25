import env from "#config/env/env.js";
import type { WBTariffsResponse, WBWarehouseTariff, BoxTariff } from "../types/tariffs.js";
import { getLogger } from "../utils/logger.js";
import { WBApiError, ValidationError } from "../utils/errors.js";
import { API_CONFIG, VALIDATION } from "../constants/config.js";
import { validateDate } from "../utils/validators.js";

const logger = getLogger("api");

/**
 * Service for interacting with Wildberries API
 * Follows Single Responsibility Principle - only handles WB API communication
 *
 * Features:
 * - Automatic retry on failures
 * - Structured error handling
 * - Request/response logging
 * - Input validation
 */
export class WBApiService {
    private readonly apiToken: string;
    private readonly baseUrl: string;
    private readonly maxRetries: number;
    private readonly retryDelay: number;

    constructor(
        apiToken?: string,
        baseUrl: string = API_CONFIG.WB_BASE_URL,
        maxRetries: number = API_CONFIG.MAX_RETRIES,
        retryDelay: number = API_CONFIG.RETRY_DELAY
    ) {
        this.apiToken = apiToken || env.WB_API_TOKEN;
        this.baseUrl = baseUrl;
        this.maxRetries = maxRetries;
        this.retryDelay = retryDelay;

        if (!this.apiToken) {
            throw new WBApiError("WB API token is required", 500);
        }
    }

    /**
     * Fetches box tariffs for a specific date with retry logic
     *
     * @param date - Date in YYYY-MM-DD format
     * @returns Array of warehouse tariffs
     * @throws {ValidationError} If date format is invalid
     * @throws {WBApiError} If API request fails after retries
     */
    async fetchBoxTariffs(date: string): Promise<WBWarehouseTariff[]> {
        validateDate(date);

        logger.info(`Fetching box tariffs for date: ${date}`);

        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                const tariffs = await this.fetchWithTimeout(date);
                logger.info(`Successfully fetched ${tariffs.length} tariffs for ${date}`);
                return tariffs;
            } catch (error) {
                lastError = error as Error;
                logger.warn(
                    `Attempt ${attempt}/${this.maxRetries} failed for date ${date}: ${lastError.message}`
                );

                if (attempt < this.maxRetries) {
                    const delay = this.retryDelay * attempt; // Exponential backoff
                    logger.info(`Retrying in ${delay}ms...`);
                    await this.sleep(delay);
                }
            }
        }

        const errorMessage = `Failed to fetch tariffs after ${this.maxRetries} attempts: ${lastError?.message}`;
        logger.error(errorMessage);
        throw new WBApiError(errorMessage, 503);
    }

    /**
     * Performs the actual API request with timeout
     */
    private async fetchWithTimeout(date: string): Promise<WBWarehouseTariff[]> {
        const url = `${this.baseUrl}${API_CONFIG.WB_TARIFFS_ENDPOINT}?date=${date}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.REQUEST_TIMEOUT);

        try {
            const response = await fetch(url, {
                headers: {
                    "Authorization": this.apiToken,
                },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new WBApiError(
                    `HTTP ${response.status}: ${errorText || response.statusText}`,
                    response.status
                );
            }

            const data: WBTariffsResponse = await response.json();

            if (!data?.response?.data?.warehouseList) {
                throw new WBApiError("Invalid response structure from WB API", 500);
            }

            return data.response.data.warehouseList;
        } catch (error) {
            clearTimeout(timeoutId);

            if (error instanceof WBApiError) {
                throw error;
            }

            if ((error as Error).name === "AbortError") {
                throw new WBApiError(`Request timeout after ${API_CONFIG.REQUEST_TIMEOUT}ms`, 408);
            }

            throw new WBApiError(`Network error: ${(error as Error).message}`, 503);
        }
    }

    /**
     * Sleep utility for retry delays
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Transforms raw API data to database format
     * Handles "-" values as null and validates data
     *
     * @param tariffs - Raw tariffs from WB API
     * @param date - Date for the tariffs
     * @returns Normalized tariffs ready for database insertion
     */
    transformToDbFormat(tariffs: WBWarehouseTariff[], date: string): BoxTariff[] {
        logger.debug(`Transforming ${tariffs.length} tariffs to database format`);

        return tariffs.map((tariff, index) => {
            try {
                return {
                    date,
                    warehouse_name: this.validateAndTrim(
                        tariff.warehouseName,
                        "warehouseName",
                        VALIDATION.MAX_WAREHOUSE_NAME_LENGTH
                    ),
                    geo_name: tariff.geoName
                        ? this.validateAndTrim(
                              tariff.geoName,
                              "geoName",
                              VALIDATION.MAX_GEO_NAME_LENGTH
                          )
                        : null,
                    box_delivery_base: this.parseValue(tariff.boxDeliveryBase),
                    box_delivery_liter: this.parseValue(tariff.boxDeliveryLiter),
                    box_delivery_coef: this.parseCoefficient(tariff.boxDeliveryCoefExpr),
                    box_delivery_marketplace_base: this.parseValue(
                        tariff.boxDeliveryMarketplaceBase
                    ),
                    box_delivery_marketplace_liter: this.parseValue(
                        tariff.boxDeliveryMarketplaceLiter
                    ),
                    box_delivery_marketplace_coef: this.parseCoefficient(
                        tariff.boxDeliveryMarketplaceCoefExpr
                    ),
                    box_storage_base: this.parseValue(tariff.boxStorageBase),
                    box_storage_liter: this.parseValue(tariff.boxStorageLiter),
                    box_storage_coef: this.parseCoefficient(tariff.boxStorageCoefExpr),
                };
            } catch (error) {
                logger.error(`Failed to transform tariff at index ${index}:`, error);
                throw error;
            }
        });
    }

    /**
     * Validates and trims string values
     */
    private validateAndTrim(value: string, fieldName: string, maxLength: number): string {
        if (!value) {
            throw new ValidationError(`${fieldName} must be a non-empty string`);
        }

        const trimmed = value.trim();

        if (trimmed.length === 0) {
            throw new ValidationError(`${fieldName} cannot be empty or whitespace only`);
        }

        if (trimmed.length > maxLength) {
            logger.warn(
                `${fieldName} exceeds max length (${maxLength}), truncating: ${trimmed.substring(0, 50)}...`
            );
            return trimmed.substring(0, maxLength);
        }

        return trimmed;
    }

    /**
     * Parses string values, treating "-" as null
     */
    private parseValue(value: string): string | null {
        if (!value || value === "-") return null;
        return value.trim();
    }

    /**
     * Parses coefficient values
     */
    private parseCoefficient(value: string): number | null {
        if (!value || value === "-") return null;

        const parsed = parseInt(value, 10);

        if (isNaN(parsed)) {
            logger.warn(`Invalid coefficient value, using null: ${value}`);
            return null;
        }

        return parsed;
    }
}

// Default instance (Singleton pattern)
export const wbApiService = new WBApiService();
