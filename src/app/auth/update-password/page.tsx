import Link from "next/link";
import { KeyRound, Trophy } from "lucide-react";
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
    <main className="app-bg flex min-h-screen items-center justify-center px-4 py-12 text-white">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <Trophy className="h-7 w-7 text-emerald-300" />
          <span className="text-2xl font-black tracking-tight">
            Cup Clash
          </span>
        </Link>

        <Card className="fixture-card text-white">
          <CardContent className="p-6 sm:p-8">
            <div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10">
                <KeyRound className="h-6 w-6 text-emerald-300" />
              </div>

              <h1 className="text-3xl font-black tracking-tight">
                Update password
              </h1>

              <p className="mt-2 text-sm text-slate-400">
                Choose a new password for your Cup Clash account.
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
                  minLength={6}
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
                  minLength={6}
                  className="h-12 border-white/10 bg-slate-950"
                />
              </div>

              <SubmitButton className="h-12 w-full" pendingText="Updating...">
                Update password
              </SubmitButton>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
