/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function up(knex) {
    return knex.schema.createTable("box_tariffs", (table) => {
        table.increments("id").primary();
        table.date("date").notNullable();
        table.string("warehouse_name").notNullable();
        table.string("geo_name");

        // Delivery tariffs
        table.string("box_delivery_base");
        table.string("box_delivery_liter");
        table.integer("box_delivery_coef");

        // Marketplace delivery tariffs
        table.string("box_delivery_marketplace_base");
        table.string("box_delivery_marketplace_liter");
        table.integer("box_delivery_marketplace_coef");

        // Storage tariffs
        table.string("box_storage_base");
        table.string("box_storage_liter");
        table.integer("box_storage_coef");

        table.timestamp("created_at").defaultTo(knex.fn.now());
        table.timestamp("updated_at").defaultTo(knex.fn.now());

        // Unique constraint for upsert logic
        table.unique(["date", "warehouse_name"]);

        // Index for sorting by coefficient
        table.index(["date", "box_delivery_coef"]);
    });
}

/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function down(knex) {
    return knex.schema.dropTable("box_tariffs");
}
