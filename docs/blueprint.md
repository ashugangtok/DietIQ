# **App Name**: Sheet Insights

## Core Features:

- File Upload: Enable user to upload .xlsx files directly via a file input element on the homepage.
- Excel Parsing: Parse uploaded Excel files using the 'xlsx' library to extract data, targeting specific columns (site_name, common_name, section_name, user_enclosure_name, Feed type name, ingredient_name, type, type_name, ingredient_qty, base_uom_name, ingredient_qty_gram, base_uom_name_gram).
- Data Display: Display the extracted data in an HTML table format, ensuring readability and clear presentation of the tabular data.
- Data Filtering: Implement filtering functionality for the table data based on 'site_name', 'common_name', and 'Feed type name', using input fields for users to specify filter criteria.
- CSV Download: Add button(s) or a prompt to export the visible data as CSV for download, formatting the data appropriately for CSV compatibility.

## Style Guidelines:

- Primary color: Moderate blue (#5B8DAE), chosen for its association with data, insights, and clarity. It strikes a balance between being professional and approachable.
- Background color: Light grayish-blue (#E8EDF0) — a very desaturated near-tint of the primary, provides a clean and unobtrusive backdrop that keeps the focus on the data.
- Accent color: Soft purple (#9163A4), an analogous color that adds a touch of sophistication, creativity and interest.
- Body and headline font: 'PT Sans' (sans-serif), used for its readability and modern appearance, ensuring clarity of data display.
- Use a clean, tabular layout for displaying the data. Ensure responsiveness for different screen sizes. Provide clear visual separation between data entries.
- Implement subtle transition animations when filtering or updating data in the table.