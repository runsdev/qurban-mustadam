// ============================================================
// Skeleton Loading — displayed automatically by Next.js while
// the server component (page.tsx) fetches data from Google Sheets.
// ============================================================

function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-surface-container-low ${className}`} />;
}

export default function Loading() {
  return (
    <>
      {/* ── Top Navigation Bar (Skeleton) ── */}
      <header className="sticky top-0 z-50 w-full bg-[#fbf9f5]/70 shadow-[0_12px_32px_rgba(55,45,23,0.06)]">
        <nav className="flex justify-between items-center w-full px-6 py-4 max-w-screen-2xl mx-auto">
          <Pulse className="h-7 w-80" />
          <div className="flex items-center gap-4">
            <Pulse className="h-10 w-52 rounded-full hidden lg:block" />
            <Pulse className="h-10 w-10 rounded-full" />
          </div>
        </nav>
      </header>

      {/* ── Layout: Sidebar + Main ── */}
      <div className="flex flex-1 max-w-screen-2xl w-full mx-auto relative">
        {/* ── Sidebar Skeleton (Desktop Only) ── */}
        <aside className="hidden lg:flex flex-col h-[calc(100vh-80px)] w-72 py-8 gap-2 bg-surface-container-low sticky top-20">
          <div className="px-6 mb-6">
            <Pulse className="h-6 w-32 mb-2" />
            <Pulse className="h-3 w-24" />
          </div>
          <nav className="flex flex-col gap-2 px-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Pulse key={i} className="h-11 w-full rounded-xl" />
            ))}
          </nav>
        </aside>

        {/* ── Main Content Skeleton ── */}
        <main className="flex-1 p-6 md:p-10 lg:p-12 overflow-x-hidden">
          {/* Hero Skeleton */}
          <section className="mb-12">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="max-w-2xl space-y-4">
                <Pulse className="h-6 w-20 rounded-full" />
                <Pulse className="h-14 w-96" />
                <Pulse className="h-5 w-72" />
              </div>
              <Pulse className="h-12 w-72 rounded-2xl" />
            </div>
          </section>

          {/* Stats Bento Grid Skeleton */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className={`p-8 rounded-2xl ${
                  i === 1
                    ? "bg-primary-container/40"
                    : i === 2
                    ? "bg-secondary-container/40"
                    : "bg-surface-container-lowest"
                }`}
              >
                <Pulse className="h-10 w-20 mb-2" />
                <Pulse className="h-4 w-36 mb-6" />
                <Pulse className="h-2 w-full rounded-full" />
              </div>
            ))}
          </section>

          {/* Section Header Skeleton */}
          <div className="flex justify-between items-center mb-8">
            <Pulse className="h-8 w-48" />
            <Pulse className="h-8 w-36 rounded-xl" />
          </div>

          {/* Animal Cards Skeleton */}
          <div className="flex flex-col gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl p-6 bg-surface-container-lowest"
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-8">
                  {/* Icon + Identity */}
                  <div className="flex items-center gap-4 min-w-50">
                    <Pulse className="w-16 h-16 rounded-2xl" />
                    <div className="space-y-2">
                      <Pulse className="h-5 w-24" />
                      <Pulse className="h-3 w-16" />
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="flex-1 flex items-center gap-6">
                    <Pulse className="flex-1 h-3 rounded-full" />
                  </div>
                  {/* Badge + Button */}
                  <div className="flex items-center gap-3">
                    <Pulse className="h-7 w-28 rounded-full" />
                    <Pulse className="h-10 w-32 rounded-xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}
