import { describe, it, expect, beforeEach } from '@jest/globals';
import { MetricsCollector } from '../metrics.js';

describe('MetricsCollector', () => {
    let collector: MetricsCollector;

    beforeEach(() => {
        collector = new MetricsCollector();
    });

    describe('startSync', () => {
        it('should create new metric with default values', () => {
            const metric = collector.startSync();

            expect(metric.startTime).toBeGreaterThan(0);
            expect(metric.fetchedCount).toBe(0);
            expect(metric.savedCount).toBe(0);
            expect(metric.exportedCount).toBe(0);
            expect(metric.success).toBe(false);
            expect(metric.endTime).toBeUndefined();
            expect(metric.duration).toBeUndefined();
        });

        it('should add metric to history', () => {
            collector.startSync();
            const metrics = collector.getRecentMetrics(1);

            expect(metrics.length).toBe(1);
        });
    });

    describe('completeSync', () => {
        it('should mark sync as successful', () => {
            const metric = collector.startSync();
            collector.completeSync(metric, true);

            expect(metric.success).toBe(true);
            expect(metric.endTime).toBeDefined();
            expect(metric.duration).toBeDefined();
            expect(metric.error).toBeUndefined();
        });

        it('should mark sync as failed with error', () => {
            const metric = collector.startSync();
            const error = new Error('Test error');
            collector.completeSync(metric, false, error);

            expect(metric.success).toBe(false);
            expect(metric.endTime).toBeDefined();
            expect(metric.duration).toBeDefined();
            expect(metric.error).toBe('Test error');
        });

        it('should calculate duration correctly', () => {
            const metric = collector.startSync();
            // Небольшая задержка
            const delay = 10;
            setTimeout(() => {
                collector.completeSync(metric, true);
                expect(metric.duration).toBeGreaterThanOrEqual(0);
            }, delay);
        });
    });

    describe('getSuccessRate', () => {
        it('should return 0 for no metrics', () => {
            expect(collector.getSuccessRate()).toBe(0);
        });

        it('should calculate success rate correctly', () => {
            const metric1 = collector.startSync();
            collector.completeSync(metric1, true);

            const metric2 = collector.startSync();
            collector.completeSync(metric2, false);

            const metric3 = collector.startSync();
            collector.completeSync(metric3, true);

            expect(collector.getSuccessRate()).toBeCloseTo(66.67, 1);
        });

        it('should return 100 for all successful', () => {
            const metric1 = collector.startSync();
            collector.completeSync(metric1, true);

            const metric2 = collector.startSync();
            collector.completeSync(metric2, true);

            expect(collector.getSuccessRate()).toBe(100);
        });

        it('should return 0 for all failed', () => {
            const metric1 = collector.startSync();
            collector.completeSync(metric1, false);

            const metric2 = collector.startSync();
            collector.completeSync(metric2, false);

            expect(collector.getSuccessRate()).toBe(0);
        });
    });

    describe('getAverageDuration', () => {
        it('should return 0 for no completed metrics', () => {
            expect(collector.getAverageDuration()).toBe(0);
        });

        it('should calculate average duration correctly', () => {
            const metric1 = collector.startSync();
            // Simulate some time passing
            const start1 = metric1.startTime;
            metric1.endTime = start1 + 100;
            metric1.duration = 100;
            metric1.success = true;

            const metric2 = collector.startSync();
            const start2 = metric2.startTime;
            metric2.endTime = start2 + 200;
            metric2.duration = 200;
            metric2.success = true;

            expect(collector.getAverageDuration()).toBe(150);
        });
    });

    describe('getRecentMetrics', () => {
        it('should return empty array when no metrics', () => {
            expect(collector.getRecentMetrics(10)).toEqual([]);
        });

        it('should return requested number of recent metrics', () => {
            for (let i = 0; i < 15; i++) {
                const metric = collector.startSync();
                collector.completeSync(metric, true);
            }

            const recent = collector.getRecentMetrics(5);
            expect(recent.length).toBe(5);
        });

        it('should return all metrics if less than requested', () => {
            for (let i = 0; i < 3; i++) {
                const metric = collector.startSync();
                collector.completeSync(metric, true);
            }

            const recent = collector.getRecentMetrics(10);
            expect(recent.length).toBe(3);
        });
    });

    describe('maxHistory limit', () => {
        it('should keep only last 100 metrics', () => {
            for (let i = 0; i < 150; i++) {
                const metric = collector.startSync();
                collector.completeSync(metric, true);
            }

            const all = collector.getRecentMetrics(200);
            expect(all.length).toBeLessThanOrEqual(100);
        });
    });
});
