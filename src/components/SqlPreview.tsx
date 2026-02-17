"use client"

import React, { useState } from "react"
import { Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface SqlPreviewProps {
  statements: string[]
  className?: string
}

export function SqlPreview({ statements, className }: SqlPreviewProps) {
  const [copied, setCopied] = useState(false)
  const [visibleCount, setVisibleCount] = useState(100)

  const displayed = statements.slice(0, visibleCount)
  const hasMore = visibleCount < statements.length

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(statements.join("\n"))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement("textarea")
      textarea.value = statements.join("\n")
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (statements.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border bg-muted/30 p-8 text-muted-foreground">
        No SQL statements generated
      </div>
    )
  }

  return (
    <div className={cn("overflow-hidden rounded-lg border", className)}>
      <div className="flex items-center justify-between border-b bg-slate-900 px-4 py-2">
        <span className="text-xs font-medium text-slate-400">
          SQL Preview — {statements.length} statement{statements.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy All
            </>
          )}
        </button>
      </div>
      <div className="max-h-[480px] overflow-auto bg-slate-950 p-0">
        <table className="w-full border-collapse">
          <tbody>
            {displayed.map((stmt, idx) => (
              <tr key={idx} className="hover:bg-slate-900/80">
                <td className="select-none border-r border-slate-800 px-3 py-0.5 text-right text-xs text-slate-600 w-12">
                  {idx + 1}
                </td>
                <td className="px-3 py-0.5">
                  <code className="text-xs text-emerald-400 break-all whitespace-pre-wrap font-mono">
                    {stmt}
                  </code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {hasMore && (
          <div className="border-t border-slate-800 px-4 py-2 text-center">
            <button
              onClick={() => setVisibleCount((c) => c + 100)}
              className="text-xs font-medium text-primary hover:underline"
            >
              Show more ({statements.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
