import Link from "next/link";
import { ArrowLeft, Mail, Trophy } from "lucide-react";
import { resetPassword } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;
  const error = params.error;
  const success = params.success;

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
                <Mail className="h-6 w-6 text-emerald-300" />
              </div>

              <h1 className="text-3xl font-black tracking-tight">
                Reset password
              </h1>

              <p className="mt-2 text-sm text-slate-400">
                Enter your email and we’ll send you a password reset link.
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

            <form action={resetPassword} className="mt-6 space-y-4">
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

              <Button type="submit" className="h-12 w-full">
                Send reset link
              </Button>
            </form>

            <Button asChild variant="ghost" className="mt-4 w-full text-slate-300 hover:bg-white/10 hover:text-white">
              <Link href="/auth/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to login
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}