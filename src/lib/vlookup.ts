import type { VlookupMapping, VlookupOutput, VlookupResult, CellValue } from "@/types"

export function performVlookup(
  lookupData: CellValue[][],
  lookupCol: number,
  referenceData: CellValue[][],
  matchCol: number,
  returnMappings: VlookupMapping[]
): VlookupOutput {
  const referenceMap = new Map<string, CellValue[]>()
  let duplicateKeysInReference = 0

  for (const row of referenceData) {
    const key = String(row[matchCol] ?? "").trim()
    if (key === "") continue
    if (referenceMap.has(key)) {
      duplicateKeysInReference++
    } else {
      referenceMap.set(key, row)
    }
  }

  let matchCount = 0
  let noMatchCount = 0
  const results: VlookupResult[] = []

  for (let i = 0; i < lookupData.length; i++) {
    const lookupVal = String(lookupData[i][lookupCol] ?? "").trim()

    if (lookupVal === "") {
      noMatchCount++
      results.push({
        row: i,
        matched: false,
        values: returnMappings.map(() => ""),
      })
      continue
    }

    const refRow = referenceMap.get(lookupVal)

    if (refRow) {
      matchCount++
      const values = returnMappings.map((m) =>
        String(refRow[m.returnCol] ?? "")
      )
      results.push({ row: i, matched: true, values })
    } else {
      noMatchCount++
      results.push({
        row: i,
        matched: false,
        values: returnMappings.map(() => ""),
      })
    }
  }

  return { results, matchCount, noMatchCount, duplicateKeysInReference }
}
