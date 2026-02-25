/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function seed(knex) {
    // ID таблиц берутся из переменной окружения GOOGLE_SPREADSHEET_IDS
    // Можно указать несколько через запятую: id1,id2,id3
    const spreadsheetIds = process.env.GOOGLE_SPREADSHEET_IDS || "";

    const ids = spreadsheetIds
        .split(",")
        .map(id => id.trim())
        .filter(id => id.length > 0);

    if (ids.length === 0) {
        console.log("No spreadsheet IDs provided in GOOGLE_SPREADSHEET_IDS");
        return;
    }

    const rows = ids.map(id => ({ spreadsheet_id: id }));

    await knex("spreadsheets")
        .insert(rows)
        .onConflict(["spreadsheet_id"])
        .ignore();

    console.log(`Seeded ${ids.length} spreadsheet ID(s)`);
}
