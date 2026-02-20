"use client"

import React, { useCallback, useMemo, useEffect } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Database,
  Settings2,
} from "lucide-react"
import { FileUploader } from "@/components/FileUploader"
import { VirtualizedGrid } from "@/components/VirtualizedGrid"
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
import { useExcel, type SheetMap } from "@/lib/excel-context"
import { useWizard } from "@/lib/wizard-context"
import { useSqlGeneratorContext } from "@/lib/sql-context"
import { useTranslation } from "@/lib/i18n-context"
import type {
  ParsedSheet,
  InsertConfig,
  UpdateConfig,
  WizardStep,
} from "@/types"

export default function SqlGeneratorPage() {
  const t = useTranslation()
  const { file, workbook, sheetNames, sheets, setExcelData, clearExcelData } = useExcel()
  const { step, setStep, error, setError, isLoading, setLoading, resetWizard } = useWizard()

  // Guard: if URL step is configure/preview but no file is loaded, reset to upload
  useEffect(() => {
    if (!file && step !== "upload") {
      setStep("upload")
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const {
    mode, setMode,
    insertConfig, setInsertConfig,
    updateConfig, setUpdateConfig,
    sqlStatements, setSqlStatements,
    validationResult, setValidationResult,
    idError, setIdError,
    clearConfig
  } = useSqlGeneratorContext()

  // Local state for active sheet
  const [activeSheetName, setActiveSheetName] = React.useState("")
  const activeSheet = sheets[activeSheetName]

  const handleFileSelect = useCallback(async (f: File) => {
    setError(null)
    setLoading(true)
    try {
      const wb = await readExcelFile(f)
      const names = getSheetNames(wb)
      const parsed: SheetMap = {}
      for (const name of names) {
        parsed[name] = parseSheet(wb, name)
      }
      setExcelData(f, wb, names, parsed)

      const firstSheet = names[0]
      setActiveSheetName(firstSheet)
      setStep("configure")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.common.systemError)
    } finally {
      setLoading(false)
    }
  }, [setExcelData, setStep, setError, setLoading, t.common.systemError])

  const handleClear = useCallback(() => {
    clearExcelData()
    setActiveSheetName("")
    resetWizard()
    clearConfig()
  }, [clearExcelData, resetWizard, clearConfig])

  const handleSheetChange = useCallback(
    (name: string) => {
      if (sheets[name]) {
        setActiveSheetName(name)
        setUpdateConfig(prev => ({ ...prev, setColumns: [] }))
      }
    },
    [sheets, setUpdateConfig]
  )

  const sheetOptions = useMemo(
    () =>
      sheetNames.map((n) => ({
        value: n,
        label: `${n} (${sheets[n]?.data.length ?? 0} ${t.common.rows})`,
      })),
    [sheetNames, sheets, t.common.rows]
  )

  const columnOptions = useMemo(() => {
    if (!activeSheet) return []
    return activeSheet.headers.map((h, i) => ({
      value: String(i),
      label: `${columnIndexToLetter(i)} — ${h}`,
    }))
  }, [activeSheet])

  const toggleSetColumn = (colIdx: number) => {
    setUpdateConfig(prev => ({
      ...prev,
      setColumns: prev.setColumns.includes(colIdx)
        ? prev.setColumns.filter((c) => c !== colIdx)
        : [...prev.setColumns, colIdx]
    }))
  }

  const canGenerate = useMemo(() => {
    if (!activeSheet || activeSheet.data.length === 0) return false
    if (mode === "insert") {
      if (!insertConfig.tableName.trim()) return false
      if (insertConfig.idMode === "generate" && (!insertConfig.idPrefix && insertConfig.idTotalLength <= 0)) return false
      return true
    } else {
      if (!updateConfig.tableName.trim()) return false
      if (updateConfig.setColumns.length === 0) return false
      return true
    }
  }, [activeSheet, mode, insertConfig, updateConfig])

  const handleGenerate = useCallback(() => {
    if (!activeSheet) return
    setIdError(null)

    const data = activeSheet.data
    const headers = activeSheet.headers

    if (mode === "insert") {
      let ids: string[] | undefined
      const pkValues: string[] = []

      if (insertConfig.idMode === "generate") {
        const err = validateIdConfig(
          insertConfig.idPrefix,
          insertConfig.idTotalLength,
          insertConfig.idStartNumber,
          data.length
        )
        if (err) {
          setIdError({ type: err.type as "prefix_too_long" | "overflow", message: err.message })
          return
        }
        try {
          ids = generateIds(
            insertConfig.idPrefix,
            insertConfig.idTotalLength,
            insertConfig.idStartNumber,
            data.length
          )
          ids.forEach((id) => pkValues.push(id))
        } catch (e: unknown) {
          setIdError({ type: "overflow", message: e instanceof Error ? e.message : "ID generation failed." })
          return
        }
      } else {
        data.forEach((row) => {
          pkValues.push(String(row[insertConfig.pkColumn] ?? "").trim())
        })
      }

      const v = validate(pkValues)
      setValidationResult(v)

      const sql = generateInsertSQL(insertConfig, headers, data, ids)
      setSqlStatements(sql)
      setStep("preview")
    } else {
      const pkValues = data.map((row) =>
        String(row[updateConfig.pkColumn] ?? "").trim()
      )
      const v = validate(pkValues)
      setValidationResult(v)

      const filteredSetCols = updateConfig.setColumns.filter((c) => c !== updateConfig.pkColumn)
      const configWithFilteredCols = { ...updateConfig, setColumns: filteredSetCols }

      const sql = generateUpdateSQL(configWithFilteredCols, headers, data)
      setSqlStatements(sql)
      setStep("preview")
    }
  }, [
    activeSheet,
    mode,
    insertConfig,
    updateConfig,
    setIdError,
    setValidationResult,
    setSqlStatements,
    setStep,
  ])

  const hasValidationErrors = Boolean(
    validationResult && 
    (validationResult.hasDuplicates || validationResult.hasEmptyPKs)
  )

  const handleExportSql = useCallback(() => {
    return sqlStatements.join("\n")
  }, [sqlStatements])

  const handleExportXlsx = useCallback(() => {
    if (!activeSheet) return new Blob()

    if (mode === "insert" && insertConfig.idMode === "generate") {
      const ids = generateIds(
        insertConfig.idPrefix,
        insertConfig.idTotalLength,
        insertConfig.idStartNumber,
        activeSheet.data.length
      )
      const dataWithIds = activeSheet.data.map((row, i) => {
        const newRow = [...row]
        newRow[insertConfig.pkColumn] = ids[i]
        return newRow
      })
      return writeDataToExcel(activeSheet.headers, dataWithIds)
    }

    return writeDataToExcel(activeSheet.headers, activeSheet.data)
  }, [activeSheet, mode, insertConfig])

  const {
    previewHighlights,
    cellHighlights
  } = useMemo(() => {
    const rMap = new Map<number, { type: "duplicate" | "empty-pk" }>()
    const cMap = new Map<string, { type: "duplicate" | "empty-pk" | "no-match", message?: string }>()
    
    if (validationResult?.hasDuplicates) {
      for (const d of validationResult.duplicates) {
        for (const row of d.rows) {
          const rowIdx = row - 2
          rMap.set(rowIdx, { type: "duplicate" })
          
          // Target the specific PK column cell
          const pkCol = mode === "insert" ? insertConfig.pkColumn : updateConfig.pkColumn
          cMap.set(`${rowIdx}-${pkCol}`, { 
            type: "duplicate",
            message: `${t.sql.duplicatePkTitle}: "${d.value}"`
          })
        }
      }
    }
    if (validationResult?.hasEmptyPKs) {
      for (const row of validationResult.emptyPKRows) {
        const rowIdx = row - 2
        rMap.set(rowIdx, { type: "empty-pk" })
        
        // Target the specific PK column cell
        const pkCol = mode === "insert" ? insertConfig.pkColumn : updateConfig.pkColumn
        cMap.set(`${rowIdx}-${pkCol}`, { 
          type: "empty-pk",
          message: t.sql.emptyPkTitle
        })
      }
    }
    return { previewHighlights: rMap, cellHighlights: cMap }
  }, [validationResult, mode, insertConfig.pkColumn, updateConfig.pkColumn, t.sql.duplicatePkTitle, t.sql.emptyPkTitle])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">{t.sql.title}</h1>
        <p className="text-muted-foreground mt-1">
          {t.sql.description}
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm font-mono">
        {(["upload", "configure", "preview"] as WizardStep[]).map((s, i) => {
          let stepLabel: string = s;
          if (s === "upload") stepLabel = t.common.upload;
          if (s === "configure") stepLabel = t.common.configure;
          if (s === "preview") stepLabel = t.common.preview;

          return (
            <React.Fragment key={s}>
              {i > 0 && <div className="h-px w-6 bg-border" />}
              <button
                onClick={() => {
                  if (s === "upload") return
                  if (s === "configure" && file) setStep("configure")
                  if (s === "preview" && sqlStatements.length > 0) setStep("preview")
                }}
                className={`rounded-sm px-4 py-1.5 font-medium transition-colors ${
                  step === s
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground border border-border/50"
                }`}
              >
                {String(i + 1).padStart(2, "0")} {stepLabel}
              </button>
            </React.Fragment>
          )
        })}
      </div>

      {error && (
        <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive font-mono">
          <AlertTitle>{t.common.systemError}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step: Upload */}
      {step === "upload" && (
        <Card className="border-border shadow-none rounded-md bg-card/50">
          <CardHeader className="border-b border-border/50 bg-muted/30 pb-4">
            <CardTitle className="font-mono text-sm text-muted-foreground tracking-wider">{t.vlookup.ingestionZone}</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <FileUploader
              onFileSelect={handleFileSelect}
              currentFile={file}
              onClear={handleClear}
              disabled={isLoading}
            />
            {isLoading && (
              <p className="mt-3 text-xs font-mono text-muted-foreground animate-pulse">
                {t.common.loading}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step: Configure */}
      {step === "configure" && activeSheet && (
        <div className="space-y-6">
          <Card className="border-border shadow-none rounded-md">
            <CardHeader className="border-b border-border/50 bg-muted/30 pb-4">
              <CardTitle className="font-mono text-sm text-muted-foreground tracking-wider">{t.sql.datasetSelection}</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <FileUploader
                onFileSelect={handleFileSelect}
                currentFile={file}
                onClear={handleClear}
              />
              {sheetNames.length > 1 && (
                <div className="space-y-2 max-w-sm">
                  <Label className="font-mono text-xs text-muted-foreground">{t.sql.activeSheet}</Label>
                  <Select
                    value={activeSheetName}
                    onValueChange={handleSheetChange}
                    options={sheetOptions}
                  />
                </div>
              )}
              <div className="flex gap-2 font-mono text-sm">
                <Badge variant="secondary" className="rounded-sm bg-muted/50 border border-border/50">
                  {activeSheet.headers.length} {t.common.columns}
                </Badge>
                <Badge variant="secondary" className="rounded-sm bg-muted/50 border border-border/50">
                  {activeSheet.data.length} {t.common.rows}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Mode tabs */}
          <Tabs value={mode} onValueChange={(v) => setMode(v as "insert" | "update")}>
            <TabsList className="w-full justify-start rounded-sm p-1 bg-muted/50 border border-border">
              <TabsTrigger value="insert" className="gap-2 rounded-sm font-mono tracking-wide data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Database className="h-4 w-4" />
                {t.sql.insertMode}
              </TabsTrigger>
              <TabsTrigger value="update" className="gap-2 rounded-sm font-mono tracking-wide data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Settings2 className="h-4 w-4" />
                {t.sql.updateMode}
              </TabsTrigger>
            </TabsList>

            {/* INSERT Config */}
            <TabsContent value="insert" className="mt-4">
              <Card className="border-border shadow-none rounded-md">
                <CardHeader className="border-b border-border/50 bg-muted/30 pb-4">
                  <CardTitle className="font-mono text-sm text-muted-foreground tracking-wider">{t.sql.parameters}</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="font-mono text-xs text-muted-foreground">{t.sql.targetTableName}</Label>
                      <Input
                        value={insertConfig.tableName}
                        onChange={(e) => setInsertConfig(p => ({ ...p, tableName: e.target.value }))}
                        placeholder="e.g. items"
                        className="font-mono bg-muted/10 border-border/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-mono text-xs text-muted-foreground">{t.sql.pkInjectionColumn}</Label>
                      <Select
                        value={String(insertConfig.pkColumn)}
                        onValueChange={(v) => setInsertConfig(p => ({ ...p, pkColumn: Number(v) }))}
                        options={columnOptions}
                      />
                    </div>
                  </div>

                  {/* ID Mode */}
                  <div className="space-y-3">
                    <Label className="font-mono text-xs text-muted-foreground">{t.sql.pkSource}</Label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setInsertConfig(p => ({ ...p, idMode: "generate" }))}
                        className={`flex-1 rounded-md border p-4 text-left transition-colors ${
                          insertConfig.idMode === "generate"
                            ? "border-primary bg-primary/10 shadow-sm"
                            : "hover:bg-muted/50 border-border/50 bg-muted/10"
                        }`}
                      >
                        <div className="font-mono text-sm font-semibold">{t.sql.algorithmicGen}</div>
                        <div className="text-xs text-muted-foreground mt-1 font-mono">
                          {t.sql.algorithmicGenDesc}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setInsertConfig(p => ({ ...p, idMode: "existing" }))}
                        className={`flex-1 rounded-md border p-4 text-left transition-colors ${
                          insertConfig.idMode === "existing"
                            ? "border-primary bg-primary/10 shadow-sm"
                            : "hover:bg-muted/50 border-border/50 bg-muted/10"
                        }`}
                      >
                        <div className="font-mono text-sm font-semibold">{t.sql.inheritExisting}</div>
                        <div className="text-xs text-muted-foreground mt-1 font-mono">
                          {t.sql.inheritExistingDesc}
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* ID Generation Settings */}
                  {insertConfig.idMode === "generate" && (
                    <div className="rounded-md border border-border/50 bg-muted/10 p-5 space-y-5">
                      <p className="font-mono text-sm text-muted-foreground tracking-wider">{t.sql.algorithmConstraints}</p>
                      <div className="grid gap-5 sm:grid-cols-3">
                        <div className="space-y-2">
                          <Label className="font-mono text-xs">{t.sql.prefixString}</Label>
                          <Input
                            value={insertConfig.idPrefix}
                            onChange={(e) => setInsertConfig(p => ({ ...p, idPrefix: e.target.value }))}
                            placeholder="e.g. ID-"
                            className="font-mono bg-background"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-mono text-xs">{t.sql.absoluteLength}</Label>
                          <Input
                            type="number"
                            value={insertConfig.idTotalLength}
                            onChange={(e) => setInsertConfig(p => ({ ...p, idTotalLength: Number(e.target.value) }))}
                            min={1}
                            className="font-mono bg-background"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-mono text-xs">{t.sql.startIndex}</Label>
                          <Input
                            type="number"
                            value={insertConfig.idStartNumber}
                            onChange={(e) => setInsertConfig(p => ({ ...p, idStartNumber: Number(e.target.value) }))}
                            min={0}
                            className="font-mono bg-background"
                          />
                        </div>
                      </div>
                      {insertConfig.idPrefix && insertConfig.idTotalLength > insertConfig.idPrefix.length && (
                        <div className="bg-background border border-border/50 rounded p-3">
                          <p className="font-mono text-xs text-muted-foreground flex items-center gap-2">
                            <span className="text-[10px] tracking-wider">{t.sql.validationOutput}</span>
                            <code className="text-primary font-bold">
                              {insertConfig.idPrefix}{String(insertConfig.idStartNumber).padStart(insertConfig.idTotalLength - insertConfig.idPrefix.length, "0")}
                            </code>
                            {" → "}
                            <code className="text-primary font-bold">
                              {insertConfig.idPrefix}{String(insertConfig.idStartNumber + Math.max(0, (activeSheet?.data.length ?? 1) - 1)).padStart(insertConfig.idTotalLength - insertConfig.idPrefix.length, "0")}
                            </code>
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Options */}
                  <div className="flex flex-wrap gap-6 pt-2 border-t border-border/30">
                    <label className="flex items-center gap-2 text-sm font-mono">
                      <input
                        type="checkbox"
                        checked={insertConfig.includeColumnNames}
                        onChange={(e) => setInsertConfig(p => ({ ...p, includeColumnNames: e.target.checked }))}
                        className="rounded border-input bg-muted"
                      />
                      {t.sql.includeColumnNames}
                    </label>
                    <label className="flex items-center gap-2 text-sm font-mono">
                      <input
                        type="checkbox"
                        checked={insertConfig.treatEmptyAsNull}
                        onChange={(e) => setInsertConfig(p => ({ ...p, treatEmptyAsNull: e.target.checked }))}
                        className="rounded border-input bg-muted"
                      />
                      {t.sql.emptyCellsAsNull}
                    </label>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* UPDATE Config */}
            <TabsContent value="update" className="mt-4">
              <Card className="border-border shadow-none rounded-md">
                <CardHeader className="border-b border-border/50 bg-muted/30 pb-4">
                  <CardTitle className="font-mono text-sm text-muted-foreground tracking-wider">{t.sql.parameters}</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="font-mono text-xs text-muted-foreground">{t.sql.targetTableName}</Label>
                      <Input
                        value={updateConfig.tableName}
                        onChange={(e) => setUpdateConfig(p => ({ ...p, tableName: e.target.value }))}
                        placeholder="e.g. items"
                        className="font-mono bg-muted/10 border-border/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-mono text-xs text-muted-foreground">{t.sql.pkWhereClause}</Label>
                      <Select
                        value={String(updateConfig.pkColumn)}
                        onValueChange={(v) => setUpdateConfig(p => ({ ...p, pkColumn: Number(v) }))}
                        options={columnOptions}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="font-mono text-xs text-muted-foreground">{t.sql.targetSetColumns}</Label>
                    <div className="flex flex-wrap gap-2 p-4 rounded-md border border-border/50 bg-muted/10">
                      {activeSheet.headers.map((h, i) => {
                        if (i === updateConfig.pkColumn) return null
                        const isSelected = updateConfig.setColumns.includes(i)
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => toggleSetColumn(i)}
                            className={`rounded border px-3 py-1.5 font-mono text-xs transition-colors ${
                              isSelected
                                ? "border-primary bg-primary/20 text-primary-foreground font-semibold"
                                : "border-border/50 bg-background hover:bg-muted/80 text-muted-foreground"
                            }`}
                          >
                            <span className="opacity-50 mr-1">{columnIndexToLetter(i)}</span> {h}
                          </button>
                        )
                      })}
                    </div>
                    {updateConfig.setColumns.length > 0 && (
                      <p className="text-xs font-mono text-primary font-semibold">
                        {updateConfig.setColumns.length} {t.sql.activeSetColumns}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-border/30">
                    <label className="flex items-center gap-2 text-sm font-mono">
                      <input
                        type="checkbox"
                        checked={updateConfig.treatEmptyAsNull}
                        onChange={(e) => setUpdateConfig(p => ({ ...p, treatEmptyAsNull: e.target.checked }))}
                        className="rounded border-input bg-muted"
                      />
                      {t.sql.emptyCellsAsNull}
                    </label>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {idError && (
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive font-mono">
              <AlertTitle>{t.sql.algoError.replace("{type}", idError.type)}</AlertTitle>
              <AlertDescription>{idError.message}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end pt-4">
            <Button onClick={handleGenerate} disabled={!canGenerate} className="gap-2 rounded-sm font-mono tracking-wide h-12 px-8">
              {t.sql.compileStatements}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step: Preview */}
      {step === "preview" && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 bg-muted/30 p-3 rounded-md border border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep("configure")}
              className="gap-1 rounded-sm font-mono text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t.sql.recompile}
            </Button>
            <div className="w-px h-6 bg-border mx-2" />
            <Badge variant="secondary" className="rounded-sm font-mono text-xs bg-muted border border-border uppercase">
              {mode} MODE
            </Badge>
            <Badge variant="secondary" className="rounded-sm font-mono text-xs bg-primary/20 text-primary border-0">
              {sqlStatements.length} {t.sql.statements}
            </Badge>
          </div>

          {validationResult && (
            <DuplicateWarning
              duplicates={validationResult.duplicates}
              emptyPKRows={validationResult.emptyPKRows}
            />
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-2 h-full">
              <Label className="font-mono text-xs text-muted-foreground">{t.sql.gridValidator}</Label>
              {activeSheet && (
                <VirtualizedGrid
                  headers={activeSheet.headers}
                  data={activeSheet.data}
                  rowHighlights={previewHighlights}
                  cellHighlights={cellHighlights}
                  className="flex-1 min-h-[400px]"
                />
              )}
            </div>
            
            <div className="flex flex-col gap-2 h-full">
              <Label className="font-mono text-xs text-muted-foreground">{t.sql.compiledOutput}</Label>
              <SqlPreview statements={sqlStatements} />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="text-sm font-mono text-muted-foreground">
              {hasValidationErrors ? (
                <span className="text-destructive font-semibold">{t.sql.exportLocked}</span>
              ) : (
                <span className="text-success font-semibold">{t.sql.integrityVerified}</span>
              )}
            </div>
            <ExportButtons
              onExportSql={handleExportSql}
              onExportXlsx={handleExportXlsx}
              disabled={hasValidationErrors}
              fileNameBase={`${mode}_${mode === "insert" ? insertConfig.tableName : updateConfig.tableName}_${Date.now()}`}
            />
          </div>
        </div>
      )}
    </div>
  )
}
