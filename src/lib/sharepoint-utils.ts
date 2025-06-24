// src/lib/sharepoint-utils.ts

/**
 * Parses values from SharePoint text columns that are intended to be booleans.
 * SharePoint "Yes/No" columns return true/false, but if a user creates a
 * text column, they might enter "Sim", "True", "x", etc.
 * @param value The value from SharePoint.
 * @returns `true` if the value represents a positive/true state, otherwise `false`.
 */
export const parseSharePointBoolean = (value: any): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const lowerValue = value.toLowerCase().trim();
    return ['true', 'sim', 'yes', '1', 'x', 's'].includes(lowerValue);
  }
  if (typeof value === 'number') {
    return value === 1;
  }
  return false;
};
