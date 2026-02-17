"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div style={{ display: "flex", minHeight: "100vh", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Something went wrong</h2>
          <p style={{ color: "#666" }}>{error.message}</p>
          <button onClick={reset} style={{ padding: "0.5rem 1rem", borderRadius: "0.375rem", background: "#000", color: "#fff", border: "none", cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
