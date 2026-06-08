import { Loader2, Trophy } from "lucide-react"

export default function Loading() {
  return (
    <main className="app-bg flex min-h-screen items-center justify-center px-4 text-white">
      <div className="flex flex-col items-center text-center">
        <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-emerald-400/20 bg-emerald-400/10 shadow-2xl shadow-emerald-950/40">
          <Trophy className="h-9 w-9 text-emerald-300" />
          <Loader2 className="absolute -right-2 -top-2 h-6 w-6 animate-spin text-yellow-300" />
        </div>

        <p className="mt-6 text-lg font-black tracking-tight text-white">
          Loading Cup Clash...
        </p>
        <p className="mt-2 text-sm font-medium text-slate-400">
          Getting the table ready.
        </p>
      </div>
    </main>
  )
}
