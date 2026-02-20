"use client"

import React, { ReactNode } from "react"
import { NuqsAdapter } from "nuqs/adapters/next/app"
import { ThemeProvider } from "next-themes"
import { I18nProvider } from "@/lib/i18n-context"
import { ExcelProvider } from "@/lib/excel-context"
import { WizardProvider } from "@/lib/wizard-context"
import { VlookupProvider } from "@/lib/vlookup-context"
import { SqlGeneratorProvider } from "@/lib/sql-context"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <NuqsAdapter>
        <I18nProvider>
          <ExcelProvider>
            <WizardProvider>
              <VlookupProvider>
                <SqlGeneratorProvider>
                  {children}
                </SqlGeneratorProvider>
              </VlookupProvider>
            </WizardProvider>
          </ExcelProvider>
        </I18nProvider>
      </NuqsAdapter>
    </ThemeProvider>
  )
}
