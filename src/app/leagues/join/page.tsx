import { redirect } from "next/navigation";
import { KeyRound, Trophy, Users } from "lucide-react";
import { joinLeague } from "@/actions/leagues";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import { PageHero } from "@/components/layout/page-hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";

type JoinLeaguePageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function JoinLeaguePage({
  searchParams,
}: JoinLeaguePageProps) {
  const params = await searchParams;
  const error = params.error;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.is_admin === true;

  return (
    <AppShell isAdmin={isAdmin}>
      <PageHero
        eyebrow="Join League"
        title="Enter your invite code"
        description="Got a code from the group chat? Join the league and start chasing top spot."
      />

      {error && (
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {decodeURIComponent(error)}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_420px] lg:items-start">
        <Card className="pitch-card text-white">
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-center gap-2">
              <KeyRound className="h-6 w-6 text-emerald-300" />
              <h2 className="text-2xl font-black tracking-tight">
                How joining works
              </h2>
            </div>

            <p className="mt-4 text-slate-300">
              League creators get an invite code. Once you enter it, the league
              appears on your dashboard and you can make predictions straight
              away.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-5">
                <Users className="h-6 w-6 text-emerald-300" />
                <p className="mt-4 font-bold">Join the group</p>
                <p className="mt-1 text-sm text-slate-400">
                  Paste the code your mate shared.
                </p>
              </div>

              <div className="rounded-3xl border border-yellow-300/20 bg-yellow-300/10 p-5">
                <Trophy className="h-6 w-6 text-yellow-300" />
                <p className="mt-4 font-bold">Start competing</p>
                <p className="mt-1 text-sm text-slate-400">
                  Predict fixtures and chase the top.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="fixture-card text-white">
          <CardContent className="p-6 sm:p-8">
            <div>
              <h2 className="text-2xl font-black tracking-tight">
                Join league
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Invite codes are usually 8 characters long.
              </p>
            </div>

            <form action={joinLeague} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inviteCode">Invite code</Label>
                <Input
                  id="inviteCode"
                  name="inviteCode"
                  placeholder="EVRU29RS"
                  required
                  className="h-12 border-white/10 bg-slate-950 text-center font-mono text-lg uppercase tracking-[0.25em]"
                />
              </div>

              <SubmitButton className="h-12 w-full" pendingText="Joining...">
                Join league
              </SubmitButton>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}