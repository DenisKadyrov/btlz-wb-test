/**
 * Simple metrics tracking utility
 */

export interface SyncMetrics {
    startTime: number;
    endTime?: number;
    duration?: number;
    fetchedCount: number;
    savedCount: number;
    exportedCount: number;
    success: boolean;
    error?: string;
}

/**
 * Metrics collector for sync operations
 */
export class MetricsCollector {
    private metrics: SyncMetrics[] = [];
    private maxHistory: number = 100;

    /**
     * Start tracking a new sync operation
     */
    startSync(): SyncMetrics {
        const metric: SyncMetrics = {
            startTime: Date.now(),
            fetchedCount: 0,
            savedCount: 0,
            exportedCount: 0,
            success: false,
        };

        this.metrics.push(metric);

        // Keep only last N entries
        if (this.metrics.length > this.maxHistory) {
            this.metrics.shift();
        }

        return metric;
    }

    /**
     * Complete a sync operation
     */
    completeSync(metric: SyncMetrics, success: boolean, error?: Error): void {
        metric.endTime = Date.now();
        metric.duration = metric.endTime - metric.startTime;
        metric.success = success;
        if (error) {
            metric.error = error.message;
        }
    }

    /**
     * Get recent metrics
     */
    getRecentMetrics(count: number = 10): SyncMetrics[] {
        return this.metrics.slice(-count);
    }

    /**
     * Get success rate
     */
    getSuccessRate(): number {
        if (this.metrics.length === 0) return 0;

        const successCount = this.metrics.filter((m) => m.success).length;
        return (successCount / this.metrics.length) * 100;
    }

    /**
     * Get average duration
     */
    getAverageDuration(): number {
        const completed = this.metrics.filter((m) => m.duration !== undefined);
        if (completed.length === 0) return 0;

        const totalDuration = completed.reduce((sum, m) => sum + (m.duration || 0), 0);
        return totalDuration / completed.length;
    }
}

// Singleton instance
export const metricsCollector = new MetricsCollector();
