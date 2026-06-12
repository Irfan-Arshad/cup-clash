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
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const error = params.error;
  const success = params.success;

  return (
    <main className="app-bg min-h-screen text-white">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl gap-5 px-4 py-5 sm:gap-10 sm:px-6 sm:py-10 lg:grid-cols-[1fr_420px] lg:px-8">
        <div className="flex flex-col justify-start sm:justify-center">
          <Link href="/" className="mb-5 flex w-fit items-center gap-3 sm:mb-10">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 sm:h-12 sm:w-12">
              <Trophy className="h-5 w-5 text-emerald-300 sm:h-6 sm:w-6" />
            </div>

            <div>
              <p className="text-xl font-black tracking-tight">Cup Clash</p>
              <p className="text-xs font-medium text-slate-500">
                Predict. Clash. Win.
              </p>
            </div>
          </Link>

          <div className="max-w-2xl">
            <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 sm:mb-6 sm:px-4 sm:py-2 sm:text-sm">
              <LogIn className="h-4 w-4" />
              Welcome back
            </div>

            <h1 className="text-3xl font-black tracking-tight sm:text-6xl">
              Back to the <span className="text-gradient">leaderboard.</span>
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:mt-5 sm:text-lg sm:leading-8">
              Log in to check your leagues, make predictions, view results, and
              see who is winning the group chat.
            </p>

            <div className="mt-8 hidden gap-3 sm:grid sm:grid-cols-3">
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

        <div className="flex flex-col justify-start sm:justify-center">
          <Card className="fixture-card text-white">
            <CardContent className="p-4 sm:p-8">
              <div>
                <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
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

              {success && (
                <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  {decodeURIComponent(success)}
                </div>
              )}

              <form action={signIn} className="mt-5 space-y-4 sm:mt-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="username"
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
                    autoComplete="current-password"
                    required
                    className="h-12 border-white/10 bg-slate-950"
                  />
                </div>

                <div className="text-right">
                  <Link
                    href="/auth/reset-password"
                    className="text-sm font-semibold text-slate-300 underline underline-offset-4 hover:text-white"
                  >
                    Forgot password?
                  </Link>
                </div>

                <SubmitButton className="h-12 w-full" pendingText="Logging in...">
                  Log in
                  <ArrowRight className="ml-2 h-4 w-4" />
                </SubmitButton>
              </form>

              <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/45 p-3 sm:mt-6 sm:rounded-3xl sm:p-4">
                <p className="flex items-center gap-2 text-sm text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  Your leagues, predictions and points will be waiting.
                </p>
              </div>

              <p className="mt-5 text-center text-sm text-slate-300 sm:mt-6">
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
