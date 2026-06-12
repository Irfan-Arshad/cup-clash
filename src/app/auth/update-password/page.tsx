import Link from "next/link";
import { LockKeyhole, Trophy } from "lucide-react";
import { updatePassword } from "@/actions/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";

type UpdatePasswordPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function UpdatePasswordPage({
  searchParams,
}: UpdatePasswordPageProps) {
  const params = await searchParams;
  const error = params.error;

  return (
    <main className="app-bg min-h-screen text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10 sm:px-6">
        <Link href="/" className="mb-8 flex w-fit items-center gap-3">
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

        <Card className="fixture-card text-white">
          <CardContent className="p-6 sm:p-8">
            <div>
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10">
                <LockKeyhole className="h-6 w-6 text-emerald-300" />
              </div>

              <h1 className="text-3xl font-black tracking-tight">
                Set new password
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Enter and confirm your new Cup Clash password.
              </p>
            </div>

            {error && (
              <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {decodeURIComponent(error)}
              </div>
            )}

            <form action={updatePassword} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="h-12 border-white/10 bg-slate-950"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="h-12 border-white/10 bg-slate-950"
                />
              </div>

              <SubmitButton className="h-12 w-full" pendingText="Updating...">
                Update password
              </SubmitButton>
            </form>

            <p className="mt-6 text-center text-sm text-slate-300">
              Remembered it?{" "}
              <Link
                href="/auth/login"
                className="font-semibold text-white underline underline-offset-4"
              >
                Log in
              </Link>
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}