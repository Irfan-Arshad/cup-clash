import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Crown,
  LogIn,
  Sparkles,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="app-bg min-h-screen text-white">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10">
            <Trophy className="h-5 w-5 text-emerald-300" />
          </div>
          <span className="text-lg tracking-tight">Cup Clash</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" className="text-slate-200">
            <Link href="/auth/login">
              <LogIn className="mr-2 h-4 w-4" />
              Log in
            </Link>
          </Button>

          <Button asChild className="hidden sm:inline-flex">
            <Link href="/auth/register">Get started</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:pb-24 lg:pt-16">
        <div className="flex flex-col justify-center">
          <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-200">
            <Sparkles className="h-4 w-4" />
            World Cup prediction leagues for every group chat
          </div>

          <h1 className="max-w-4xl text-5xl font-black tracking-tight sm:text-7xl lg:text-8xl">
            Predict.
            <span className="text-gradient block">Clash.</span>
            Win bragging rights.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
            Create a private league, invite your mates, predict every scoreline,
            and watch the leaderboard change as the tournament unfolds.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12">
              <Link href="/auth/register">
                Start a league
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>

            <Button asChild size="lg" variant="secondary" className="h-12">
              <Link href="/auth/login">Join a league</Link>
            </Button>

            <Button
              asChild
              size="lg"
              variant="ghost"
              className="h-12 text-slate-200"
            >
              <Link href="/auth/login">Log in</Link>
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-300">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              Private leagues
            </div>

            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              Score predictions
            </div>

            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              Live leaderboard
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 rounded-[2rem] bg-emerald-400/10 blur-3xl" />

          <Card className="glass-card relative overflow-hidden text-white">
            <CardContent className="p-6 sm:p-8">
              <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-300">
                      The Lads League
                    </p>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight">
                      Matchday leaderboard
                    </h2>
                  </div>

                  <Crown className="h-8 w-8 text-yellow-300" />
                </div>

                <div className="mt-6 space-y-3">
                  {[
                    {
                      rank: 1,
                      name: "Aristotle",
                      points: 28,
                      badge: "Philosopher",
                    },
                    {
                      rank: 2,
                      name: "Newton",
                      points: 24,
                      badge: "Follow the forces",
                    },
                    {
                      rank: 3,
                      name: "Edison",
                      points: 19,
                      badge: "Lightning round",
                    },
                  ].map((player) => (
                    <div
                      key={player.rank}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sm font-black text-slate-950">
                          {player.rank}
                        </div>

                        <div>
                          <p className="font-bold">{player.name}</p>
                          <p className="text-xs text-slate-400">
                            {player.badge}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xl font-black">{player.points}</p>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                          pts
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm text-slate-400">Next fixture</p>
                  <p className="mt-2 text-lg font-bold">England vs Brazil</p>
                  <p className="mt-1 text-sm text-slate-400">
                    Predict before kickoff
                  </p>
                </div>

                <div className="rounded-3xl border border-yellow-300/20 bg-yellow-300/10 p-5">
                  <p className="text-sm text-yellow-200">Bonus pick</p>
                  <p className="mt-2 text-lg font-bold">Tournament winner</p>
                  <p className="mt-1 text-sm text-yellow-100/70">
                    Worth 20 points
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="glass-card text-white transition duration-200 hover:-translate-y-0.5 hover:bg-white/10">
            <CardContent className="p-6">
              <Users className="mb-4 h-8 w-8 text-emerald-300" />
              <h2 className="text-lg font-bold tracking-tight">
                Create private leagues
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Run separate leagues for friends, family, work, clubs, or
                different group chats.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card text-white transition duration-200 hover:-translate-y-0.5 hover:bg-white/10">
            <CardContent className="p-6">
              <Target className="mb-4 h-8 w-8 text-emerald-300" />
              <h2 className="text-lg font-bold tracking-tight">
                Predict every score
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Lock in your scorelines before kickoff and earn more for exact
                predictions.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card text-white transition duration-200 hover:-translate-y-0.5 hover:bg-white/10">
            <CardContent className="p-6">
              <BarChart3 className="mb-4 h-8 w-8 text-emerald-300" />
              <h2 className="text-lg font-bold tracking-tight">
                Climb the leaderboard
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Scores, bonus picks, and exact results all feed into the league
                table.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}