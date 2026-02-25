import env from "#config/env/env.js";
import { Knex } from "knex";
import { z } from "zod";
import { DB_CONFIG } from "#constants/config.js";

const connectionSchema = z.object({
    host: z.string(),
    port: z.number(),
    database: z.string(),
    user: z.string(),
    password: z.string(),
});

const NODE_ENV = env.NODE_ENV ?? "development";

const knegConfigs: Record<typeof NODE_ENV, Knex.Config> = {
    development: {
        client: "pg",
        connection: () =>
            connectionSchema.parse({
                host: env.POSTGRES_HOST ?? "localhost",
                port: env.POSTGRES_PORT ?? 5432,
                database: env.POSTGRES_DB ?? "postgres",
                user: env.POSTGRES_USER ?? "postgres",
                password: env.POSTGRES_PASSWORD ?? "postgres",
            }),
        pool: {
            min: DB_CONFIG.CONNECTION_POOL_MIN,
            max: DB_CONFIG.CONNECTION_POOL_MAX,
            idleTimeoutMillis: DB_CONFIG.IDLE_TIMEOUT,
            acquireTimeoutMillis: DB_CONFIG.CONNECTION_TIMEOUT,
        },
        acquireConnectionTimeout: DB_CONFIG.CONNECTION_TIMEOUT,
        debug: false,
        migrations: {
            stub: 'src/config/knex/migration.stub.js',
            directory: "./src/postgres/migrations",
            tableName: "migrations",
            extension: "ts",
        },
        seeds: {
            stub: 'src/config/knex/seed.stub.js',
            directory: "./src/postgres/seeds",
            extension: "js",
        },
    },
    production: {
        client: "pg",
        connection: () =>
            connectionSchema.parse({
                host: env.POSTGRES_HOST,
                port: env.POSTGRES_PORT,
                database: env.POSTGRES_DB,
                user: env.POSTGRES_USER,
                password: env.POSTGRES_PASSWORD,
            }),
        pool: {
            min: DB_CONFIG.CONNECTION_POOL_MIN,
            max: DB_CONFIG.CONNECTION_POOL_MAX,
            idleTimeoutMillis: DB_CONFIG.IDLE_TIMEOUT,
            acquireTimeoutMillis: DB_CONFIG.CONNECTION_TIMEOUT,
        },
        acquireConnectionTimeout: DB_CONFIG.CONNECTION_TIMEOUT,
        debug: false,
        migrations: {
            stub: 'dist/config/knex/migration.stub.js',
            directory: "./dist/postgres/migrations",
            tableName: "migrations",
            extension: "js",
        },
        seeds: {
            stub: 'src/config/knex/seed.stub.js',
            directory: "./dist/postgres/seeds",
            extension: "js",
        },
    },
};

export default knegConfigs[NODE_ENV];
