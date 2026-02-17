import type { InsertConfig, UpdateConfig, CellValue } from "@/types"
import { formatSqlValue, quoteIdentifier } from "./postgres-escape"

export function generateInsertSQL(
  config: InsertConfig,
  headers: string[],
  data: CellValue[][],
  generatedIds?: string[]
): string[] {
  const tableName = quoteIdentifier(config.tableName)
  const statements: string[] = []

  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    const values: string[] = []

    for (let j = 0; j < headers.length; j++) {
      if (j === config.pkColumn && config.idMode === "generate" && generatedIds) {
        values.push(`'${generatedIds[i]}'`)
      } else {
        values.push(formatSqlValue(row[j], config.treatEmptyAsNull))
      }
    }

    if (config.includeColumnNames) {
      const colNames = headers.map((h) => quoteIdentifier(h)).join(", ")
      statements.push(
        `INSERT INTO ${tableName} (${colNames}) VALUES (${values.join(", ")});`
      )
    } else {
      statements.push(
        `INSERT INTO ${tableName} VALUES (${values.join(", ")});`
      )
    }
  }

  return statements
}

export function generateUpdateSQL(
  config: UpdateConfig,
  headers: string[],
  data: CellValue[][]
): string[] {
  const tableName = quoteIdentifier(config.tableName)
  const pkColName = quoteIdentifier(headers[config.pkColumn])
  const statements: string[] = []

  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    const pkValue = formatSqlValue(row[config.pkColumn], false)

    const setClauses: string[] = []
    for (const colIdx of config.setColumns) {
      if (colIdx === config.pkColumn) continue
      const colName = quoteIdentifier(headers[colIdx])
      const colValue = formatSqlValue(row[colIdx], config.treatEmptyAsNull)
      setClauses.push(`${colName} = ${colValue}`)
    }

    if (setClauses.length === 0) continue

    statements.push(
      `UPDATE ${tableName} SET ${setClauses.join(", ")} WHERE ${pkColName} = ${pkValue};`
    )
  }

  return statements
}
