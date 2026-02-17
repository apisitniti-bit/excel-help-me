"use client"

import React from "react"
import { AlertTriangle } from "lucide-react"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import type { DuplicateInfo } from "@/types"

interface DuplicateWarningProps {
  duplicates: DuplicateInfo[]
  emptyPKRows: number[]
}

export function DuplicateWarning({
  duplicates,
  emptyPKRows,
}: DuplicateWarningProps) {
  if (duplicates.length === 0 && emptyPKRows.length === 0) return null

  return (
    <div className="space-y-3">
      {duplicates.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Duplicate Primary Keys Detected</AlertTitle>
          <AlertDescription>
            <p className="mb-2">
              Export is blocked. Fix the following duplicates in your Excel file:
            </p>
            <div className="max-h-40 overflow-auto rounded bg-destructive/10 p-2 text-xs font-mono">
              {duplicates.map((d, i) => (
                <div key={i} className="py-0.5">
                  <span className="font-semibold">&quot;{d.value}&quot;</span>
                  {" — rows "}
                  {d.rows.join(", ")}
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {emptyPKRows.length > 0 && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Empty Primary Key Values</AlertTitle>
          <AlertDescription>
            <p className="mb-1">
              Export is blocked. The following rows have empty primary key values:
            </p>
            <p className="text-xs font-mono">
              Rows: {emptyPKRows.join(", ")}
            </p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
