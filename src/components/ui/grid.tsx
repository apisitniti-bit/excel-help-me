import React, { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function GridRoot({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative w-full overflow-auto rounded-md border border-border bg-card", className)}>
      <table className="w-full caption-bottom text-sm tabular-nums">
        {children}
      </table>
    </div>
  )
}

export function GridHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <thead className={cn("sticky top-0 z-20 bg-muted/80 backdrop-blur border-b border-border shadow-sm", className)}>
      <tr>{children}</tr>
    </thead>
  )
}

export function GridHead({ children, className, title }: { children: ReactNode; className?: string; title?: string }) {
  return (
    <th title={title} className={cn("h-10 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap bg-muted border-r border-border/50", className)}>
      {children}
    </th>
  )
}

export function GridBody({ children, className }: { children: ReactNode; className?: string }) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)}>{children}</tbody>
}

export function GridRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <tr className={cn("border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted", className)}>
      {children}
    </tr>
  )
}

export function GridCell({ children, className, title }: { children: ReactNode; className?: string; title?: string }) {
  return (
    <td title={title} className={cn("p-2 align-middle max-w-xs truncate overflow-hidden min-w-0 border-r border-border/50", className)}>
      {children}
    </td>
  )
}

export function GridRowNumberCell({ rowIdx, className }: { rowIdx: number; className?: string }) {
  return (
    <td className={cn("sticky left-0 z-10 bg-muted/80 backdrop-blur p-2 align-middle text-center text-xs text-muted-foreground font-mono border-r border-border shadow-[1px_0_0_0_var(--border)] w-12", className)}>
      {rowIdx}
    </td>
  )
}
