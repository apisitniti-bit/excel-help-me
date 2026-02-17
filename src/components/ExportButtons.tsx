"use client"

import React from "react"
import { Download, FileDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { saveAs } from "file-saver"

interface ExportButtonsProps {
  onExportSql?: () => string
  onExportXlsx?: () => Blob
  disabled?: boolean
  fileNameBase?: string
}

export function ExportButtons({
  onExportSql,
  onExportXlsx,
  disabled,
  fileNameBase = "export",
}: ExportButtonsProps) {
  const handleSql = () => {
    if (!onExportSql) return
    const sql = onExportSql()
    const blob = new Blob(["\uFEFF" + sql], {
      type: "text/plain;charset=utf-8",
    })
    saveAs(blob, `${fileNameBase}.sql`)
  }

  const handleXlsx = () => {
    if (!onExportXlsx) return
    const blob = onExportXlsx()
    saveAs(blob, `${fileNameBase}.xlsx`)
  }

  return (
    <div className="flex items-center gap-3">
      {onExportSql && (
        <Button
          onClick={handleSql}
          disabled={disabled}
          variant="default"
          className="gap-2"
        >
          <FileDown className="h-4 w-4" />
          Export .sql
        </Button>
      )}
      {onExportXlsx && (
        <Button
          onClick={handleXlsx}
          disabled={disabled}
          variant="outline"
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Export .xlsx
        </Button>
      )}
    </div>
  )
}
