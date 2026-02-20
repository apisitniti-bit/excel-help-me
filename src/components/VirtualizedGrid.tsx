"use client"

import React, { useRef, useMemo, memo } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { cn } from "@/lib/utils"
import { GridRoot, GridHeader, GridHead, GridBody, GridRow, GridCell, GridRowNumberCell } from "@/components/ui/grid"
import { columnIndexToLetter } from "@/lib/excel"
import type { CellValue } from "@/types"

interface VirtualizedGridProps {
  headers: string[]
  data: CellValue[][]
  rowHighlights?: Map<number, { type: "match" | "no-match" | "duplicate" | "empty-pk" }>
  cellHighlights?: Map<string, { type: "duplicate" | "empty-pk" | "no-match", message?: string }> // key: `${rowIdx}-${colIdx}`
  columnHighlights?: Set<number> // Set of column indices to highlight
  className?: string
}

export const VirtualizedGrid = memo(function VirtualizedGrid({
  headers,
  data,
  rowHighlights,
  cellHighlights,
  columnHighlights,
  className
}: VirtualizedGridProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40, // 40px estimated row height
    overscan: 20,
  })

  // Prevent freezing on massive column counts
  const renderHeaders = useMemo(() => headers.map((h, i) => {
    const isHighlighted = columnHighlights?.has(i)
    return (
      <th key={i} title={h} className={cn(
        "h-10 px-3 text-left align-middle font-medium border-r border-border/50 bg-muted",
        isHighlighted && "bg-primary/10 border-primary/30"
      )} style={{ width: "180px", minWidth: "180px", maxWidth: "180px" }}>
        <div className="space-y-0.5">
          <div className={cn(
            "text-[10px] uppercase font-mono tracking-wider",
            isHighlighted ? "text-primary font-semibold" : "text-muted-foreground/70"
          )}>
            {columnIndexToLetter(i)}
          </div>
          <div className={cn(
            "text-xs leading-tight truncate",
            isHighlighted ? "text-primary font-medium" : "text-muted-foreground"
          )}>
            {h}
          </div>
        </div>
      </th>
    )
  }), [headers, columnHighlights])

  return (
    <div
      ref={parentRef}
      className={cn("w-full overflow-auto rounded-md border border-border bg-card max-h-[600px] relative", className)}
      style={{ contentVisibility: "auto" }}
    >
      <table className="w-full caption-bottom text-sm tabular-nums border-collapse">
        <thead className="sticky top-0 z-20 bg-muted border-b border-border shadow-sm">
          <tr>
            <th className="w-12 h-10 px-2 align-middle bg-muted border-r border-border sticky left-0 z-30 text-center" style={{ width: "48px", minWidth: "48px", maxWidth: "48px" }} />
            {renderHeaders}
          </tr>
        </thead>
        <tbody
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: "relative",
          }}
          className="[&_tr:last-child]:border-0 bg-background"
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const rowIdx = virtualRow.index
            const row = data[rowIdx]
            const highlight = rowHighlights?.get(rowIdx)

            return (
              <tr
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className={cn(
                  "border-b border-border transition-colors group",
                  highlight?.type === "match" && "bg-success/15 hover:bg-success/25",
                  highlight?.type === "no-match" && "bg-destructive/10 hover:bg-destructive/20",
                  highlight?.type === "duplicate" && "bg-warning/20 hover:bg-warning/30",
                  highlight?.type === "empty-pk" && "bg-warning/20 hover:bg-warning/30",
                  !highlight && "hover:bg-muted/50"
                )}
              >
                <td className={cn(
                  "sticky left-0 z-10 p-2 align-middle text-center text-xs text-muted-foreground font-mono border-r border-border shadow-[1px_0_0_0_var(--border)] bg-muted/80 backdrop-blur group-hover:bg-muted transition-colors",
                  highlight && "bg-transparent backdrop-blur-none"
                )} style={{ width: "48px", minWidth: "48px", maxWidth: "48px" }}>
                  {rowIdx + 2}
                </td>
                {headers.map((_, colIdx) => {
                  const val = row[colIdx]
                  const strVal = String(val ?? "")
                  const cellKey = `${rowIdx}-${colIdx}`
                  const cHighlight = cellHighlights?.get(cellKey)
                  const isColumnHighlighted = columnHighlights?.has(colIdx)

                  return (
                    <td
                      key={colIdx}
                      title={cHighlight ? cHighlight.message : strVal}
                      className={cn(
                        "p-2 align-middle truncate overflow-hidden border-r border-border/50 font-mono text-xs",
                        cHighlight?.type === "duplicate" && "bg-warning/40 text-warning-foreground font-bold shadow-[inset_2px_0_0_0_var(--warning)]",
                        cHighlight?.type === "empty-pk" && "bg-destructive/20 text-destructive font-bold italic shadow-[inset_2px_0_0_0_var(--destructive)]",
                        cHighlight?.type === "no-match" && "bg-destructive/20 text-destructive font-bold shadow-[inset_2px_0_0_0_var(--destructive)]",
                        isColumnHighlighted && !cHighlight && "bg-primary/5 border-primary/20"
                      )}
                      style={{ width: "180px", minWidth: "180px", maxWidth: "180px" }}
                    >
                      {cHighlight ? (
                        <div className="flex items-center gap-2">
                          <span className="shrink-0">⚠️</span>
                          <span className="truncate">{strVal === "" ? <span className="opacity-0">.</span> : strVal}</span>
                        </div>
                      ) : (
                        strVal === "" ? <span className="opacity-0">.</span> : strVal
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
})
