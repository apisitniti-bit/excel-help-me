"use client"

import React, { useState, useCallback, useMemo } from "react"
import * as XLSX from "xlsx"
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
import { SpreadsheetPreview } from "@/components/SpreadsheetPreview"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { readExcelFile, parseSheet, getSheetNames, columnIndexToLetter, writeWorkbookWithResults } from "@/lib/excel"
import { performVlookup } from "@/lib/vlookup"
import type { ParsedSheet, VlookupMapping, WizardStep, CellValue } from "@/types"

interface SheetMap {
  [name: string]: ParsedSheet
}

export default function VlookupPage() {
  const [file, setFile] = useState<File | null>(null)
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null)
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [sheets, setSheets] = useState<SheetMap>({})
  const [step, setStep] = useState<WizardStep>("upload")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Config
  const [lookupSheet, setLookupSheet] = useState("")
  const [lookupColumn, setLookupColumn] = useState("")
  const [referenceSheet, setReferenceSheet] = useState("")
  const [matchColumn, setMatchColumn] = useState("")
  const [returnMappings, setReturnMappings] = useState<VlookupMapping[]>([
    { returnCol: -1, targetCol: -1 },
  ])
  const [targetSheet, setTargetSheet] = useState("")

  // Results
  const [resultData, setResultData] = useState<CellValue[][] | null>(null)
  const [resultHeaders, setResultHeaders] = useState<string[]>([])
  const [matchCount, setMatchCount] = useState(0)
  const [noMatchCount, setNoMatchCount] = useState(0)
  const [dupKeysInRef, setDupKeysInRef] = useState(0)
  const [highlightMap, setHighlightMap] = useState<
    Map<number, { type: "match" | "no-match" }>
  >(new Map())
  const [highlightCols, setHighlightCols] = useState<number[]>([])

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
      setFile(f)
      setWorkbook(wb)
      setSheetNames(names)
      setSheets(parsed)

      if (names.length === 1) {
        setLookupSheet(names[0])
        setReferenceSheet(names[0])
        setTargetSheet(names[0])
      }

      setStep("configure")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to read file.")
    } finally {
      setLoading(false)
    }
  }, [])

  const handleClear = useCallback(() => {
    setFile(null)
    setWorkbook(null)
    setSheetNames([])
    setSheets({})
    setStep("upload")
    setError(null)
    setLookupSheet("")
    setLookupColumn("")
    setReferenceSheet("")
    setMatchColumn("")
    setReturnMappings([{ returnCol: -1, targetCol: -1 }])
    setTargetSheet("")
    setResultData(null)
    setResultHeaders([])
  }, [])

  const sheetOptions = useMemo(
    () => sheetNames.map((n) => ({ value: n, label: `${n} (${sheets[n]?.data.length ?? 0} rows)` })),
    [sheetNames, sheets]
  )

  const getColumnOptions = useCallback(
    (sheetName: string) => {
      const s = sheets[sheetName]
      if (!s) return []
      return s.headers.map((h, i) => ({
        value: String(i),
        label: `${columnIndexToLetter(i)} — ${h}`,
      }))
    },
    [sheets]
  )

  const lookupColOptions = useMemo(() => getColumnOptions(lookupSheet), [lookupSheet, getColumnOptions])
  const matchColOptions = useMemo(() => getColumnOptions(referenceSheet), [referenceSheet, getColumnOptions])
  const targetColOptions = useMemo(() => getColumnOptions(targetSheet), [targetSheet, getColumnOptions])
  const refReturnColOptions = useMemo(() => getColumnOptions(referenceSheet), [referenceSheet, getColumnOptions])

  const addMapping = () => {
    setReturnMappings((m) => [...m, { returnCol: -1, targetCol: -1 }])
  }

  const removeMapping = (idx: number) => {
    setReturnMappings((m) => m.filter((_, i) => i !== idx))
  }

  const updateMapping = (idx: number, field: "returnCol" | "targetCol", val: number) => {
    setReturnMappings((m) =>
      m.map((item, i) => (i === idx ? { ...item, [field]: val } : item))
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

    setMatchCount(output.matchCount)
    setNoMatchCount(output.noMatchCount)
    setDupKeysInRef(output.duplicateKeysInReference)

    // Build result: clone target sheet data, fill in results
    const newData: CellValue[][] = targetData.data.map((row) => [...row])
    const targetCols = returnMappings.map((m) => m.targetCol)

    const hMap = new Map<number, { type: "match" | "no-match" }>()
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
      hMap.set(rowIdx, { type: r.matched ? "match" : "no-match" })
    }

    // Extend headers if needed
    const maxCol = Math.max(
      targetData.headers.length - 1,
      ...targetCols
    )
    const newHeaders = [...targetData.headers]
    while (newHeaders.length <= maxCol) {
      newHeaders.push(`Column ${columnIndexToLetter(newHeaders.length)}`)
    }

    setResultData(newData)
    setResultHeaders(newHeaders)
    setHighlightMap(hMap)
    setHighlightCols(targetCols)
    setStep("preview")
  }, [lookupSheet, lookupColumn, referenceSheet, matchColumn, targetSheet, returnMappings, sheets])

  const handleExport = useCallback(() => {
    if (!workbook || !resultData) return

    const targetCols = returnMappings.map((m) => m.targetCol)
    const resultValues = resultData.map((row) =>
      targetCols.map((c) => String(row[c] ?? ""))
    )

    const blob = writeWorkbookWithResults(
      workbook,
      targetSheet,
      targetCols,
      resultValues,
      1 // data starts at row index 1 (after header)
    )
    saveAs(blob, `vlookup_result_${Date.now()}.xlsx`)
  }, [workbook, resultData, targetSheet, returnMappings])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">VLOOKUP</h1>
        <p className="text-muted-foreground">
          Upload an Excel file and match data between sheets
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
                if (s === "preview" && resultData) setStep("preview")
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
          <XCircle className="h-4 w-4" />
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
      {step === "configure" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">File Info</CardTitle>
            </CardHeader>
            <CardContent>
              <FileUploader
                onFileSelect={handleFileSelect}
                currentFile={file}
                onClear={handleClear}
              />
              <div className="mt-3 flex gap-2">
                {sheetNames.map((n) => (
                  <Badge key={n} variant="secondary">
                    {n} ({sheets[n]?.data.length ?? 0} rows)
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Lookup source */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Lookup Source</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Sheet</Label>
                  <Select
                    value={lookupSheet}
                    onValueChange={setLookupSheet}
                    options={sheetOptions}
                    placeholder="Select lookup sheet"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Lookup Column</Label>
                  <Select
                    value={lookupColumn}
                    onValueChange={setLookupColumn}
                    options={lookupColOptions}
                    placeholder="Select column to lookup"
                    disabled={!lookupSheet}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Reference */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Reference Source</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Sheet</Label>
                  <Select
                    value={referenceSheet}
                    onValueChange={setReferenceSheet}
                    options={sheetOptions}
                    placeholder="Select reference sheet"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Match Column</Label>
                  <Select
                    value={matchColumn}
                    onValueChange={setMatchColumn}
                    options={matchColOptions}
                    placeholder="Select column to match"
                    disabled={!referenceSheet}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Return mappings */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Return Columns → Target Columns</CardTitle>
              <Button size="sm" variant="outline" onClick={addMapping} className="gap-1">
                <Plus className="h-3.5 w-3.5" />
                Add Mapping
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Target Sheet</Label>
                <Select
                  value={targetSheet}
                  onValueChange={setTargetSheet}
                  options={sheetOptions}
                  placeholder="Select target sheet"
                />
              </div>

              {returnMappings.map((m, idx) => (
                <div
                  key={idx}
                  className="flex items-end gap-3 rounded-lg border bg-muted/30 p-3"
                >
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Return Column (from reference)</Label>
                    <Select
                      value={m.returnCol >= 0 ? String(m.returnCol) : ""}
                      onValueChange={(v) => updateMapping(idx, "returnCol", Number(v))}
                      options={refReturnColOptions}
                      placeholder="Select..."
                      disabled={!referenceSheet}
                    />
                  </div>
                  <div className="text-muted-foreground pb-2">→</div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Target Column</Label>
                    <Select
                      value={m.targetCol >= 0 ? String(m.targetCol) : ""}
                      onValueChange={(v) => updateMapping(idx, "targetCol", Number(v))}
                      options={targetColOptions}
                      placeholder="Select..."
                      disabled={!targetSheet}
                    />
                  </div>
                  {returnMappings.length > 1 && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeMapping(idx)}
                      className="mb-0.5 h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={runVlookup} disabled={!canRunVlookup} className="gap-2">
              Run VLOOKUP
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step: Preview */}
      {step === "preview" && resultData && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep("configure")}
              className="gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Configure
            </Button>

            <Badge variant="success" className="gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {matchCount} matched
            </Badge>
            {noMatchCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3.5 w-3.5" />
                {noMatchCount} not matched
              </Badge>
            )}
            {dupKeysInRef > 0 && (
              <Badge variant="warning" className="gap-1">
                <Info className="h-3.5 w-3.5" />
                {dupKeysInRef} duplicate keys in reference
              </Badge>
            )}
          </div>

          <SpreadsheetPreview
            headers={resultHeaders}
            data={resultData}
            rowHighlights={highlightMap}
            highlightColumns={highlightCols}
          />

          <div className="flex justify-end">
            <Button onClick={handleExport} className="gap-2">
              Export .xlsx
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
