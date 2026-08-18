/** Force every table column to center. Callers must not set align/headerAlign. */

export function centerTableColumns<T>(
  columns: Array<T> | undefined,
): Array<T> | undefined {
  if (!columns) {
    return columns;
  }
  return columns.map((column) => {
    if (column === null || typeof column !== 'object') {
      return column;
    }
    return {
      ...column,
      align: 'center' as const,
      headerAlign: 'center' as const,
    };
  }) as Array<T>;
}
