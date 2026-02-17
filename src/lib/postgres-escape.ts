export function escapePostgres(value: string): string {
  return value
    .replace(/\0/g, "")
    .replace(/'/g, "''")
}

export function formatSqlValue(
  value: string | number | boolean | null | undefined,
  treatEmptyAsNull: boolean
): string {
  if (value === null || value === undefined) {
    return treatEmptyAsNull ? "NULL" : "''"
  }
  const str = String(value)
  if (str === "" && treatEmptyAsNull) {
    return "NULL"
  }
  return `'${escapePostgres(str)}'`
}

export function quoteIdentifier(name: string): string {
  if (/^[a-z_][a-z0-9_]*$/.test(name)) {
    return name
  }
  return `"${name.replace(/"/g, '""')}"`
}
