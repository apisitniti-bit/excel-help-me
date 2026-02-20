"use client"

import React, { createContext, useContext, useState, ReactNode } from "react"
import type { VlookupMapping, VlookupOutput, CellValue } from "@/types"

interface VlookupContextType {
  lookupSheet: string
  setLookupSheet: (val: string) => void
  lookupColumn: string
  setLookupColumn: (val: string) => void
  referenceSheet: string
  setReferenceSheet: (val: string) => void
  matchColumn: string
  setMatchColumn: (val: string) => void
  returnMappings: VlookupMapping[]
  setReturnMappings: (val: VlookupMapping[] | ((prev: VlookupMapping[]) => VlookupMapping[])) => void
  targetSheet: string
  setTargetSheet: (val: string) => void
  
  resultData: CellValue[][] | null
  setResultData: (val: CellValue[][] | null) => void
  resultHeaders: string[]
  setResultHeaders: (val: string[]) => void
  vlookupOutput: VlookupOutput | null
  setVlookupOutput: (val: VlookupOutput | null) => void
  
  highlightMap: Map<number, { type: "match" | "no-match" }>
  setHighlightMap: (val: Map<number, { type: "match" | "no-match" }>) => void
  highlightCols: number[]
  setHighlightCols: (val: number[]) => void
  
  clearConfig: () => void
}

const VlookupContext = createContext<VlookupContextType | undefined>(undefined)

export function VlookupProvider({ children }: { children: ReactNode }) {
  const [lookupSheet, setLookupSheet] = useState("")
  const [lookupColumn, setLookupColumn] = useState("")
  const [referenceSheet, setReferenceSheet] = useState("")
  const [matchColumn, setMatchColumn] = useState("")
  const [returnMappings, setReturnMappings] = useState<VlookupMapping[]>([{ returnCol: -1, targetCol: -1, columnName: "" }])
  const [targetSheet, setTargetSheet] = useState("")
  
  const [resultData, setResultData] = useState<CellValue[][] | null>(null)
  const [resultHeaders, setResultHeaders] = useState<string[]>([])
  const [vlookupOutput, setVlookupOutput] = useState<VlookupOutput | null>(null)
  
  const [highlightMap, setHighlightMap] = useState<Map<number, { type: "match" | "no-match" }>>(new Map())
  const [highlightCols, setHighlightCols] = useState<number[]>([])

  const clearConfig = () => {
    setLookupSheet("")
    setLookupColumn("")
    setReferenceSheet("")
    setMatchColumn("")
    setReturnMappings([{ returnCol: -1, targetCol: -1, columnName: "" }])
    setTargetSheet("")
    setResultData(null)
    setResultHeaders([])
    setVlookupOutput(null)
    setHighlightMap(new Map())
    setHighlightCols([])
  }

  return (
    <VlookupContext.Provider
      value={{
        lookupSheet, setLookupSheet,
        lookupColumn, setLookupColumn,
        referenceSheet, setReferenceSheet,
        matchColumn, setMatchColumn,
        returnMappings, setReturnMappings,
        targetSheet, setTargetSheet,
        resultData, setResultData,
        resultHeaders, setResultHeaders,
        vlookupOutput, setVlookupOutput,
        highlightMap, setHighlightMap,
        highlightCols, setHighlightCols,
        clearConfig
      }}
    >
      {children}
    </VlookupContext.Provider>
  )
}

export function useVlookupContext() {
  const context = useContext(VlookupContext)
  if (context === undefined) {
    // Return safe default for Next.js prerendering
    return {
      lookupSheet: "", setLookupSheet: () => {},
      lookupColumn: "", setLookupColumn: () => {},
      referenceSheet: "", setReferenceSheet: () => {},
      matchColumn: "", setMatchColumn: () => {},
      returnMappings: [], setReturnMappings: () => {},
      targetSheet: "", setTargetSheet: () => {},
      resultData: null, setResultData: () => {},
      resultHeaders: [], setResultHeaders: () => {},
      vlookupOutput: null, setVlookupOutput: () => {},
      highlightMap: new Map(), setHighlightMap: () => {},
      highlightCols: [], setHighlightCols: () => {},
      clearConfig: () => {}
    }
  }
  return context
}
