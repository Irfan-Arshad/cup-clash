import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  LogIn,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { signIn } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const error = params.error;

  return (
    <main className="app-bg min-h-screen text-white">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8">
        <div className="flex flex-col justify-center">
          <Link href="/" className="mb-10 flex w-fit items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10">
              <Trophy className="h-6 w-6 text-emerald-300" />
            </div>

            <div>
              <p className="text-xl font-black tracking-tight">Cup Clash</p>
              <p className="text-xs font-medium text-slate-500">
                Predict. Clash. Win.
              </p>
            </div>
          </Link>

          <div className="max-w-2xl">
            <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200">
              <LogIn className="h-4 w-4" />
              Welcome back
            </div>

            <h1 className="text-5xl font-black tracking-tight sm:text-6xl">
              Back to the <span className="text-gradient">leaderboard.</span>
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
              Log in to check your leagues, make predictions, view results, and
              see who is winning the group chat.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <Users className="h-6 w-6 text-emerald-300" />
                <p className="mt-4 font-bold">Private leagues</p>
                <p className="mt-1 text-sm text-slate-400">
                  Friends, family, workmates.
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <Target className="h-6 w-6 text-emerald-300" />
                <p className="mt-4 font-bold">Score picks</p>
                <p className="mt-1 text-sm text-slate-400">
                  Predict before kickoff.
                </p>
              </div>

              <div className="rounded-3xl border border-yellow-300/20 bg-yellow-300/10 p-5">
                <BarChart3 className="h-6 w-6 text-yellow-300" />
                <p className="mt-4 font-bold">Live table</p>
                <p className="mt-1 text-sm text-slate-400">
                  Watch points change.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center">
          <Card className="fixture-card text-white">
            <CardContent className="p-6 sm:p-8">
              <div>
                <h2 className="text-3xl font-black tracking-tight">
                  Log in
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  Continue your Cup Clash tournament.
                </p>
              </div>

              {error && (
                <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {decodeURIComponent(error)}
                </div>
              )}

              <form action={signIn} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    className="h-12 border-white/10 bg-slate-950"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="h-12 border-white/10 bg-slate-950"
                  />
                </div>

                <Button type="submit" className="h-12 w-full">
                  Log in
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>

              <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950/45 p-4">
                <p className="flex items-center gap-2 text-sm text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  Your leagues, predictions and points will be waiting.
                </p>
              </div>

              <p className="mt-6 text-center text-sm text-slate-300">
                New to Cup Clash?{" "}
                <Link
                  href="/auth/register"
                  className="font-semibold text-white underline underline-offset-4"
                >
                  Create an account
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}