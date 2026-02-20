"use client"

import React, { createContext, useContext, useState, ReactNode } from "react"
import type { InsertConfig, UpdateConfig, ValidationResult, IdGenerationError } from "@/types"

interface SqlGeneratorContextType {
  mode: "insert" | "update"
  setMode: (val: "insert" | "update") => void
  
  insertConfig: InsertConfig
  setInsertConfig: (val: InsertConfig | ((prev: InsertConfig) => InsertConfig)) => void
  
  updateConfig: UpdateConfig
  setUpdateConfig: (val: UpdateConfig | ((prev: UpdateConfig) => UpdateConfig)) => void
  
  sqlStatements: string[]
  setSqlStatements: (val: string[]) => void
  
  validationResult: ValidationResult | null
  setValidationResult: (val: ValidationResult | null) => void
  
  idError: IdGenerationError | null
  setIdError: (val: IdGenerationError | null) => void
  
  clearConfig: () => void
}

const defaultInsertConfig: InsertConfig = {
  tableName: "my_table",
  pkColumn: 0,
  idMode: "existing",
  idPrefix: "ID-",
  idTotalLength: 10,
  idStartNumber: 1,
  includeColumnNames: false,
  treatEmptyAsNull: false,
}

const defaultUpdateConfig: UpdateConfig = {
  tableName: "my_table",
  pkColumn: 0,
  setColumns: [],
  treatEmptyAsNull: false,
}

const SqlGeneratorContext = createContext<SqlGeneratorContextType | undefined>(undefined)

export function SqlGeneratorProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"insert" | "update">("insert")
  const [insertConfig, setInsertConfig] = useState<InsertConfig>(defaultInsertConfig)
  const [updateConfig, setUpdateConfig] = useState<UpdateConfig>(defaultUpdateConfig)
  const [sqlStatements, setSqlStatements] = useState<string[]>([])
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [idError, setIdError] = useState<IdGenerationError | null>(null)

  const clearConfig = () => {
    setInsertConfig(defaultInsertConfig)
    setUpdateConfig(defaultUpdateConfig)
    setSqlStatements([])
    setValidationResult(null)
    setIdError(null)
  }

  return (
    <SqlGeneratorContext.Provider
      value={{
        mode, setMode,
        insertConfig, setInsertConfig,
        updateConfig, setUpdateConfig,
        sqlStatements, setSqlStatements,
        validationResult, setValidationResult,
        idError, setIdError,
        clearConfig
      }}
    >
      {children}
    </SqlGeneratorContext.Provider>
  )
}

export function useSqlGeneratorContext() {
  const context = useContext(SqlGeneratorContext)
  if (context === undefined) {
    // Return safe default for Next.js prerendering
    return {
      mode: "insert" as "insert" | "update", setMode: () => {},
      insertConfig: defaultInsertConfig, setInsertConfig: () => {},
      updateConfig: defaultUpdateConfig, setUpdateConfig: () => {},
      sqlStatements: [], setSqlStatements: () => {},
      validationResult: null, setValidationResult: () => {},
      idError: null, setIdError: () => {},
      clearConfig: () => {}
    }
  }
  return context
}
