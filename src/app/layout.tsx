import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
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
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto flex h-14 max-w-6xl items-center px-6">
            <a href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                Ex
              </span>
              ExcelHelpMe
            </a>
            <nav className="ml-8 flex items-center gap-6 text-sm">
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
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </body>
    </html>
  )
}
