# ExcelHelpMe

A client-side web app for PostgreSQL workers to VLOOKUP Excel data across sheets and generate INSERT/UPDATE SQL statements with auto-ID generation.

**All processing happens in your browser — no data is sent to any server.**

## Features

### VLOOKUP
- Upload `.xlsx` / `.xls` files
- Match data between sheets using exact string comparison
- Support multiple return column → target column mappings
- Excel-like preview with green (match) / red (no match) color coding
- Export results as `.xlsx`

### SQL INSERT Generator
- Generate `INSERT INTO table VALUES (...)` from Excel data
- Auto-generate sequential IDs with configurable prefix, length, and starting number
- Duplicate primary key detection (blocks export)
- Optional: include column names, treat empty cells as NULL
- Export as `.sql` or `.xlsx`

### SQL UPDATE Generator
- Generate `UPDATE table SET col = 'val' WHERE pk = 'id'` from Excel data
- Select which columns to include in SET clause
- Primary key column defaults to Column A
- Duplicate primary key detection (blocks export)
- Export as `.sql` or `.xlsx`

## Tech Stack

- **Next.js 14** (App Router)
- **Tailwind CSS** + shadcn/ui
- **SheetJS** (xlsx) for Excel I/O
- **TypeScript**

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy

This app deploys to Vercel with zero configuration:

```bash
npx vercel
```

## PostgreSQL Focus

- All values quoted as TEXT by default
- Single quote escaping: `'` → `''`
- NULL byte stripping
- Identifier quoting for special characters
- Base on `standard_conforming_strings = on` (PG 9.1+)
