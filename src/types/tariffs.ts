/**
 * Raw tariff data from WB API
 */
export interface WBWarehouseTariff {
    warehouseName: string;
    geoName: string;
    boxDeliveryBase: string;
    boxDeliveryLiter: string;
    boxDeliveryCoefExpr: string;
    boxDeliveryMarketplaceBase: string;
    boxDeliveryMarketplaceLiter: string;
    boxDeliveryMarketplaceCoefExpr: string;
    boxStorageBase: string;
    boxStorageLiter: string;
    boxStorageCoefExpr: string;
}

export interface WBTariffsResponse {
    response: {
        data: {
            dtNextBox: string;
            dtTillMax: string;
            warehouseList: WBWarehouseTariff[];
        };
    };
}

/**
 * Normalized tariff for database storage
 */
export interface BoxTariff {
    id?: number;
    date: string;
    warehouse_name: string;
    geo_name: string | null;
    box_delivery_base: string | null;
    box_delivery_liter: string | null;
    box_delivery_coef: number | null;
    box_delivery_marketplace_base: string | null;
    box_delivery_marketplace_liter: string | null;
    box_delivery_marketplace_coef: number | null;
    box_storage_base: string | null;
    box_storage_liter: string | null;
    box_storage_coef: number | null;
    created_at?: Date;
    updated_at?: Date;
}

/**
 * Tariff data for Google Sheets export
 */
export interface TariffExportRow {
    warehouse_name: string;
    geo_name: string;
    box_delivery_coef: number | null;
    box_delivery_base: string;
    box_delivery_liter: string;
    box_storage_coef: number | null;
    box_storage_base: string;
    box_storage_liter: string;
}
