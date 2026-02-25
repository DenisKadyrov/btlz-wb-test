import log4js from "log4js";

/**
 * Centralized logging configuration
 * Provides structured logging with different levels
 */
log4js.configure({
    appenders: {
        console: {
            type: "console",
            layout: {
                type: "pattern",
                pattern: "%[[%d{yyyy-MM-dd hh:mm:ss}] [%p] %c -%] %m",
            },
        },
        file: {
            type: "file",
            filename: "logs/app.log",
            maxLogSize: 10485760, // 10MB
            backups: 3,
            compress: true,
        },
    },
    categories: {
        default: {
            appenders: ["console", "file"],
            level: process.env.LOG_LEVEL || "info",
        },
        database: {
            appenders: ["console", "file"],
            level: "info",
        },
        api: {
            appenders: ["console", "file"],
            level: "info",
        },
        scheduler: {
            appenders: ["console", "file"],
            level: "info",
        },
    },
});

/**
 * Get logger instance for specific category
 */
export function getLogger(category: string = "default"): log4js.Logger {
    return log4js.getLogger(category);
}

/**
 * Shutdown log4js gracefully
 */
export function shutdownLogger(): Promise<void> {
    return new Promise((resolve) => {
        log4js.shutdown(() => resolve());
    });
}

export const logger = getLogger();
