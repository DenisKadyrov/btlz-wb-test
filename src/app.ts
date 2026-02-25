import http from "http";
import knex, { migrate, seed } from "#postgres/knex.js";
import { schedulerService } from "./services/scheduler.js";
import { getLogger, shutdownLogger } from "./utils/logger.js";
import { AppError } from "./utils/errors.js";
import { metricsCollector } from "./utils/metrics.js";
import env from "#config/env/env.js";

const logger = getLogger("app");

// Simple health check server
let server: http.Server | null = null;

/**
 * Main application entry point
 * Handles initialization, startup, and graceful shutdown
 */
async function main(): Promise<void> {
    try {
        logger.info("=".repeat(60));
        logger.info("Starting WB Tariffs Sync Application");
        logger.info("=".repeat(60));

        // Run migrations and seeds
        logger.info("Running database migrations...");
        await migrate.latest();

        logger.info("Running database seeds...");
        await seed.run();

        logger.info("Database setup completed successfully");

        // Test database connection
        await testDatabaseConnection();

        // Run immediate sync on startup
        logger.info("Running initial tariff sync...");
        try {
            await schedulerService.runImmediateSync();
            logger.info("Initial sync completed successfully");
        } catch (error) {
            logger.error("Initial sync failed (will retry on schedule):", error);
            // Don't exit - let scheduler retry
        }

        // Start hourly scheduler
        logger.info("Starting hourly scheduler...");
        schedulerService.startHourlySync();

        // Start health check server
        startHealthCheckServer();

        logger.info("=".repeat(60));
        logger.info("Application started successfully");
        logger.info("Scheduler running - tariffs will sync every hour");
        logger.info("=".repeat(60));
    } catch (error) {
        logger.fatal("Failed to start application:", error);
        await gracefulShutdown(1);
    }
}

/**
 * Tests database connection
 */
async function testDatabaseConnection(): Promise<void> {
    try {
        await knex.raw("SELECT 1");
        logger.info("Database connection test: OK");
    } catch (error) {
        logger.error("Database connection test failed:", error);
        throw new AppError("Failed to connect to database", 500, false);
    }
}

/**
 * Starts simple HTTP server for health checks and metrics
 */
function startHealthCheckServer(): void {
    const port = env.APP_PORT || 5000;

    server = http.createServer((req, res) => {
        if (req.url === "/health") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
                JSON.stringify({
                    status: "healthy",
                    timestamp: new Date().toISOString(),
                })
            );
        } else if (req.url === "/metrics") {
            const recentMetrics = metricsCollector.getRecentMetrics(10);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
                JSON.stringify({
                    successRate: metricsCollector.getSuccessRate(),
                    averageDuration: metricsCollector.getAverageDuration(),
                    recentSyncs: recentMetrics,
                })
            );
        } else {
            res.writeHead(404);
            res.end("Not Found");
        }
    });

    server.listen(port, () => {
        logger.info(`Health check server listening on port ${port}`);
        logger.info(`  - Health: http://localhost:${port}/health`);
        logger.info(`  - Metrics: http://localhost:${port}/metrics`);
    });
}

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(exitCode: number = 0): Promise<void> {
    logger.info("Initiating graceful shutdown...");

    try {
        // Stop HTTP server
        if (server) {
            logger.info("Stopping health check server...");
            await new Promise<void>((resolve) => server!.close(() => resolve()));
        }

        // Stop scheduler
        logger.info("Stopping scheduler...");
        schedulerService.stop();

        // Close database connections
        logger.info("Closing database connections...");
        await knex.destroy();

        // Flush logs
        await shutdownLogger();

        logger.info("Shutdown completed successfully");
    } catch (error) {
        console.error("Error during shutdown:", error);
    } finally {
        process.exit(exitCode);
    }
}

// Graceful shutdown handlers
process.on("SIGTERM", async () => {
    logger.warn("Received SIGTERM signal");
    await gracefulShutdown(0);
});

process.on("SIGINT", async () => {
    logger.warn("Received SIGINT signal");
    await gracefulShutdown(0);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason: unknown, promise: Promise<unknown>) => {
    logger.error("Unhandled Promise Rejection:", reason);
    logger.error("Promise:", promise);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error: Error) => {
    logger.fatal("Uncaught Exception:", error);
    gracefulShutdown(1);
});

// Start application
main();