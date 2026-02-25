/**
 * Migration to add additional indexes for performance optimization
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function up(knex) {
    // Add index on updated_at for cleanup queries
    await knex.schema.table("box_tariffs", (table) => {
        table.index("updated_at", "idx_box_tariffs_updated_at");
    });

    // Add composite index for common queries
    await knex.schema.table("box_tariffs", (table) => {
        table.index(["date", "warehouse_name", "box_delivery_coef"], "idx_box_tariffs_lookup");
    });
}

/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function down(knex) {
    await knex.schema.table("box_tariffs", (table) => {
        table.dropIndex("updated_at", "idx_box_tariffs_updated_at");
        table.dropIndex(
            ["date", "warehouse_name", "box_delivery_coef"],
            "idx_box_tariffs_lookup"
        );
    });
}
