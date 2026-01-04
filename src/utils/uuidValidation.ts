/**
 * Validates if a string is a valid UUID format
 * @param value - The string to validate
 * @returns true if the string is a valid UUID, false otherwise
 */
export const isValidUUID = (value: string | null | undefined): boolean => {
  if (!value || typeof value !== 'string') {
    return false;
  }
  
  // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

/**
 * Filters an array of cycle IDs to only include valid UUIDs
 * @param cycleIds - Array of cycle IDs to filter
 * @returns Array of valid UUID cycle IDs
 */
export const filterValidCycleIds = (cycleIds: string[] | null | undefined): string[] => {
  if (!cycleIds || !Array.isArray(cycleIds)) {
    return [];
  }
  
  return cycleIds.filter(id => isValidUUID(id));
};

