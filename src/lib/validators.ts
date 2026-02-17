import type { ValidationResult, DuplicateInfo } from "@/types"

export function checkDuplicatePKs(values: string[]): {
  hasDuplicates: boolean
  duplicates: DuplicateInfo[]
} {
  const seen = new Map<string, number[]>()

  for (let i = 0; i < values.length; i++) {
    const val = String(values[i]).trim()
    const existing = seen.get(val)
    if (existing) {
      existing.push(i + 2)
    } else {
      seen.set(val, [i + 2])
    }
  }

  const duplicates: DuplicateInfo[] = []
  seen.forEach((rows, value) => {
    if (rows.length > 1) {
      duplicates.push({ value, rows })
    }
  })

  return {
    hasDuplicates: duplicates.length > 0,
    duplicates,
  }
}

export function checkEmptyPKs(values: string[]): {
  hasEmpty: boolean
  emptyRows: number[]
} {
  const emptyRows: number[] = []

  for (let i = 0; i < values.length; i++) {
    const val = String(values[i] ?? "").trim()
    if (val === "" || val === "undefined" || val === "null") {
      emptyRows.push(i + 2)
    }
  }

  return {
    hasEmpty: emptyRows.length > 0,
    emptyRows,
  }
}

export function validate(pkValues: string[]): ValidationResult {
  const dupResult = checkDuplicatePKs(pkValues)
  const emptyResult = checkEmptyPKs(pkValues)

  return {
    hasDuplicates: dupResult.hasDuplicates,
    duplicates: dupResult.duplicates,
    hasEmptyPKs: emptyResult.hasEmpty,
    emptyPKRows: emptyResult.emptyRows,
  }
}
