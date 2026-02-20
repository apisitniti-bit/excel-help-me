"use client"

import React, { useCallback, useMemo, useEffect } from "react"
import { saveAs } from "file-saver"
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Info,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { FileUploader } from "@/components/FileUploader"
import { VirtualizedGrid } from "@/components/VirtualizedGrid"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { readExcelFile, parseSheet, getSheetNames, columnIndexToLetter, writeWorkbookWithResults } from "@/lib/excel"
import { performVlookup } from "@/lib/vlookup"
import { useExcel, type SheetMap } from "@/lib/excel-context"
import { useWizard } from "@/lib/wizard-context"
import { useVlookupContext } from "@/lib/vlookup-context"
import { useTranslation } from "@/lib/i18n-context"
import type { WizardStep, CellValue } from "@/types"

export default function VlookupPage() {
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
    lookupSheet, setLookupSheet,
    lookupColumn, setLookupColumn,
    referenceSheet, setReferenceSheet,
    matchColumn, setMatchColumn,
    returnMappings, setReturnMappings,
    targetSheet, setTargetSheet,
    resultData, setResultData,
    resultHeaders, setResultHeaders,
    vlookupOutput, setVlookupOutput,
    setHighlightMap,
    highlightCols, setHighlightCols,
    clearConfig
  } = useVlookupContext()

  const { highlightMap, cellHighlights } = useMemo(() => {
    const hMap = new Map<number, { type: "match" | "no-match" }>()
    const cMap = new Map<string, { type: "duplicate" | "empty-pk" | "no-match", message?: string }>()
    
    if (vlookupOutput) {
      for (const r of vlookupOutput.results) {
        hMap.set(r.row, { type: r.matched ? "match" : "no-match" })
        if (!r.matched) {
          // Highlight the lookup column
          cMap.set(`${r.row}-${lookupColumn}`, {
            type: "no-match",
            message: t.vlookup.missingMatch
          })
        }
      }
    }
    return { highlightMap: hMap, cellHighlights: cMap }
  }, [vlookupOutput, lookupColumn, t.vlookup.missingMatch])

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

      // Always auto-select first sheet so column dropdowns populate immediately
      if (names.length > 0) {
        setLookupSheet(names[0])
        setReferenceSheet(names[0])
        setTargetSheet(names[0])
        setLookupColumn("0")
        setMatchColumn("0")
      }

      setStep("configure")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.common.systemError)
    } finally {
      setLoading(false)
    }
  }, [setExcelData, setLookupSheet, setReferenceSheet, setTargetSheet, setLookupColumn, setMatchColumn, setStep, setError, setLoading, t.common.systemError])

  const handleClear = useCallback(() => {
    clearExcelData()
    resetWizard()
    clearConfig()
  }, [clearExcelData, resetWizard, clearConfig])

  const sheetOptions = useMemo(
    () => sheetNames.map((n) => ({ value: n, label: `${n} (${sheets[n]?.data.length ?? 0} ${t.common.rows})` })),
    [sheetNames, sheets, t.common.rows]
  )

  const getColumnOptions = useCallback((sheetName: string, otherSheetName?: string) => {
    const s = sheets[sheetName]
    if (!s) return []
    
    const otherHeaders = otherSheetName ? (sheets[otherSheetName]?.headers ?? []) : []
    const otherNorm = otherHeaders.map(h => h.trim().toLowerCase())
    
    return s.headers.map((h, i) => {
      const headerNorm = h.trim().toLowerCase()
      const canMatch = headerNorm !== "" && otherNorm.includes(headerNorm)
      
      return {
        value: String(i),
        label: canMatch 
          ? `✅ ${columnIndexToLetter(i)} — ${h} [สามารถจับคู่ได้]`
          : `${columnIndexToLetter(i)} — ${h}`,
      }
    })
  }, [sheets])

  const getTargetColumnOptions = useCallback((sheetName: string) => {
    const s = sheets[sheetName]
    if (!s) return []
    
    // Existing columns with data
    const existing = s.headers.map((h, i) => ({
      value: String(i),
      label: `${columnIndexToLetter(i)} — ${h}`,
    }))
    
    // Add 8 empty columns after the last data column
    const emptyColumns = []
    const startIdx = s.headers.length
    for (let i = 0; i < 8; i++) {
      const colIdx = startIdx + i
      emptyColumns.push({
        value: String(colIdx),
        label: `${columnIndexToLetter(colIdx)} — [${t.common.columns} ว่าง]`,
      })
    }
    
    return [...existing, ...emptyColumns]
  }, [sheets, t.common.columns])

  const lookupColOptions = useMemo(() => getColumnOptions(lookupSheet, referenceSheet), [lookupSheet, referenceSheet, getColumnOptions])
  const matchColOptions = useMemo(() => getColumnOptions(referenceSheet, lookupSheet), [referenceSheet, lookupSheet, getColumnOptions])
  const targetColOptions = useMemo(() => getTargetColumnOptions(targetSheet), [targetSheet, getTargetColumnOptions])
  const refReturnColOptions = useMemo(() => getColumnOptions(referenceSheet), [referenceSheet, getColumnOptions])

  // True when the selected FK and PK columns share the same header name (auto-detected pair)
  const autoDetectedMatch = useMemo(() => {
    if (!lookupSheet || !referenceSheet || lookupColumn === "" || matchColumn === "") return false
    const lHeader = (sheets[lookupSheet]?.headers[Number(lookupColumn)] ?? "").trim().toLowerCase()
    const rHeader = (sheets[referenceSheet]?.headers[Number(matchColumn)] ?? "").trim().toLowerCase()
    return lHeader !== "" && lHeader === rHeader
  }, [lookupSheet, referenceSheet, lookupColumn, matchColumn, sheets])

  // Column highlights for VirtualizedGrid - highlight FK/PK columns when they match
  const lookupColumnHighlights = useMemo(() => {
    const highlights = new Set<number>()
    if (autoDetectedMatch && lookupColumn !== "") {
      highlights.add(Number(lookupColumn))
    }
    return highlights
  }, [autoDetectedMatch, lookupColumn])

  const referenceColumnHighlights = useMemo(() => {
    const highlights = new Set<number>()
    if (autoDetectedMatch && matchColumn !== "") {
      highlights.add(Number(matchColumn))
    }
    return highlights
  }, [autoDetectedMatch, matchColumn])

  // Auto-detect: when lookup or reference sheet changes, find columns with matching header names
  // and set lookupColumn/matchColumn to the first matching pair
  useEffect(() => {
    if (!lookupSheet || !referenceSheet) return
    const lHeaders = sheets[lookupSheet]?.headers ?? []
    const rHeaders = sheets[referenceSheet]?.headers ?? []
    const lNorm = lHeaders.map((h) => h.trim().toLowerCase())
    const rNorm = rHeaders.map((h) => h.trim().toLowerCase())
    for (let li = 0; li < lNorm.length; li++) {
      if (lNorm[li] === "") continue
      const ri = rNorm.indexOf(lNorm[li])
      if (ri !== -1) {
        setLookupColumn(String(li))
        setMatchColumn(String(ri))
        return
      }
    }
    // No match found — fall back to first column
    setLookupColumn("0")
    setMatchColumn("0")
  }, [lookupSheet, referenceSheet]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select matching column when user manually changes lookupColumn
  const handleLookupColumnChange = useCallback((colIdx: string) => {
    setLookupColumn(colIdx)
    
    if (!lookupSheet || !referenceSheet) return
    const lHeaders = sheets[lookupSheet]?.headers ?? []
    const rHeaders = sheets[referenceSheet]?.headers ?? []
    const selectedHeader = (lHeaders[Number(colIdx)] ?? "").trim().toLowerCase()
    
    if (selectedHeader === "") return
    const rNorm = rHeaders.map((h) => h.trim().toLowerCase())
    const matchIdx = rNorm.indexOf(selectedHeader)
    
    if (matchIdx !== -1) {
      setMatchColumn(String(matchIdx))
    }
  }, [lookupSheet, referenceSheet, sheets, setLookupColumn, setMatchColumn])

  // Auto-select matching column when user manually changes matchColumn
  const handleMatchColumnChange = useCallback((colIdx: string) => {
    setMatchColumn(colIdx)
    
    if (!lookupSheet || !referenceSheet) return
    const lHeaders = sheets[lookupSheet]?.headers ?? []
    const rHeaders = sheets[referenceSheet]?.headers ?? []
    const selectedHeader = (rHeaders[Number(colIdx)] ?? "").trim().toLowerCase()
    
    if (selectedHeader === "") return
    const lNorm = lHeaders.map((h) => h.trim().toLowerCase())
    const matchIdx = lNorm.indexOf(selectedHeader)
    
    if (matchIdx !== -1) {
      setLookupColumn(String(matchIdx))
    }
  }, [lookupSheet, referenceSheet, sheets, setLookupColumn, setMatchColumn])

  const addMapping = () => {
    setReturnMappings((m) => [...m, { returnCol: -1, targetCol: -1, columnName: "" }])
  }

  const removeMapping = (idx: number) => {
    setReturnMappings((m) => m.filter((_, i) => i !== idx))
  }

  const updateMapping = (idx: number, field: "returnCol" | "targetCol", val: number) => {
    setReturnMappings((m) =>
      m.map((item, i) => (i === idx ? { ...item, [field]: val } : item))
    )
  }

  const updateMappingName = (idx: number, name: string) => {
    setReturnMappings((m) =>
      m.map((item, i) => (i === idx ? { ...item, columnName: name } : item))
    )
  }

  const canRunVlookup = useMemo(() => {
    if (!lookupSheet || lookupColumn === "" || !referenceSheet || matchColumn === "" || !targetSheet)
      return false
    return returnMappings.every((m) => m.returnCol >= 0 && m.targetCol >= 0)
  }, [lookupSheet, lookupColumn, referenceSheet, matchColumn, targetSheet, returnMappings])

  const runVlookup = useCallback(() => {
    const lookupData = sheets[lookupSheet]
    const refData = sheets[referenceSheet]
    const targetData = sheets[targetSheet]
    if (!lookupData || !refData || !targetData) return

    const output = performVlookup(
      lookupData.data,
      Number(lookupColumn),
      refData.data,
      Number(matchColumn),
      returnMappings
    )

    setVlookupOutput(output)

    // Build result: clone target sheet data, fill in results
    const newData: CellValue[][] = targetData.data.map((row) => [...row])
    const targetCols = returnMappings.map((m) => m.targetCol)

    for (const r of output.results) {
      const rowIdx = r.row
      while (newData.length <= rowIdx) {
        newData.push([])
      }
      const row = newData[rowIdx]
      for (let c = 0; c < targetCols.length; c++) {
        const colIdx = targetCols[c]
        while (row.length <= colIdx) {
          row.push("")
        }
        row[colIdx] = r.values[c]
      }
    }

    // Extend headers if needed; use custom columnName if provided
    const maxCol = Math.max(
      targetData.headers.length - 1,
      ...targetCols
    )
    const newHeaders = [...targetData.headers]
    while (newHeaders.length <= maxCol) {
      newHeaders.push(`Column ${columnIndexToLetter(newHeaders.length)}`)
    }
    // Override header names for target columns using custom columnName (if set)
    for (let c = 0; c < returnMappings.length; c++) {
      const m = returnMappings[c]
      if (m.columnName.trim() !== "") {
        newHeaders[m.targetCol] = m.columnName.trim()
      }
    }

    setResultData(newData)
    setResultHeaders(newHeaders)
    setHighlightCols(targetCols)
    setStep("preview")
  }, [lookupSheet, lookupColumn, referenceSheet, matchColumn, targetSheet, returnMappings, sheets, setVlookupOutput, setResultData, setResultHeaders, setHighlightCols, setStep])

  const handleExport = useCallback(() => {
    if (!workbook || !vlookupOutput) return

    // Allow export with N/A values (no longer block on missing matches)
    setError(null)

    const targetCols = returnMappings.map((m) => m.targetCol)

    // Build result values aligned to the lookup sheet rows (r.row is 0-indexed into lookupData)
    // We need one entry per lookup row, containing the looked-up values for each targetCol
    const lookupRowCount = vlookupOutput.results.length
    const resultValues: string[][] = Array.from({ length: lookupRowCount }, (_, i) => {
      const r = vlookupOutput.results[i]
      return r.values.map((v) => String(v ?? ""))
    })

    const blob = writeWorkbookWithResults(
      workbook,
      targetSheet,
      targetCols,
      resultValues,
      1 // data starts at row index 1 (after header)
    )
    saveAs(blob, `vlookup_result_${Date.now()}.xlsx`)
  }, [workbook, targetSheet, returnMappings, vlookupOutput, setError, t.vlookup.exportLocked])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">{t.vlookup.title}</h1>
        <p className="text-muted-foreground mt-1">
          {t.vlookup.description}
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
                  if (s === "preview" && resultData) setStep("preview")
                }}
                className={`rounded-sm px-4 py-1.5 font-medium capitalize transition-colors ${
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
          <XCircle className="h-4 w-4" />
          <AlertTitle>{t.common.systemError}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step: Upload */}
      {step === "upload" && (
        <Card className="border-border shadow-none rounded-md bg-card/50">
          <CardHeader className="border-b border-border/50 bg-muted/30 pb-4">
            <CardTitle className="font-mono text-sm uppercase text-muted-foreground tracking-wider">{t.vlookup.ingestionZone}</CardTitle>
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
      {step === "configure" && (
        <div className="space-y-6">
          <Card className="border-border shadow-none rounded-md">
            <CardHeader className="border-b border-border/50 bg-muted/30 pb-4">
              <CardTitle className="font-mono text-sm uppercase text-muted-foreground tracking-wider">{t.vlookup.datasetOverview}</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <FileUploader
                onFileSelect={handleFileSelect}
                currentFile={file}
                onClear={handleClear}
              />
              <div className="mt-4 flex flex-wrap gap-2">
                {sheetNames.map((n) => (
                  <Badge key={n} variant="secondary" className="font-mono rounded-sm">
                    {n} <span className="opacity-50 ml-2">[{sheets[n]?.data.length ?? 0}]</span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Lookup source */}
            <Card className="border-border shadow-none rounded-md">
              <CardHeader className="border-b border-border/50 bg-muted/30 pb-4">
                <CardTitle className="font-mono text-sm uppercase text-muted-foreground tracking-wider">{t.vlookup.lookupTarget}</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label className="font-mono text-xs text-muted-foreground uppercase">{t.vlookup.targetSheet}</Label>
                  <Select
                    value={lookupSheet}
                    onValueChange={setLookupSheet}
                    options={sheetOptions}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="font-mono text-xs text-muted-foreground uppercase">{t.vlookup.foreignKeyColumn}</Label>
                    {autoDetectedMatch && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-success/20 text-success-foreground border border-success/30">
                        {t.vlookup.autoDetected}
                      </span>
                    )}
                  </div>
                  <Select
                    value={lookupColumn}
                    onValueChange={handleLookupColumnChange}
                    options={lookupColOptions}
                    disabled={!lookupSheet}
                  />
                </div>
                {/* Preview grid for lookup sheet */}
                {lookupSheet && sheets[lookupSheet] && (
                  <div className="mt-4">
                    <Label className="font-mono text-xs text-muted-foreground uppercase mb-2 block">ตัวอย่างข้อมูล</Label>
                    <VirtualizedGrid
                      headers={sheets[lookupSheet].headers}
                      data={sheets[lookupSheet].data.slice(0, 5)}
                      columnHighlights={lookupColumnHighlights}
                      className="max-h-[200px]"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reference */}
            <Card className="border-border shadow-none rounded-md">
              <CardHeader className="border-b border-border/50 bg-muted/30 pb-4">
                <CardTitle className="font-mono text-sm uppercase text-muted-foreground tracking-wider">{t.vlookup.referenceSource}</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label className="font-mono text-xs text-muted-foreground uppercase">{t.vlookup.dictionarySheet}</Label>
                  <Select
                    value={referenceSheet}
                    onValueChange={setReferenceSheet}
                    options={sheetOptions}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="font-mono text-xs text-muted-foreground uppercase">{t.vlookup.primaryKeyColumn}</Label>
                    {autoDetectedMatch && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-success/20 text-success-foreground border border-success/30">
                        {t.vlookup.autoDetected}
                      </span>
                    )}
                  </div>
                  <Select
                    value={matchColumn}
                    onValueChange={handleMatchColumnChange}
                    options={matchColOptions}
                    disabled={!referenceSheet}
                  />
                </div>
                {/* Preview grid for reference sheet */}
                {referenceSheet && sheets[referenceSheet] && (
                  <div className="mt-4">
                    <Label className="font-mono text-xs text-muted-foreground uppercase mb-2 block">ตัวอย่างข้อมูล</Label>
                    <VirtualizedGrid
                      headers={sheets[referenceSheet].headers}
                      data={sheets[referenceSheet].data.slice(0, 5)}
                      columnHighlights={referenceColumnHighlights}
                      className="max-h-[200px]"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Return mappings */}
          <Card className="border-border shadow-none rounded-md">
            <CardHeader className="border-b border-border/50 bg-muted/30 pb-4 flex flex-row items-center justify-between">
              <CardTitle className="font-mono text-sm uppercase text-muted-foreground tracking-wider">{t.vlookup.mappingConfig}</CardTitle>
              <Button size="sm" variant="outline" onClick={addMapping} className="gap-1 rounded-sm h-8 font-mono text-xs">
                <Plus className="h-3.5 w-3.5" />
                {t.vlookup.newMapping}
              </Button>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2 max-w-sm">
                <Label className="font-mono text-xs text-muted-foreground uppercase">{t.vlookup.destinationSheet}</Label>
                <Select
                  value={targetSheet}
                  onValueChange={setTargetSheet}
                  options={sheetOptions}
                />
              </div>

              <div className="space-y-3">
                {returnMappings.map((m, idx) => (
                  <div
                    key={idx}
                    className="rounded-md border border-border/50 bg-muted/10 p-4 relative group space-y-3"
                  >
                    <div className="absolute -left-px -top-px -bottom-px w-1 bg-border group-hover:bg-primary transition-colors rounded-l-md" />
                    {/* Row 1: extraction → injection selects */}
                    <div className="flex items-end gap-3">
                      <div className="flex-1 space-y-2">
                        <Label className="font-mono text-xs text-muted-foreground uppercase">{t.vlookup.extractionColumn}</Label>
                        <Select
                          value={m.returnCol >= 0 ? String(m.returnCol) : ""}
                          onValueChange={(v) => updateMapping(idx, "returnCol", Number(v))}
                          options={refReturnColOptions}
                          disabled={!referenceSheet}
                        />
                      </div>
                      <div className="text-muted-foreground/50 pb-2">→</div>
                      <div className="flex-1 space-y-2">
                        <Label className="font-mono text-xs text-muted-foreground uppercase">{t.vlookup.injectionColumn}</Label>
                        <Select
                          value={m.targetCol >= 0 ? String(m.targetCol) : ""}
                          onValueChange={(v) => updateMapping(idx, "targetCol", Number(v))}
                          options={targetColOptions}
                          disabled={!targetSheet}
                        />
                      </div>
                      {returnMappings.length > 1 && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeMapping(idx)}
                          className="mb-0.5 h-10 w-10 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-sm"
                          aria-label="Remove mapping"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {/* Row 2: custom column name */}
                    <div className="space-y-1.5">
                      <Label className="font-mono text-xs text-muted-foreground uppercase">{t.vlookup.columnNameLabel}</Label>
                      <Input
                        value={m.columnName}
                        onChange={(e) => updateMappingName(idx, e.target.value)}
                        placeholder={t.vlookup.columnNamePlaceholder}
                        className="h-9 font-mono text-sm rounded-sm bg-background"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end pt-4">
            <Button onClick={runVlookup} disabled={!canRunVlookup} className="gap-2 rounded-sm font-mono tracking-wide h-12 px-8">
              {t.vlookup.executeJoin}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step: Preview */}
      {step === "preview" && resultData && vlookupOutput && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3 bg-muted/30 p-3 rounded-md border border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep("configure")}
              className="gap-1 rounded-sm font-mono text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t.common.reconfigure}
            </Button>

            <div className="w-px h-6 bg-border mx-2" />

            <Badge className="gap-1.5 rounded-sm font-mono bg-success/20 text-success-foreground hover:bg-success/30 border-0">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {vlookupOutput.matchCount} {t.vlookup.matched}
            </Badge>
            
            {vlookupOutput.noMatchCount > 0 && (
              <Badge className="gap-1.5 rounded-sm font-mono bg-destructive/20 text-destructive hover:bg-destructive/30 border-0">
                <XCircle className="h-3.5 w-3.5" />
                {vlookupOutput.noMatchCount} {t.vlookup.orphaned}
              </Badge>
            )}
            
            {vlookupOutput.duplicateKeysInReference > 0 && (
              <Badge className="gap-1.5 rounded-sm font-mono bg-warning/20 text-warning-foreground hover:bg-warning/30 border-0">
                <Info className="h-3.5 w-3.5" />
                {vlookupOutput.duplicateKeysInReference} {t.vlookup.dictDuplicates}
              </Badge>
            )}
          </div>

          <VirtualizedGrid
            headers={resultHeaders}
            data={resultData}
            rowHighlights={highlightMap}
            cellHighlights={cellHighlights}
            columnHighlights={new Set(highlightCols)}
          />

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="text-sm font-mono text-muted-foreground">
              {vlookupOutput.noMatchCount > 0 ? (
                <span className="text-destructive font-semibold">{t.vlookup.exportLocked.replace("{count}", String(vlookupOutput.noMatchCount))}</span>
              ) : (
                <span className="text-success font-semibold">{t.vlookup.datasetVerified}</span>
              )}
            </div>
            <Button 
              onClick={handleExport} 
              disabled={vlookupOutput.noMatchCount > 0}
              className="gap-2 rounded-sm font-mono tracking-wide h-12 px-8"
            >
              {t.common.exportXlsx}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
