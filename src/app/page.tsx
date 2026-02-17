import { Search, Database, ArrowRight } from "lucide-react"

const features = [
  {
    title: "VLOOKUP",
    description:
      "Upload an Excel file and VLOOKUP between sheets. Preview results in an Excel-like table and export as .xlsx.",
    href: "/vlookup",
    icon: Search,
    gradient: "from-blue-500/10 to-cyan-500/10",
    border: "border-blue-200 dark:border-blue-900",
    iconColor: "text-blue-600",
  },
  {
    title: "SQL Generator",
    description:
      "Generate PostgreSQL INSERT and UPDATE statements from Excel data. Auto-generate IDs, validate primary keys, and export .sql files.",
    href: "/sql-generator",
    icon: Database,
    gradient: "from-emerald-500/10 to-teal-500/10",
    border: "border-emerald-200 dark:border-emerald-900",
    iconColor: "text-emerald-600",
  },
]

export default function HomePage() {
  return (
    <div className="flex flex-col items-center py-12">
      <div className="mb-3 inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
        Base on PostgreSQL
      </div>

      <h1 className="mb-4 text-center text-4xl font-bold tracking-tight sm:text-5xl">
        Excel → SQL, Simplified
      </h1>

      <p className="mb-12 max-w-xl text-center text-lg text-muted-foreground">
        VLOOKUP across sheets, generate INSERT &amp; UPDATE statements, and
        auto-generate primary key IDs — all in your browser.
      </p>

      <div className="grid w-full max-w-3xl gap-6 sm:grid-cols-2">
        {features.map((f) => (
          <a
            key={f.href}
            href={f.href}
            className={`group relative flex flex-col rounded-xl border bg-gradient-to-br ${f.gradient} ${f.border} p-6 transition-all hover:shadow-lg hover:-translate-y-0.5`}
          >
            <f.icon className={`mb-4 h-10 w-10 ${f.iconColor}`} />
            <h2 className="mb-2 text-xl font-semibold">{f.title}</h2>
            <p className="mb-4 flex-1 text-sm text-muted-foreground">
              {f.description}
            </p>
            <div className="inline-flex items-center gap-1 text-sm font-medium text-primary">
              Get started
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </a>
        ))}
      </div>

      <div className="mt-16 grid max-w-3xl gap-8 text-center sm:grid-cols-3">
        {[
          { stat: "100%", label: "Client-side" },
          { stat: "0", label: "Data sent to servers" },
          { stat: ".xlsx/.xls", label: "File support" },
        ].map((item) => (
          <div key={item.label}>
            <div className="text-2xl font-bold">{item.stat}</div>
            <div className="text-sm text-muted-foreground">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
