export interface SheetDataRow {
  site_name: string;
  animal_id: string;
  common_name: string;
  scientific_name: string;
  section_name: string;
  user_enclosure_name: string;
  'Feed type name': string;
  diet_name: string;
  diet_no: number | string;
  ingredient_name: string;
  type: string;
  type_name: string;
  group_name: string;
  ingredient_qty: number;
  base_uom_name: string;
  ingredient_qty_gram: number;
  base_uom_name_gram: string;
  preparation_type_name: string;
  meal_start_time: string;
  meal_end_time: string;
  cut_size_name: string;
  feeding_date: string; // Added for date filtering
}
