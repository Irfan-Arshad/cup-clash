import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Crown,
  RefreshCw,
  Shield,
  Sparkles,
  Trophy,
} from "lucide-react";
import {
  recalculateAllFinishedFixtures,
  updateTournamentWinner,
} from "@/actions/admin";
import { FixtureResultForm } from "@/components/admin/fixture-result-form";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { PageHero } from "@/components/layout/page-hero";
import { TeamFlag, type TeamFlagData } from "@/components/team/team-flag";
import { AppBadge } from "@/components/ui/app-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatUkKickoff } from "@/lib/format-date";
import { getFixtureTeamName } from "@/lib/fixtures";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const dynamic = "force-dynamic";

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
      home_team_id,
      away_team_id,
      home_placeholder,
      away_placeholder,
      bracket_slot,
      next_match_number,
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

  const allFixtures = fixtures || [];
  type Fixture = (typeof allFixtures)[number];
  const now = new Date();

  const hasSubmittedScore = (fixture: Fixture) =>
    fixture.home_score !== null &&
    fixture.home_score !== undefined &&
    fixture.away_score !== null &&
    fixture.away_score !== undefined;

  const completedScoredFixtures = allFixtures
    .filter(
      (fixture) => fixture.status === "finished" && hasSubmittedScore(fixture)
    )
    .sort((a, b) => {
      if (a.match_number != null && b.match_number != null) {
        return b.match_number - a.match_number;
      }

      return (
        new Date(b.kickoff_at).getTime() - new Date(a.kickoff_at).getTime()
      );
    });

  const needsScoreFixtures = allFixtures.filter(
    (fixture) =>
      !hasSubmittedScore(fixture) &&
      (fixture.status === "finished" || new Date(fixture.kickoff_at) <= now)
  );

  const upcomingOrUnfinishedFixtures = allFixtures.filter(
    (fixture) =>
      !needsScoreFixtures.includes(fixture) &&
      !completedScoredFixtures.includes(fixture)
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

  let hasPendingResultsAnchor = false;

  const renderFixtureCard = (fixture: Fixture) => {
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

    const homeTeamName = getFixtureTeamName(
      homeTeam,
      fixture.home_placeholder
    );
    const awayTeamName = getFixtureTeamName(
      awayTeam,
      fixture.away_placeholder
    );
    const teamsTbc = !homeTeam || !awayTeam;

    const isFinished = fixture.status === "finished";
    const anchorIds: string[] = [];

    if (!hasSubmittedScore(fixture) && !hasPendingResultsAnchor) {
      anchorIds.push("pending-results");
      hasPendingResultsAnchor = true;
    }

    return (
      <Card
        key={fixture.id}
        className={
          isFinished
            ? "fixture-card relative scroll-mt-32 overflow-hidden text-white"
            : "glass-card relative scroll-mt-32 overflow-hidden text-white"
        }
      >
        {anchorIds.map((anchorId) => (
          <span
            key={anchorId}
            id={anchorId}
            className="absolute -top-28"
            aria-hidden="true"
          />
        ))}
        <CardContent className="p-0">
          <div className="border-b border-white/10 px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex flex-col justify-between gap-3 sm:gap-5 lg:flex-row lg:items-start">
              <div className="min-w-0 flex-1">
                <div className="mb-3 flex flex-wrap items-center gap-2 sm:mb-4">
                  {fixture.match_number && (
                    <AppBadge variant="muted">
                      Match {fixture.match_number}
                    </AppBadge>
                  )}

                  {fixture.group_name && (
                    <AppBadge variant="slate">{fixture.group_name}</AppBadge>
                  )}

                  {fixture.round_name && (
                    <AppBadge variant="muted">{fixture.round_name}</AppBadge>
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

                  {teamsTbc && (
                    <AppBadge variant="muted">Teams TBC</AppBadge>
                  )}
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-5">
                  <div className="flex min-w-0 items-center gap-2 sm:gap-4">
                    <TeamFlag team={homeTeam} size="sm" />

                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
                        {homeTeam?.short_name || "TBC"}
                      </p>
                      <h3 className="mt-1 truncate text-base font-black tracking-tight sm:text-xl">
                        {homeTeamName}
                      </h3>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <div className="rounded-full border border-white/10 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-950 sm:py-1.5 sm:text-xs sm:tracking-[0.24em]">
                      vs
                    </div>
                  </div>

                  <div className="flex min-w-0 items-center justify-end gap-2 text-right sm:gap-4">
                    <div className="order-2">
                      <TeamFlag team={awayTeam} size="sm" />
                    </div>

                    <div className="order-1 min-w-0">
                      <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
                        {awayTeam?.short_name || "TBC"}
                      </p>
                      <h3 className="mt-1 truncate text-base font-black tracking-tight sm:text-xl">
                        {awayTeamName}
                      </h3>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400 sm:mt-5 sm:gap-3 sm:text-sm">
                  <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-slate-200">
                    <CalendarDays className="h-4 w-4" />
                    {formatUkKickoff(fixture.kickoff_at)}
                  </span>

                  {fixture.venue && (
                    <span className="flex items-center gap-1.5">
                      <Trophy className="h-4 w-4" />
                      {fixture.venue}
                    </span>
                  )}
                </div>

                {teamsTbc && (
                  <p className="mt-3 text-sm text-slate-400">
                    Predictions open when both teams are confirmed.
                  </p>
                )}
              </div>

              {isFinished && (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-center sm:rounded-3xl sm:px-5 sm:py-4 lg:min-w-36">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300 sm:text-xs sm:tracking-[0.2em]">
                    Result
                  </p>
                  <p className="mt-1 text-2xl font-black sm:mt-2 sm:text-3xl">
                    {fixture.home_score} - {fixture.away_score}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="px-4 py-4 sm:px-6 sm:py-5">
            <FixtureResultForm
              fixtureId={fixture.id}
              homeShortName={homeTeam?.short_name || homeTeamName}
              awayShortName={awayTeam?.short_name || awayTeamName}
              initialHomeScore={fixture.home_score}
              initialAwayScore={fixture.away_score}
              initialStatus={fixture.status}
            />
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <AppShell isAdmin>
      <div className="sm:hidden">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-white">
          <h1 className="text-2xl font-black tracking-tight">Admin</h1>
          <p className="mt-2 text-sm text-slate-300">
            Manage scores and winners.
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-2 py-2">
              <p className="text-lg font-black">{finishedCount}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-slate-400">
                Finished
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-2 py-2">
              <p className="text-lg font-black">{pendingCount}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-slate-400">
                Pending
              </p>
            </div>

            <div className="rounded-2xl border border-yellow-300/20 bg-yellow-300/10 px-2 py-2">
              <p className="text-lg font-black">{scoredCount}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-slate-300">
                Scored
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden sm:block">
        <PageHero
          eyebrow="Admin"
          title="Manage results"
          description="Update fixture scores, recalculate prediction points, and set the tournament winner bonus."
          actions={
            <div className="flex flex-col gap-3 sm:flex-row">
              <form action={recalculateAllFinishedFixtures}>
                <SubmitButton
                  variant="secondary"
                  pendingText="Recalculating..."
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Recalculate all
                </SubmitButton>
              </form>

              <Button asChild>
                <Link href="/dashboard">Back to dashboard</Link>
              </Button>

              <Button asChild variant="secondary">
                <Link href="/admin/leagues">
                  <Shield className="mr-2 h-4 w-4" />
                  Manage leagues
                </Link>
              </Button>
            </div>
          }
        />
      </div>

      <div className="sticky top-[73px] z-20 mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-slate-950/80 p-2 backdrop-blur sm:static sm:flex sm:flex-wrap sm:border-0 sm:bg-transparent sm:p-0">
        <Button asChild variant="secondary" className="h-9 px-2 text-xs sm:h-10 sm:px-3 sm:text-sm">
          <a href="#fixture-results">Fixtures</a>
        </Button>

        <Button asChild variant="secondary" className="h-9 px-2 text-xs sm:h-10 sm:px-3 sm:text-sm">
          <Link href="/admin/leagues">Leagues</Link>
        </Button>

        <Button asChild className="h-9 px-2 text-xs sm:h-10 sm:px-3 sm:text-sm">
          <a href="#fixture-results">Results</a>
        </Button>
      </div>

      <form action={recalculateAllFinishedFixtures} className="mt-3 sm:hidden">
        <SubmitButton
          variant="secondary"
          className="h-10 w-full"
          pendingText="Recalculating..."
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Recalculate all finished fixtures
        </SubmitButton>
      </form>

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

      <div className="mt-6 hidden gap-4 sm:grid md:grid-cols-3">
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

      <Card className="mt-4 pitch-card text-white sm:mt-6">
        <CardContent className="p-4 sm:p-8">
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_420px] lg:items-end">
            <div>
              <div className="flex items-center gap-2">
                <Crown className="h-6 w-6 text-yellow-300" />
                <h2 className="text-xl font-black tracking-tight sm:text-2xl">
                  Tournament winner
                </h2>
              </div>

              <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:mt-3 sm:text-base">
                Select the final World Cup winner. Users who picked this team
                receive 20 bonus points.
              </p>

              <div className="mt-4 rounded-2xl border border-yellow-300/20 bg-yellow-300/10 px-4 py-3 sm:mt-5 sm:rounded-3xl sm:px-5 sm:py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-yellow-200 sm:text-sm sm:tracking-[0.2em]">
                  Current winner
                </p>

                <p className="mt-2 text-xl font-black sm:text-2xl">
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

              <SubmitButton className="h-12 w-full" pendingText="Saving winner...">
                Save winner
              </SubmitButton>
            </form>
          </div>
        </CardContent>
      </Card>

      <div id="fixture-results" className="mt-6 scroll-mt-28 sm:mt-8">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-emerald-300" />
              <h2 className="text-xl font-black tracking-tight sm:text-2xl">
                Fixture results
              </h2>
            </div>

            <p className="mt-2 hidden text-sm text-slate-400 sm:block">
              Enter full-time scores. Points will be recalculated for that
              fixture automatically.
            </p>
          </div>

          <AppBadge variant="emerald" className="px-3 py-1.5">
            <Sparkles className="mr-1 h-3 w-3" />
            Admin only
          </AppBadge>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-slate-950/50 p-2 text-center text-xs text-slate-300 sm:hidden">
          <a href="#fixture-results" className="rounded-xl bg-white/10 px-2 py-2 font-semibold">
            All
          </a>
          <a href="#pending-results" className="rounded-xl bg-white/5 px-2 py-2 font-semibold">
            Pending
          </a>
          <a href="#finished-results" className="rounded-xl bg-white/5 px-2 py-2 font-semibold">
            Finished
          </a>
        </div>

        <div className="mt-4 space-y-3 sm:mt-5 sm:space-y-4">
          {needsScoreFixtures.length > 0 && (
            <section className="space-y-3 sm:space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-yellow-200">
                Needs score
              </h3>
              {needsScoreFixtures.map((fixture) => renderFixtureCard(fixture))}
            </section>
          )}

          {upcomingOrUnfinishedFixtures.length > 0 && (
            <section className="space-y-3 sm:space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-300">
                Upcoming / unfinished
              </h3>
              {upcomingOrUnfinishedFixtures.map((fixture) =>
                renderFixtureCard(fixture)
              )}
            </section>
          )}

          {completedScoredFixtures.length > 0 && (
            <details id="finished-results" className="group scroll-mt-32">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white backdrop-blur sm:px-6 sm:py-4">
                <span className="font-bold">
                  Completed scored fixtures ({completedScoredFixtures.length})
                </span>
                <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" />
              </summary>

              <div className="mt-3 space-y-3 sm:mt-4 sm:space-y-4">
                {completedScoredFixtures.map((fixture) =>
                  renderFixtureCard(fixture)
                )}
              </div>
            </details>
          )}

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
