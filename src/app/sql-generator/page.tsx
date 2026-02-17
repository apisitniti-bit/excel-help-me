"use client"

import React, { useState, useCallback, useMemo } from "react"
import * as XLSX from "xlsx"
import { saveAs } from "file-saver"
import {
  ArrowLeft,
  ArrowRight,
  Database,
  Settings2,
} from "lucide-react"
import { FileUploader } from "@/components/FileUploader"
import { SpreadsheetPreview } from "@/components/SpreadsheetPreview"
import { SqlPreview } from "@/components/SqlPreview"
import { DuplicateWarning } from "@/components/DuplicateWarning"
import { ExportButtons } from "@/components/ExportButtons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import {
  readExcelFile,
  parseSheet,
  getSheetNames,
  columnIndexToLetter,
  writeDataToExcel,
} from "@/lib/excel"
import { generateInsertSQL, generateUpdateSQL } from "@/lib/sql-generator"
import { generateIds, validateIdConfig } from "@/lib/id-generator"
import { validate } from "@/lib/validators"
import type {
  ParsedSheet,
  InsertConfig,
  UpdateConfig,
  ValidationResult,
  WizardStep,
  CellValue,
} from "@/types"

export default function SqlGeneratorPage() {
  const [file, setFile] = useState<File | null>(null)
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [activeSheetName, setActiveSheetName] = useState("")
  const [activeSheet, setActiveSheet] = useState<ParsedSheet | null>(null)
  const [step, setStep] = useState<WizardStep>("upload")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<"insert" | "update">("insert")

  // INSERT config
  const [insertTableName, setInsertTableName] = useState("")
  const [insertPkCol, setInsertPkCol] = useState(0)
  const [idMode, setIdMode] = useState<"generate" | "existing">("generate")
  const [idPrefix, setIdPrefix] = useState("")
  const [idTotalLength, setIdTotalLength] = useState(14)
  const [idStartNumber, setIdStartNumber] = useState(1)
  const [includeColNames, setIncludeColNames] = useState(false)
  const [treatEmptyAsNull, setTreatEmptyAsNull] = useState(false)

  // UPDATE config
  const [updateTableName, setUpdateTableName] = useState("")
  const [updatePkCol, setUpdatePkCol] = useState(0)
  const [setColumns, setSetColumns] = useState<number[]>([])

  // Results
  const [generatedSQL, setGeneratedSQL] = useState<string[]>([])
  const [validation, setValidation] = useState<ValidationResult>({
    hasDuplicates: false,
    duplicates: [],
    hasEmptyPKs: false,
    emptyPKRows: [],
  })
  const [idError, setIdError] = useState<string | null>(null)

  // Workbook reference for sheet switching
  const [workbookRef, setWorkbookRef] = useState<XLSX.WorkBook | null>(null)
  const [allSheets, setAllSheets] = useState<Record<string, ParsedSheet>>({})

  const handleFileSelect = useCallback(async (f: File) => {
    setError(null)
    setLoading(true)
    try {
      const wb = await readExcelFile(f)
      const names = getSheetNames(wb)
      const parsed: Record<string, ParsedSheet> = {}
      for (const name of names) {
        parsed[name] = parseSheet(wb, name)
      }
      setFile(f)
      setWorkbookRef(wb)
      setSheetNames(names)
      setAllSheets(parsed)

      const firstSheet = names[0]
      setActiveSheetName(firstSheet)
      setActiveSheet(parsed[firstSheet])
      setStep("configure")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to read file.")
    } finally {
      setLoading(false)
    }
  }, [])

  const handleClear = useCallback(() => {
    setFile(null)
    setSheetNames([])
    setActiveSheetName("")
    setActiveSheet(null)
    setStep("upload")
    setError(null)
    setGeneratedSQL([])
    setWorkbookRef(null)
    setAllSheets({})
  }, [])

  const handleSheetChange = useCallback(
    (name: string) => {
      const sheet = allSheets[name]
      if (sheet) {
        setActiveSheetName(name)
        setActiveSheet(sheet)
        setSetColumns([])
      }
    },
    [allSheets]
  )

  const sheetOptions = useMemo(
    () =>
      sheetNames.map((n) => ({
        value: n,
        label: `${n} (${allSheets[n]?.data.length ?? 0} rows)`,
      })),
    [sheetNames, allSheets]
  )

  const columnOptions = useMemo(() => {
    if (!activeSheet) return []
    return activeSheet.headers.map((h, i) => ({
      value: String(i),
      label: `${columnIndexToLetter(i)} — ${h}`,
    }))
  }, [activeSheet])

  const toggleSetColumn = (colIdx: number) => {
    setSetColumns((prev) =>
      prev.includes(colIdx)
        ? prev.filter((c) => c !== colIdx)
        : [...prev, colIdx]
    )
  }

  const canGenerate = useMemo(() => {
    if (!activeSheet || activeSheet.data.length === 0) return false
    if (mode === "insert") {
      if (!insertTableName.trim()) return false
      if (idMode === "generate" && (!idPrefix && idTotalLength <= 0)) return false
      return true
    } else {
      if (!updateTableName.trim()) return false
      if (setColumns.length === 0) return false
      return true
    }
  }, [activeSheet, mode, insertTableName, updateTableName, setColumns, idMode, idPrefix, idTotalLength])

  const handleGenerate = useCallback(() => {
    if (!activeSheet) return
    setIdError(null)

    const data = activeSheet.data
    const headers = activeSheet.headers

    if (mode === "insert") {
      let ids: string[] | undefined
      const pkValues: string[] = []

      if (idMode === "generate") {
        const err = validateIdConfig(idPrefix, idTotalLength, idStartNumber, data.length)
        if (err) {
          setIdError(err.message)
          return
        }
        try {
          ids = generateIds(idPrefix, idTotalLength, idStartNumber, data.length)
          ids.forEach((id) => pkValues.push(id))
        } catch (e: unknown) {
          setIdError(e instanceof Error ? e.message : "ID generation failed.")
          return
        }
      } else {
        data.forEach((row) => {
          pkValues.push(String(row[insertPkCol] ?? "").trim())
        })
      }

      const v = validate(pkValues)
      setValidation(v)

      const config: InsertConfig = {
        tableName: insertTableName,
        pkColumn: insertPkCol,
        idMode,
        idPrefix,
        idTotalLength,
        idStartNumber,
        includeColumnNames: includeColNames,
        treatEmptyAsNull,
      }

      const sql = generateInsertSQL(config, headers, data, ids)
      setGeneratedSQL(sql)
      setStep("preview")
    } else {
      const pkValues = data.map((row) =>
        String(row[updatePkCol] ?? "").trim()
      )
      const v = validate(pkValues)
      setValidation(v)

      const filteredSetCols = setColumns.filter((c) => c !== updatePkCol)
      const config: UpdateConfig = {
        tableName: updateTableName,
        pkColumn: updatePkCol,
        setColumns: filteredSetCols,
        treatEmptyAsNull,
      }

      const sql = generateUpdateSQL(config, headers, data)
      setGeneratedSQL(sql)
      setStep("preview")
    }
  }, [
    activeSheet,
    mode,
    insertTableName,
    insertPkCol,
    idMode,
    idPrefix,
    idTotalLength,
    idStartNumber,
    includeColNames,
    treatEmptyAsNull,
    updateTableName,
    updatePkCol,
    setColumns,
  ])

  const hasValidationErrors = validation.hasDuplicates || validation.hasEmptyPKs

  const handleExportSql = useCallback(() => {
    return generatedSQL.join("\n")
  }, [generatedSQL])

  const handleExportXlsx = useCallback(() => {
    if (!activeSheet) return new Blob()

    if (mode === "insert" && idMode === "generate") {
      const ids = generateIds(idPrefix, idTotalLength, idStartNumber, activeSheet.data.length)
      const dataWithIds = activeSheet.data.map((row, i) => {
        const newRow = [...row]
        newRow[insertPkCol] = ids[i]
        return newRow
      })
      return writeDataToExcel(activeSheet.headers, dataWithIds)
    }

    return writeDataToExcel(activeSheet.headers, activeSheet.data)
  }, [activeSheet, mode, idMode, idPrefix, idTotalLength, idStartNumber, insertPkCol])

  const previewHighlights = useMemo(() => {
    const map = new Map<number, { type: "duplicate" | "empty-pk" }>()
    if (validation.hasDuplicates) {
      for (const d of validation.duplicates) {
        for (const row of d.rows) {
          map.set(row - 2, { type: "duplicate" })
        }
      }
    }
    if (validation.hasEmptyPKs) {
      for (const row of validation.emptyPKRows) {
        map.set(row - 2, { type: "empty-pk" })
      }
    }
    return map
  }, [validation])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">SQL Generator</h1>
        <p className="text-muted-foreground">
          Generate PostgreSQL INSERT &amp; UPDATE statements from Excel data
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {(["upload", "configure", "preview"] as WizardStep[]).map((s, i) => (
          <React.Fragment key={s}>
            {i > 0 && <div className="h-px w-6 bg-border" />}
            <button
              onClick={() => {
                if (s === "upload") return
                if (s === "configure" && file) setStep("configure")
                if (s === "preview" && generatedSQL.length > 0) setStep("preview")
              }}
              className={`rounded-full px-3 py-1 font-medium capitalize transition-colors ${
                step === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {i + 1}. {s}
            </button>
          </React.Fragment>
        ))}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step: Upload */}
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Excel File</CardTitle>
          </CardHeader>
          <CardContent>
            <FileUploader
              onFileSelect={handleFileSelect}
              currentFile={file}
              onClear={handleClear}
              disabled={loading}
            />
            {loading && (
              <p className="mt-3 text-sm text-muted-foreground animate-pulse">
                Reading file...
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step: Configure */}
      {step === "configure" && activeSheet && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">File & Sheet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FileUploader
                onFileSelect={handleFileSelect}
                currentFile={file}
                onClear={handleClear}
              />
              {sheetNames.length > 1 && (
                <div className="space-y-2">
                  <Label>Active Sheet</Label>
                  <Select
                    value={activeSheetName}
                    onValueChange={handleSheetChange}
                    options={sheetOptions}
                  />
                </div>
              )}
              <div className="flex gap-2">
                <Badge variant="secondary">
                  {activeSheet.headers.length} columns
                </Badge>
                <Badge variant="secondary">
                  {activeSheet.data.length} data rows
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Data preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Data Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <SpreadsheetPreview
                headers={activeSheet.headers}
                data={activeSheet.data}
                maxRows={20}
              />
            </CardContent>
          </Card>

          {/* Mode tabs */}
          <Tabs value={mode} onValueChange={(v) => setMode(v as "insert" | "update")}>
            <TabsList className="w-full justify-start">
              <TabsTrigger value="insert" className="gap-2">
                <Database className="h-4 w-4" />
                INSERT
              </TabsTrigger>
              <TabsTrigger value="update" className="gap-2">
                <Settings2 className="h-4 w-4" />
                UPDATE
              </TabsTrigger>
            </TabsList>

            {/* INSERT Config */}
            <TabsContent value="insert">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">INSERT Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Table Name</Label>
                      <Input
                        value={insertTableName}
                        onChange={(e) => setInsertTableName(e.target.value)}
                        placeholder="e.g. items"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Primary Key Column</Label>
                      <Select
                        value={String(insertPkCol)}
                        onValueChange={(v) => setInsertPkCol(Number(v))}
                        options={columnOptions}
                      />
                    </div>
                  </div>

                  {/* ID Mode */}
                  <div className="space-y-3">
                    <Label>Primary Key Mode</Label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setIdMode("generate")}
                        className={`flex-1 rounded-lg border p-3 text-left text-sm transition-colors ${
                          idMode === "generate"
                            ? "border-primary bg-primary/5 font-medium"
                            : "hover:bg-muted"
                        }`}
                      >
                        <div className="font-medium">Generate new IDs</div>
                        <div className="text-xs text-muted-foreground">
                          Auto-generate sequential IDs with a prefix
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIdMode("existing")}
                        className={`flex-1 rounded-lg border p-3 text-left text-sm transition-colors ${
                          idMode === "existing"
                            ? "border-primary bg-primary/5 font-medium"
                            : "hover:bg-muted"
                        }`}
                      >
                        <div className="font-medium">Use IDs from Excel</div>
                        <div className="text-xs text-muted-foreground">
                          Use existing values in the PK column
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* ID Generation Settings */}
                  {idMode === "generate" && (
                    <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                      <p className="text-sm font-medium">ID Generation Settings</p>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-2">
                          <Label className="text-xs">Prefix</Label>
                          <Input
                            value={idPrefix}
                            onChange={(e) => setIdPrefix(e.target.value)}
                            placeholder="e.g. 14520000"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Total ID Length</Label>
                          <Input
                            type="number"
                            value={idTotalLength}
                            onChange={(e) => setIdTotalLength(Number(e.target.value))}
                            min={1}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Starting Number</Label>
                          <Input
                            type="number"
                            value={idStartNumber}
                            onChange={(e) => setIdStartNumber(Number(e.target.value))}
                            min={0}
                          />
                        </div>
                      </div>
                      {idPrefix && idTotalLength > idPrefix.length && (
                        <p className="text-xs text-muted-foreground">
                          Preview: <code className="rounded bg-muted px-1 font-mono">
                            {idPrefix}{String(idStartNumber).padStart(idTotalLength - idPrefix.length, "0")}
                          </code>
                          {" → "}
                          <code className="rounded bg-muted px-1 font-mono">
                            {idPrefix}{String(idStartNumber + Math.max(0, (activeSheet?.data.length ?? 1) - 1)).padStart(idTotalLength - idPrefix.length, "0")}
                          </code>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Options */}
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={includeColNames}
                        onChange={(e) => setIncludeColNames(e.target.checked)}
                        className="rounded border-input"
                      />
                      Include column names in INSERT
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={treatEmptyAsNull}
                        onChange={(e) => setTreatEmptyAsNull(e.target.checked)}
                        className="rounded border-input"
                      />
                      Treat empty cells as NULL
                    </label>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* UPDATE Config */}
            <TabsContent value="update">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">UPDATE Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Table Name</Label>
                      <Input
                        value={updateTableName}
                        onChange={(e) => setUpdateTableName(e.target.value)}
                        placeholder="e.g. items"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Primary Key Column (WHERE clause)</Label>
                      <Select
                        value={String(updatePkCol)}
                        onValueChange={(v) => setUpdatePkCol(Number(v))}
                        options={columnOptions}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Columns to SET (click to toggle)</Label>
                    <div className="flex flex-wrap gap-2">
                      {activeSheet.headers.map((h, i) => {
                        if (i === updatePkCol) return null
                        const isSelected = setColumns.includes(i)
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => toggleSetColumn(i)}
                            className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                              isSelected
                                ? "border-primary bg-primary/10 font-medium text-primary"
                                : "hover:bg-muted"
                            }`}
                          >
                            {columnIndexToLetter(i)}: {h}
                          </button>
                        )
                      })}
                    </div>
                    {setColumns.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {setColumns.length} column{setColumns.length !== 1 ? "s" : ""} selected
                      </p>
                    )}
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={treatEmptyAsNull}
                      onChange={(e) => setTreatEmptyAsNull(e.target.checked)}
                      className="rounded border-input"
                    />
                    Treat empty cells as NULL
                  </label>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {idError && (
            <Alert variant="destructive">
              <AlertTitle>ID Generation Error</AlertTitle>
              <AlertDescription>{idError}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end">
            <Button onClick={handleGenerate} disabled={!canGenerate} className="gap-2">
              Generate SQL
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step: Preview */}
      {step === "preview" && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep("configure")}
              className="gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Badge variant="secondary">
              {mode.toUpperCase()} — {generatedSQL.length} statements
            </Badge>
          </div>

          <DuplicateWarning
            duplicates={validation.duplicates}
            emptyPKRows={validation.emptyPKRows}
          />

          {activeSheet && (
            <SpreadsheetPreview
              headers={activeSheet.headers}
              data={activeSheet.data}
              rowHighlights={previewHighlights}
              maxRows={50}
            />
          )}

          <SqlPreview statements={generatedSQL} />

          <div className="flex justify-end">
            <ExportButtons
              onExportSql={handleExportSql}
              onExportXlsx={handleExportXlsx}
              disabled={hasValidationErrors}
              fileNameBase={`${mode}_${mode === "insert" ? insertTableName : updateTableName}_${Date.now()}`}
            />
          </div>
        </div>
      )}
    </div>
  )
}
