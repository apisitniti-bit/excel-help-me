"use client"

import React, { useCallback, useRef, useState } from "react"
import { Upload, FileSpreadsheet, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileUploaderProps {
  onFileSelect: (file: File) => void
  currentFile: File | null
  onClear: () => void
  disabled?: boolean
}

export function FileUploader({
  onFileSelect,
  currentFile,
  onClear,
  disabled,
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (file: File) => {
      const ext = file.name.split(".").pop()?.toLowerCase()
      if (ext !== "xlsx" && ext !== "xls") {
        alert("Please upload a .xlsx or .xls file.")
        return
      }
      onFileSelect(file)
    },
    [onFileSelect]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (disabled) return
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile, disabled]
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (!disabled) setIsDragging(true)
    },
    [disabled]
  )

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleClick = useCallback(() => {
    if (!disabled) inputRef.current?.click()
  }, [disabled])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
      if (inputRef.current) inputRef.current.value = ""
    },
    [handleFile]
  )

  if (currentFile) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <FileSpreadsheet className="h-8 w-8 text-emerald-600 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-emerald-900">
            {currentFile.name}
          </p>
          <p className="text-sm text-emerald-700">
            {(currentFile.size / 1024).toFixed(1)} KB
          </p>
        </div>
        <button
          onClick={onClear}
          className="rounded-md p-1 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    )
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleChange}
        className="hidden"
      />
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        <Upload className="h-10 w-10 text-muted-foreground" />
        <div className="text-center">
          <p className="font-medium">Drop your Excel file here</p>
          <p className="text-sm text-muted-foreground">
            or click to browse — .xlsx and .xls supported
          </p>
        </div>
      </div>
    </>
  )
}
