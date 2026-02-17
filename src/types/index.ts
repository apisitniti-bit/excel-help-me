export interface ParsedSheet {
  name: string
  headers: string[]
  data: (string | number | boolean | null)[][]
}

export interface VlookupMapping {
  returnCol: number
  targetCol: number
}

export interface VlookupConfig {
  lookupSheet: string
  lookupColumn: number
  referenceSheet: string
  matchColumn: number
  returnMappings: VlookupMapping[]
  targetSheet: string
}

export interface VlookupResult {
  row: number
  matched: boolean
  values: string[]
}

export interface VlookupOutput {
  results: VlookupResult[]
  matchCount: number
  noMatchCount: number
  duplicateKeysInReference: number
}

export interface InsertConfig {
  tableName: string
  pkColumn: number
  idMode: "generate" | "existing"
  idPrefix: string
  idTotalLength: number
  idStartNumber: number
  includeColumnNames: boolean
  treatEmptyAsNull: boolean
}

export interface UpdateConfig {
  tableName: string
  pkColumn: number
  setColumns: number[]
  treatEmptyAsNull: boolean
}

export interface DuplicateInfo {
  value: string
  rows: number[]
}

export interface ValidationResult {
  hasDuplicates: boolean
  duplicates: DuplicateInfo[]
  hasEmptyPKs: boolean
  emptyPKRows: number[]
}

export interface IdGenerationError {
  type: "prefix_too_long" | "overflow"
  message: string
}

export type CellValue = string | number | boolean | null | undefined

export type WizardStep = "upload" | "configure" | "preview"
