"use client"

import React, { createContext, useContext, useState, ReactNode } from "react"
import type { ParsedSheet } from "@/types"
import * as XLSX from "xlsx"

export interface SheetMap {
  [name: string]: ParsedSheet
}

interface ExcelContextType {
  file: File | null
  workbook: XLSX.WorkBook | null
  sheetNames: string[]
  sheets: SheetMap
  setExcelData: (file: File, wb: XLSX.WorkBook, names: string[], parsed: SheetMap) => void
  clearExcelData: () => void
}

const ExcelContext = createContext<ExcelContextType | undefined>(undefined)

export function ExcelProvider({ children }: { children: ReactNode }) {
  const [file, setFile] = useState<File | null>(null)
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null)
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [sheets, setSheets] = useState<SheetMap>({})

  const setExcelData = (f: File, wb: XLSX.WorkBook, names: string[], parsed: SheetMap) => {
    setFile(f)
    setWorkbook(wb)
    setSheetNames(names)
    setSheets(parsed)
  }

  const clearExcelData = () => {
    setFile(null)
    setWorkbook(null)
    setSheetNames([])
    setSheets({})
  }

  return (
    <ExcelContext.Provider
      value={{
        file,
        workbook,
        sheetNames,
        sheets,
        setExcelData,
        clearExcelData,
      }}
    >
      {children}
    </ExcelContext.Provider>
  )
}

export function useExcel() {
  const context = useContext(ExcelContext)
  if (context === undefined) {
    // Return safe default for Next.js prerendering
    return {
      file: null,
      workbook: null,
      sheetNames: [],
      sheets: {},
      setExcelData: () => {},
      clearExcelData: () => {},
    }
  }
  return context
}
