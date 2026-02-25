import knex from "#postgres/knex.js";
import type { BoxTariff, TariffExportRow } from "../types/tariffs.js";
import { getLogger } from "../utils/logger.js";
import { DatabaseError } from "../utils/errors.js";
import { DB_CONFIG } from "../constants/config.js";

const logger = getLogger("database");

/**
 * Repository for box tariffs data access
 * Follows Repository pattern - encapsulates data access logic
 *
 * Features:
 * - Transaction support
 * - Batch operations
 * - Comprehensive error handling
 * - Query optimization
 */
export class TariffRepository {
    private readonly tableName = DB_CONFIG.TABLE_TARIFFS;

    /**
     * Upserts tariffs - inserts new or updates existing records
     * Uses ON CONFLICT for atomic upsert operation with transaction
     *
     * @param tariffs - Array of tariffs to upsert
     * @throws {DatabaseError} If database operation fails
     */
    async upsertTariffs(tariffs: BoxTariff[]): Promise<void> {
        if (tariffs.length === 0) {
            logger.warn("Attempted to upsert empty tariffs array");
            return;
        }

        logger.info(`Upserting ${tariffs.length} tariffs`);

        const now = new Date();
        const tariffsWithTimestamp = tariffs.map((t) => ({
            ...t,
            updated_at: now,
        }));

        const trx = await knex.transaction();

        try {
            // Use batch insert for better performance with large datasets
            const chunkSize = 500;
            for (let i = 0; i < tariffsWithTimestamp.length; i += chunkSize) {
                const chunk = tariffsWithTimestamp.slice(i, i + chunkSize);

                await trx(this.tableName)
                    .insert(chunk)
                    .onConflict(["date", "warehouse_name"])
                    .merge({
                        geo_name: knex.raw("EXCLUDED.geo_name"),
                        box_delivery_base: knex.raw("EXCLUDED.box_delivery_base"),
                        box_delivery_liter: knex.raw("EXCLUDED.box_delivery_liter"),
                        box_delivery_coef: knex.raw("EXCLUDED.box_delivery_coef"),
                        box_delivery_marketplace_base: knex.raw(
                            "EXCLUDED.box_delivery_marketplace_base"
                        ),
                        box_delivery_marketplace_liter: knex.raw(
                            "EXCLUDED.box_delivery_marketplace_liter"
                        ),
                        box_delivery_marketplace_coef: knex.raw(
                            "EXCLUDED.box_delivery_marketplace_coef"
                        ),
                        box_storage_base: knex.raw("EXCLUDED.box_storage_base"),
                        box_storage_liter: knex.raw("EXCLUDED.box_storage_liter"),
                        box_storage_coef: knex.raw("EXCLUDED.box_storage_coef"),
                        updated_at: knex.raw("EXCLUDED.updated_at"),
                    });

                logger.debug(
                    `Processed chunk ${i / chunkSize + 1}/${Math.ceil(tariffsWithTimestamp.length / chunkSize)}`
                );
            }

            await trx.commit();
            logger.info(`Successfully upserted ${tariffs.length} tariffs`);
        } catch (error) {
            await trx.rollback();
            logger.error(`Failed to upsert tariffs: ${(error as Error).message}`);
            throw new DatabaseError(`Failed to upsert tariffs: ${(error as Error).message}`);
        }
    }

    /**
     * Gets tariffs for a specific date, sorted by delivery coefficient
     *
     * @param date - Date in YYYY-MM-DD format
     * @returns Array of tariffs sorted by coefficient
     * @throws {DatabaseError} If query fails
     */
    async getTariffsByDate(date: string): Promise<TariffExportRow[]> {
        try {
            logger.debug(`Fetching tariffs for date: ${date}`);

            const tariffs = await knex(this.tableName)
                .select(
                    "warehouse_name",
                    "geo_name",
                    "box_delivery_coef",
                    "box_delivery_base",
                    "box_delivery_liter",
                    "box_storage_coef",
                    "box_storage_base",
                    "box_storage_liter"
                )
                .where("date", date)
                .orderBy([
                    { column: "box_delivery_coef", order: "asc", nulls: "last" },
                    { column: "warehouse_name", order: "asc" },
                ]);

            logger.info(`Found ${tariffs.length} tariffs for date ${date}`);
            return tariffs;
        } catch (error) {
            logger.error(`Failed to fetch tariffs for date ${date}: ${(error as Error).message}`);
            throw new DatabaseError(
                `Failed to fetch tariffs for date ${date}: ${(error as Error).message}`
            );
        }
    }

    /**
     * Gets the latest date with tariff data
     *
     * @returns Latest date or null if no data
     * @throws {DatabaseError} If query fails
     */
    async getLatestDate(): Promise<string | null> {
        try {
            const result = await knex(this.tableName).max("date as max_date").first();

            const maxDate = result?.max_date || null;
            logger.debug(`Latest tariff date: ${maxDate}`);
            return maxDate;
        } catch (error) {
            logger.error(`Failed to fetch latest date: ${(error as Error).message}`);
            throw new DatabaseError(
                `Failed to fetch latest date: ${(error as Error).message}`
            );
        }
    }

    /**
     * Gets count of tariffs for a specific date
     *
     * @param date - Date in YYYY-MM-DD format
     * @returns Count of tariffs
     * @throws {DatabaseError} If query fails
     */
    async getTariffCountByDate(date: string): Promise<number> {
        try {
            const result = await knex(this.tableName).where("date", date).count("* as count").first();

            const count = parseInt(result?.count as string) || 0;
            logger.debug(`Found ${count} tariffs for date ${date}`);
            return count;
        } catch (error) {
            logger.error(`Failed to count tariffs for date ${date}: ${(error as Error).message}`);
            throw new DatabaseError(
                `Failed to count tariffs for date ${date}: ${(error as Error).message}`
            );
        }
    }

    /**
     * Deletes tariffs older than specified number of days
     * TODO: Consider adding this to a scheduled cleanup job
     *
     * @param days - Number of days to keep
     * @returns Number of deleted records
     * @throws {DatabaseError} If delete operation fails
     */
    async deleteOldTariffs(days: number = 90): Promise<number> {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            const cutoffDateStr = cutoffDate.toISOString().split("T")[0];

            logger.info(`Deleting tariffs older than ${cutoffDateStr}`);

            const deletedCount = await knex(this.tableName).where("date", "<", cutoffDateStr).del();

            logger.info(`Deleted ${deletedCount} old tariff records`);
            return deletedCount;
        } catch (error) {
            logger.error(`Failed to delete old tariffs: ${(error as Error).message}`);
            throw new DatabaseError(
                `Failed to delete old tariffs: ${(error as Error).message}`
            );
        }
    }
}

// Default instance (Singleton pattern)
export const tariffRepository = new TariffRepository();
