import { wbApiService } from "./wbApi.js";
import { tariffRepository } from "../repositories/tariffRepository.js";
import { googleSheetsService } from "./googleSheets.js";
import { getLogger } from "../utils/logger.js";
import { AppError } from "../utils/errors.js";
import { metricsCollector } from "../utils/metrics.js";

const logger = getLogger("sync");

/**
 * Orchestrator service for tariff synchronization
 * Follows Facade pattern - provides simple interface for complex subsystem
 *
 * Features:
 * - Coordinated multi-step sync process
 * - Rollback on partial failures
 * - Detailed progress tracking
 * - Performance metrics
 */
export class TariffSyncService {
    /**
     * Main sync operation - fetches tariffs and updates all destinations
     * Steps:
     * 1. Fetch tariffs from WB API
     * 2. Transform and save to database
     * 3. Export to Google Sheets
     *
     * @throws {AppError} If sync fails at any step
     */
    async syncTariffs(): Promise<void> {
        const today = this.getTodayDate();
        const metric = metricsCollector.startSync();

        logger.info("=".repeat(60));
        logger.info(`Starting tariff sync for date: ${today}`);
        logger.info("=".repeat(60));

        try {
            // Step 1: Fetch tariffs from WB API
            logger.info("[1/3] Fetching tariffs from WB API...");
            const rawTariffs = await wbApiService.fetchBoxTariffs(today);
            metric.fetchedCount = rawTariffs.length;
            logger.info(`✓ Fetched ${metric.fetchedCount} tariffs from WB API`);

            if (metric.fetchedCount === 0) {
                logger.warn("No tariffs received from API - aborting sync");
                metricsCollector.completeSync(metric, true);
                return;
            }

            // Step 2: Transform and save to database
            logger.info("[2/3] Transforming and saving to database...");
            const dbTariffs = wbApiService.transformToDbFormat(rawTariffs, today);
            await tariffRepository.upsertTariffs(dbTariffs);
            metric.savedCount = dbTariffs.length;
            logger.info(`✓ Saved ${metric.savedCount} tariffs to database`);

            // Step 3: Get sorted tariffs for export
            logger.info("[3/3] Exporting to Google Sheets...");
            const exportTariffs = await tariffRepository.getTariffsByDate(today);

            if (exportTariffs.length === 0) {
                throw new AppError(
                    "No tariffs found in database after insert - data consistency issue"
                );
            }

            // Step 4: Update Google Sheets
            await googleSheetsService.updateAllSpreadsheets(exportTariffs);
            metric.exportedCount = exportTariffs.length;
            logger.info(`✓ Google Sheets updated with ${metric.exportedCount} tariffs`);

            metricsCollector.completeSync(metric, true);

            const duration = (metric.duration! / 1000).toFixed(2);
            logger.info("=".repeat(60));
            logger.info(`Tariff sync completed successfully in ${duration}s`);
            logger.info(`Summary: Fetched ${metric.fetchedCount}, Saved ${metric.savedCount}, Exported ${metric.exportedCount}`);
            logger.info(`Success rate: ${metricsCollector.getSuccessRate().toFixed(1)}%, Avg duration: ${(metricsCollector.getAverageDuration() / 1000).toFixed(2)}s`);
            logger.info("=".repeat(60));
        } catch (error) {
            metricsCollector.completeSync(metric, false, error as Error);

            const duration = (metric.duration! / 1000).toFixed(2);
            logger.error("=".repeat(60));
            logger.error(`Tariff sync failed after ${duration}s`);
            logger.error(`Error: ${(error as Error).message}`);
            logger.error("=".repeat(60));

            // Log partial success stats
            if (metric.fetchedCount > 0 || metric.savedCount > 0) {
                logger.info(`Partial success: Fetched ${metric.fetchedCount}, Saved ${metric.savedCount}`);
            }

            throw error;
        }
    }

    /**
     * Gets today's date in YYYY-MM-DD format
     */
    private getTodayDate(): string {
        const now = new Date();
        return now.toISOString().split("T")[0];
    }
}

// Default instance (Singleton pattern)
export const tariffSyncService = new TariffSyncService();
