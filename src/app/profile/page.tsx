import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Crown,
  Mail,
  Shield,
  Target,
  Trophy,
  User,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import { PageHero } from "@/components/layout/page-hero";
import { AppBadge } from "@/components/ui/app-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { updateDisplayName } from "@/actions/profile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProfilePageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const params = await searchParams;
  const error = params.error;
  const success = params.success;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, email, is_admin, created_at")
    .eq("id", user.id)
    .single();

  const { data: memberships } = await supabase
    .from("league_members")
    .select(
      `
      id,
      role,
      league_id,
      leagues (
        id,
        name,
        invite_code
      )
    `
    )
    .eq("user_id", user.id);

  const { data: predictions } = await supabase
    .from("predictions")
    .select("id, points")
    .eq("user_id", user.id);

  const { data: tournamentPicks } = await supabase
    .from("tournament_picks")
    .select("id, points")
    .eq("user_id", user.id);

  const fixturePoints =
    predictions?.reduce((sum, prediction) => sum + (prediction.points || 0), 0) ||
    0;

  const tournamentPoints =
    tournamentPicks?.reduce((sum, pick) => sum + (pick.points || 0), 0) || 0;

  const totalPoints = fixturePoints + tournamentPoints;

  const isAdmin = profile?.is_admin === true;

  return (
    <AppShell isAdmin={isAdmin}>
      <PageHero
        eyebrow="Profile"
        title={profile?.display_name || "Your profile"}
        description="View your Cup Clash account, league memberships, and prediction stats."
        actions={
          <Button asChild variant="secondary">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to dashboard
            </Link>
          </Button>
        }
      />

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

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <StatCard
          title="Total points"
          value={totalPoints}
          description="Across all leagues"
          icon={<Trophy className="h-5 w-5" />}
        />

        <StatCard
          title="Fixture points"
          value={fixturePoints}
          description="From predictions"
          icon={<Target className="h-5 w-5" />}
        />

        <StatCard
          title="Winner bonus"
          value={tournamentPoints}
          description="Tournament picks"
          icon={<Crown className="h-5 w-5" />}
        />

        <StatCard
          title="Leagues"
          value={memberships?.length || 0}
          description="Joined leagues"
          icon={<Users className="h-5 w-5" />}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[420px_1fr] lg:items-start">
        <Card className="fixture-card text-white">
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10">
                <User className="h-7 w-7 text-emerald-300" />
              </div>

              <div>
                <h2 className="text-2xl font-black tracking-tight">
                  Account details
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Your Cup Clash identity.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-5">
                <form action={updateDisplayName} className="space-y-3">
                    <div className="space-y-2">
                    <Label
                        htmlFor="displayName"
                        className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500"
                    >
                        Display name
                    </Label>

                    <Input
                        id="displayName"
                        name="displayName"
                        defaultValue={profile?.display_name || ""}
                        maxLength={40}
                        required
                        className="h-12 border-white/10 bg-slate-950 text-base font-bold"
                    />
                    </div>

                    <Button type="submit" className="h-11 w-full">
                    Update display name
                    </Button>
                </form>
                </div>

              <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-5">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                  <Mail className="h-4 w-4" />
                  Email
                </p>
                <p className="mt-2 break-all text-sm font-semibold text-slate-200">
                  {profile?.email || user.email || "Unknown"}
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-5">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                  <Shield className="h-4 w-4" />
                  Role
                </p>

                <div className="mt-3">
                  {isAdmin ? (
                    <AppBadge variant="emerald">
                      <Shield className="mr-1 h-3 w-3" />
                      Admin
                    </AppBadge>
                  ) : (
                    <AppBadge variant="muted">Player</AppBadge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card text-white">
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-emerald-300" />
              <h2 className="text-2xl font-black tracking-tight">
                Your leagues
              </h2>
            </div>

            {!memberships || memberships.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950/45 p-6">
                <p className="font-bold">You have not joined a league yet.</p>
                <p className="mt-2 text-sm text-slate-400">
                  Create a league or join one with an invite code.
                </p>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <Button asChild>
                    <Link href="/leagues/new">Create league</Link>
                  </Button>

                  <Button asChild variant="secondary">
                    <Link href="/leagues/join">Join league</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {memberships.map((membership) => {
                  const league = Array.isArray(membership.leagues)
                    ? membership.leagues[0]
                    : membership.leagues;

                  return (
                    <Link
                      key={membership.id}
                      href={`/leagues/${membership.league_id}`}
                      className="block rounded-3xl border border-white/10 bg-slate-950/45 px-5 py-4 transition hover:-translate-y-0.5 hover:bg-white/10"
                    >
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div>
                          <p className="text-lg font-black">
                            {league?.name || "League"}
                          </p>

                          <p className="mt-1 font-mono text-sm uppercase tracking-[0.18em] text-slate-500">
                            {league?.invite_code}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <AppBadge
                            variant={
                              membership.role === "owner" ? "gold" : "muted"
                            }
                            className="capitalize"
                          >
                            {membership.role}
                          </AppBadge>

                          <AppBadge variant="emerald">Open</AppBadge>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}