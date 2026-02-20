import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Providers } from "@/components/Providers"
import { ThemeToggle } from "@/components/ThemeToggle"
import "./globals.css"

export const metadata: Metadata = {
  title: "ExcelHelpMe — VLOOKUP & SQL Generator for PostgreSQL",
  description:
    "Upload Excel files to VLOOKUP across sheets and generate PostgreSQL INSERT/UPDATE statements with auto-ID generation.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>
          <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 w-full items-center px-6">
              <a href="/" className="flex items-center gap-2 font-semibold tracking-tight">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-sm bg-primary text-xs font-bold text-primary-foreground">
                  Ex
                </span>
                ExcelHelpMe
              </a>
              <nav className="ml-8 flex flex-1 items-center justify-between">
                <div className="flex items-center gap-6 text-sm font-medium">
                  <a
                    href="/vlookup"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    VLOOKUP
                  </a>
                  <a
                    href="/sql-generator"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    SQL Generator
                  </a>
                </div>
                <ThemeToggle />
              </nav>
            </div>
          </header>
          <main className="w-full flex-1">{children}</main>
        </Providers>
      </body>
    </html>
  )
}
