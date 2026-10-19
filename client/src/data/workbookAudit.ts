import workbookRows from "./../../../data/worksheet_sites.json";

export type WorkbookAudit = {
  totalRows: number;
  uniqueIds: number;
  duplicateIds: string[];
  duplicateEnglishNames: string[];
  rowsWithCoordinatesText: number;
  rowsWithEmptyCoreFields: number;
  coreFieldCoverage: number;
};

const rows = workbookRows as Array<Record<string, string>>;
const ids = rows.map((row) => row.ID).filter(Boolean);
const names = rows.map((row) => row.Site_Name_EN).filter(Boolean);
const duplicateValues = (values: string[]) => [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
const requiredFields = ["Site_Name_AR", "Site_Name_EN", "Country_Region", "Target_Planetary_Body_and_Feature"];
const completeRows = rows.filter((row) => requiredFields.every((field) => row[field]?.trim()));

export const workbookAudit: WorkbookAudit = {
  totalRows: rows.length,
  uniqueIds: new Set(ids).size,
  duplicateIds: duplicateValues(ids),
  duplicateEnglishNames: duplicateValues(names),
  rowsWithCoordinatesText: rows.filter((row) => row.Coordinates_Dimensions_Elevation?.trim()).length,
  rowsWithEmptyCoreFields: rows.length - completeRows.length,
  coreFieldCoverage: rows.length ? Math.round((completeRows.length / rows.length) * 100) : 0,
};
