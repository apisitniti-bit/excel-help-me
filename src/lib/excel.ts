import * as XLSX from "xlsx"
import type { ParsedSheet } from "@/types"

export function readExcelFile(file: File): Promise<XLSX.WorkBook> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        resolve(workbook)
      } catch (err) {
        reject(new Error("Failed to read Excel file. It may be corrupted or password-protected."))
      }
    }
    reader.onerror = () => reject(new Error("Failed to read file."))
    reader.readAsArrayBuffer(file)
  })
}

export function parseSheet(
  workbook: XLSX.WorkBook,
  sheetName: string
): ParsedSheet {
  const worksheet = workbook.Sheets[sheetName]
  if (!worksheet) {
    throw new Error(`Sheet "${sheetName}" not found.`)
  }

  const jsonData = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(
    worksheet,
    { header: 1, defval: "" }
  )

  if (jsonData.length === 0) {
    return { name: sheetName, headers: [], data: [] }
  }

  const headers = jsonData[0].map((h) => String(h ?? ""))
  const data = jsonData.slice(1)

  return { name: sheetName, headers, data }
}

export function getSheetNames(workbook: XLSX.WorkBook): string[] {
  return workbook.SheetNames
}

export function columnIndexToLetter(index: number): string {
  let result = ""
  let num = index
  while (num >= 0) {
    result = String.fromCharCode((num % 26) + 65) + result
    num = Math.floor(num / 26) - 1
  }
  return result
}

export function writeWorkbookWithResults(
  workbook: XLSX.WorkBook,
  targetSheetName: string,
  targetColumns: number[],
  results: string[][],
  startRow: number
): Blob {
  const wb = XLSX.utils.book_new()

  for (const sheetName of workbook.SheetNames) {
    const ws = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(
      workbook.Sheets[sheetName],
      { header: 1, defval: "" }
    )

    if (sheetName === targetSheetName) {
      for (let r = 0; r < results.length; r++) {
        const rowIdx = startRow + r
        while (ws.length <= rowIdx) {
          ws.push([])
        }
        const row = ws[rowIdx]
        for (let c = 0; c < targetColumns.length; c++) {
          const colIdx = targetColumns[c]
          while (row.length <= colIdx) {
            row.push("")
          }
          row[colIdx] = results[r][c]
        }
      }
    }

    const newWs = XLSX.utils.aoa_to_sheet(ws)
    XLSX.utils.book_append_sheet(wb, newWs, sheetName)
  }

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })
  return new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
}

export function writeDataToExcel(
  headers: string[],
  data: (string | number | boolean | null)[][]
): Blob {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Data")
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })
  return new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
}
