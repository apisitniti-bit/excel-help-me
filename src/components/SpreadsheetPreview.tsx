"use client"

import React, { useState, useMemo } from "react"
import { columnIndexToLetter } from "@/lib/excel"
import { cn } from "@/lib/utils"
import type { CellValue } from "@/types"

interface RowHighlight {
  type: "match" | "no-match" | "duplicate" | "empty-pk"
}

interface SpreadsheetPreviewProps {
  headers: string[]
  data: CellValue[][]
  rowHighlights?: Map<number, RowHighlight>
  highlightColumns?: number[]
  maxRows?: number
  className?: string
}

const ROWS_PER_PAGE = 100

export function SpreadsheetPreview({
  headers,
  data,
  rowHighlights,
  highlightColumns,
  maxRows,
  className,
}: SpreadsheetPreviewProps) {
  const [visibleRows, setVisibleRows] = useState(ROWS_PER_PAGE)
  const displayData = maxRows ? data.slice(0, maxRows) : data
  const shownData = displayData.slice(0, visibleRows)
  const hasMore = visibleRows < displayData.length

  const highlightColSet = useMemo(
    () => new Set(highlightColumns ?? []),
    [highlightColumns]
  )

  if (headers.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border bg-muted/30 p-8 text-muted-foreground">
        No data to display
      </div>
    )
  }

  return (
    <div className={cn("overflow-hidden rounded-lg border", className)}>
      <div className="overflow-auto max-h-[520px]">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-100 dark:bg-slate-800">
              <th className="sticky left-0 z-20 min-w-[48px] border-b border-r bg-slate-200 px-2 py-1.5 text-center text-xs font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                #
              </th>
              {headers.map((header, idx) => (
                <th
                  key={idx}
                  className="border-b border-r bg-slate-100 px-3 py-1.5 text-left dark:bg-slate-800"
                >
                  <div className="text-[10px] font-normal text-slate-400">
                    {columnIndexToLetter(idx)}
                  </div>
                  <div className="truncate font-semibold">{header}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shownData.map((row, rowIdx) => {
              const highlight = rowHighlights?.get(rowIdx)
              const rowBg = highlight
                ? highlight.type === "match"
                  ? "bg-emerald-50 dark:bg-emerald-950/30"
                  : highlight.type === "no-match"
                  ? "bg-red-50 dark:bg-red-950/30"
                  : highlight.type === "duplicate"
                  ? "bg-amber-50 dark:bg-amber-950/30"
                  : highlight.type === "empty-pk"
                  ? "bg-orange-50 dark:bg-orange-950/30"
                  : ""
                : rowIdx % 2 === 1
                ? "bg-slate-50/50 dark:bg-slate-900/30"
                : ""

              return (
                <tr key={rowIdx} className={rowBg}>
                  <td className="sticky left-0 z-[5] border-b border-r bg-slate-100 px-2 py-1 text-center text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {rowIdx + 2}
                  </td>
                  {headers.map((_, colIdx) => {
                    const cellVal = row[colIdx]
                    const display =
                      cellVal === null || cellVal === undefined
                        ? ""
                        : String(cellVal)
                    const isHighlightCol = highlightColSet.has(colIdx)

                    return (
                      <td
                        key={colIdx}
                        className={cn(
                          "border-b border-r px-3 py-1 max-w-[200px] truncate",
                          isHighlightCol && "font-medium bg-blue-50/50 dark:bg-blue-950/20"
                        )}
                        title={display}
                      >
                        {display}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t bg-slate-50 px-4 py-2 text-xs text-muted-foreground dark:bg-slate-900">
        <span>
          Showing {shownData.length} of {displayData.length} rows
        </span>
        {hasMore && (
          <button
            onClick={() => setVisibleRows((v) => v + ROWS_PER_PAGE)}
            className="font-medium text-primary hover:underline"
          >
            Show more rows
          </button>
        )}
      </div>
    </div>
  )
}
