import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  Crown,
  RefreshCw,
  Shield,
  Sparkles,
  Trophy,
} from "lucide-react";
import {
  recalculateAllFinishedFixtures,
  updateFixtureResult,
  updateTournamentWinner,
} from "@/actions/admin";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { PageHero } from "@/components/layout/page-hero";
import { TeamFlag, type TeamFlagData } from "@/components/team/team-flag";
import { AppBadge } from "@/components/ui/app-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AdminPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

type Team = TeamFlagData & {
  id?: number;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams;
  const error = params.error;
  const success = params.success;

  const admin = await requireAdmin();

  if (!admin) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const { data: fixtures } = await supabase
    .from("fixtures")
    .select(
      `
      id,
      kickoff_at,
      stage,
      status,
      match_number,
      venue,
      group_name,
      round_name,
      home_score,
      away_score,
      home_team:teams!fixtures_home_team_id_fkey (
        name,
        short_name,
        flag_emoji,
        flag_url
      ),
      away_team:teams!fixtures_away_team_id_fkey (
        name,
        short_name,
        flag_emoji,
        flag_url
      )
    `
    )
    .order("kickoff_at", { ascending: true });

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, short_name")
    .order("name", { ascending: true });

  const { data: tournamentResult } = await supabase
    .from("tournament_results")
    .select("winner_team_id")
    .limit(1)
    .maybeSingle();

  const selectedWinner = teams?.find(
    (team) => team.id === tournamentResult?.winner_team_id
  );

  const finishedCount =
    fixtures?.filter((fixture) => fixture.status === "finished").length || 0;

  const pendingCount =
    fixtures?.filter((fixture) => fixture.status !== "finished").length || 0;

  const scoredCount =
    fixtures?.filter(
      (fixture) =>
        fixture.home_score !== null &&
        fixture.home_score !== undefined &&
        fixture.away_score !== null &&
        fixture.away_score !== undefined
    ).length || 0;

  return (
    <AppShell isAdmin>
      <PageHero
        eyebrow="Admin"
        title="Manage results"
        description="Update fixture scores, recalculate prediction points, and set the tournament winner bonus."
        actions={
          <div className="flex flex-col gap-3 sm:flex-row">
            <form action={recalculateAllFinishedFixtures}>
              <Button type="submit" variant="secondary">
                <RefreshCw className="mr-2 h-4 w-4" />
                Recalculate all
              </Button>
            </form>

            <Button asChild>
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </div>
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

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card className="pitch-card text-white">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-slate-300">
              Finished fixtures
            </p>
            <p className="mt-3 text-3xl font-black tracking-tight">
              {finishedCount}
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card text-white">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-slate-300">
              Pending results
            </p>
            <p className="mt-3 text-3xl font-black tracking-tight">
              {pendingCount}
            </p>
          </CardContent>
        </Card>

        <Card className="gold-card text-white">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-slate-300">
              Scores entered
            </p>
            <p className="mt-3 text-3xl font-black tracking-tight">
              {scoredCount}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 pitch-card text-white">
        <CardContent className="p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_420px] lg:items-end">
            <div>
              <div className="flex items-center gap-2">
                <Crown className="h-6 w-6 text-yellow-300" />
                <h2 className="text-2xl font-black tracking-tight">
                  Tournament winner
                </h2>
              </div>

              <p className="mt-3 max-w-2xl text-slate-300">
                Select the final World Cup winner. Users who picked this team
                receive 20 bonus points.
              </p>

              <div className="mt-5 rounded-3xl border border-yellow-300/20 bg-yellow-300/10 px-5 py-4">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-yellow-200">
                  Current winner
                </p>

                <p className="mt-2 text-2xl font-black">
                  {selectedWinner
                    ? `${selectedWinner.name} (${selectedWinner.short_name})`
                    : "Not selected yet"}
                </p>
              </div>
            </div>

            <form action={updateTournamentWinner} className="space-y-3">
              <Select
                name="winnerTeamId"
                defaultValue={String(tournamentResult?.winner_team_id || "")}
              >
                <SelectTrigger className="h-12 border-white/10 bg-slate-950">
                  <SelectValue placeholder="Choose tournament winner" />
                </SelectTrigger>

                <SelectContent>
                  {teams?.map((team) => (
                    <SelectItem key={team.id} value={String(team.id)}>
                      {team.name} ({team.short_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button type="submit" className="h-12 w-full">
                Save winner
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-emerald-300" />
              <h2 className="text-2xl font-black tracking-tight">
                Fixture results
              </h2>
            </div>

            <p className="mt-2 text-sm text-slate-400">
              Enter full-time scores. Points will be recalculated for that
              fixture automatically.
            </p>
          </div>

          <AppBadge variant="emerald" className="px-3 py-1.5">
            <Sparkles className="mr-1 h-3 w-3" />
            Admin only
          </AppBadge>
        </div>

        <div className="mt-5 space-y-4">
          {fixtures?.map((fixture) => {
            const homeTeam = (
              Array.isArray(fixture.home_team)
                ? fixture.home_team[0]
                : fixture.home_team
            ) as Team | null;

            const awayTeam = (
              Array.isArray(fixture.away_team)
                ? fixture.away_team[0]
                : fixture.away_team
            ) as Team | null;

            const isFinished = fixture.status === "finished";

            return (
              <Card
                key={fixture.id}
                className={
                  isFinished
                    ? "fixture-card overflow-hidden text-white"
                    : "glass-card overflow-hidden text-white"
                }
              >
                <CardContent className="p-0">
                  <div className="border-b border-white/10 px-5 py-4 sm:px-6">
                    <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                      <div className="min-w-0 flex-1">
                        <div className="mb-4 flex flex-wrap items-center gap-2">
                          {fixture.match_number && (
                            <AppBadge variant="muted">
                              Match {fixture.match_number}
                            </AppBadge>
                          )}

                          {fixture.group_name && (
                            <AppBadge variant="slate">
                              {fixture.group_name}
                            </AppBadge>
                          )}

                          {fixture.round_name && (
                            <AppBadge variant="muted">
                              {fixture.round_name}
                            </AppBadge>
                          )}

                          <AppBadge variant={isFinished ? "emerald" : "gold"}>
                            {isFinished ? (
                              <>
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                Finished
                              </>
                            ) : (
                              "Needs result"
                            )}
                          </AppBadge>
                        </div>

                        <div className="grid gap-5 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                          <div className="flex items-center gap-4">
                            <TeamFlag team={homeTeam} size="sm" />

                            <div>
                              <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
                                {homeTeam?.short_name}
                              </p>
                              <h3 className="mt-1 text-xl font-black tracking-tight">
                                {homeTeam?.name}
                              </h3>
                            </div>
                          </div>

                          <div className="flex justify-start sm:justify-center">
                            <div className="rounded-full border border-white/10 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-[0.24em] text-slate-950">
                              vs
                            </div>
                          </div>

                          <div className="flex items-center gap-4 sm:justify-end sm:text-right">
                            <div className="sm:order-2">
                              <TeamFlag team={awayTeam} size="sm" />
                            </div>

                            <div className="sm:order-1">
                              <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
                                {awayTeam?.short_name}
                              </p>
                              <h3 className="mt-1 text-xl font-black tracking-tight">
                                {awayTeam?.name}
                              </h3>
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <CalendarDays className="h-4 w-4" />
                            {new Date(fixture.kickoff_at).toLocaleString(
                              "en-GB",
                              {
                                dateStyle: "medium",
                                timeStyle: "short",
                              }
                            )}
                          </span>

                          {fixture.venue && (
                            <span className="flex items-center gap-1.5">
                              <Trophy className="h-4 w-4" />
                              {fixture.venue}
                            </span>
                          )}
                        </div>
                      </div>

                      {isFinished && (
                        <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-4 text-center lg:min-w-36">
                          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
                            Result
                          </p>
                          <p className="mt-2 text-3xl font-black">
                            {fixture.home_score} - {fixture.away_score}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="px-5 py-5 sm:px-6">
                    <form
                      action={updateFixtureResult}
                      className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
                    >
                      <input
                        type="hidden"
                        name="fixtureId"
                        value={fixture.id}
                      />

                      <div>
                        <p className="text-sm font-semibold text-slate-300">
                          {isFinished ? "Update score" : "Enter score"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Saving will recalculate points for this fixture.
                        </p>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-300">
                            {homeTeam?.short_name}
                          </label>

                          <Input
                            name="homeScore"
                            type="number"
                            min="0"
                            defaultValue={fixture.home_score ?? ""}
                            className="h-12 w-full border-white/10 bg-slate-950 text-center text-lg font-black sm:w-24"
                            required
                          />
                        </div>

                        <div className="hidden pb-3 text-lg font-black text-slate-500 sm:block">
                          -
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-300">
                            {awayTeam?.short_name}
                          </label>

                          <Input
                            name="awayScore"
                            type="number"
                            min="0"
                            defaultValue={fixture.away_score ?? ""}
                            className="h-12 w-full border-white/10 bg-slate-950 text-center text-lg font-black sm:w-24"
                            required
                          />
                        </div>

                        <Button type="submit" className="h-12">
                          {isFinished ? "Update result" : "Save result"}
                        </Button>
                      </div>
                    </form>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {(!fixtures || fixtures.length === 0) && (
            <Card className="glass-card text-white">
              <CardContent className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <Trophy className="mb-4 h-12 w-12 text-slate-500" />
                <h2 className="text-2xl font-black tracking-tight">
                  No fixtures yet
                </h2>
                <p className="mt-2 max-w-md text-slate-400">
                  Fixtures will appear here once they have been added.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}