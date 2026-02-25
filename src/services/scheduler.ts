import cron from "node-cron";
import { tariffSyncService } from "./tariffSync.js";
import { getLogger } from "../utils/logger.js";
import { SCHEDULER_CONFIG } from "../constants/config.js";

const logger = getLogger("scheduler");

/**
 * Scheduler service for periodic tasks
 * Uses Strategy pattern - different cron expressions for different schedules
 *
 * Features:
 * - Cron-based scheduling
 * - Task lifecycle management
 * - Error handling with alerts
 */
export class SchedulerService {
    private tasks: cron.ScheduledTask[] = [];
    private syncInProgress: boolean = false;

    /**
     * Starts the hourly tariff sync job
     * Runs every hour at minute 0
     */
    startHourlySync(): void {
        logger.info(`Scheduling hourly sync with cron: ${SCHEDULER_CONFIG.HOURLY_CRON}`);

        const task = cron.schedule(
            SCHEDULER_CONFIG.HOURLY_CRON,
            async () => {
                if (this.syncInProgress) {
                    logger.warn("Previous sync still in progress, skipping this run");
                    return;
                }

                logger.info("Triggered scheduled tariff sync");
                await this.runSync();
            },
            {
                timezone: SCHEDULER_CONFIG.TIMEZONE,
            }
        );

        this.tasks.push(task);
        logger.info(`Hourly tariff sync scheduled (timezone: ${SCHEDULER_CONFIG.TIMEZONE})`);
    }

    /**
     * Runs immediate sync (on startup)
     */
    async runImmediateSync(): Promise<void> {
        logger.info("Running immediate tariff sync on startup");
        await this.runSync();
    }

    /**
     * Executes sync with error handling and timing
     */
    private async runSync(): Promise<void> {
        this.syncInProgress = true;
        const startTime = Date.now();

        try {
            await tariffSyncService.syncTariffs();

            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            logger.info(`Tariff sync completed successfully in ${duration}s`);
        } catch (error) {
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            logger.error(`Tariff sync failed after ${duration}s:`, error);
            throw error;
        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * Stops all scheduled tasks
     */
    stop(): void {
        logger.info(`Stopping ${this.tasks.length} scheduled task(s)`);

        this.tasks.forEach((task, index) => {
            task.stop();
            logger.debug(`Stopped task ${index + 1}`);
        });

        this.tasks = [];
        logger.info("All scheduled tasks stopped");
    }

    /**
     * Gets current scheduler status
     * TODO: Add more detailed metrics (last run time, success rate, etc.)
     */
    getStatus(): { tasksCount: number; syncInProgress: boolean } {
        return {
            tasksCount: this.tasks.length,
            syncInProgress: this.syncInProgress,
        };
    }
}

// Default instance (Singleton pattern)
export const schedulerService = new SchedulerService();
