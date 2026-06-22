import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  Lock,
  MapPin,
  Sparkles,
  Target,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PredictionForm } from "@/components/fixtures/prediction-form";
import { AppShell } from "@/components/layout/app-shell";
import { PageHero } from "@/components/layout/page-hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppBadge } from "@/components/ui/app-badge";
import { TeamFlag, type TeamFlagData } from "@/components/team/team-flag";
import { formatUkKickoff } from "@/lib/format-date";
import {
  areFixtureTeamsConfirmed,
  getFixtureTeamName,
} from "@/lib/fixtures";

export const dynamic = "force-dynamic";

type FixturesPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
    stage?: string;
  }>;
};

type Team = TeamFlagData;

const knockoutRoundOrder = [
  "Round of 32",
  "Round of 16",
  "Quarter-finals",
  "Semi-finals",
  "Third place",
  "Final",
] as const;

type StageFilter = "all" | "groups" | "knockouts";

type FixtureStageFields = {
  stage?: string | null;
  round_name?: string | null;
};

function isKnockoutFixture(fixture: FixtureStageFields) {
  const stage = fixture.stage?.toLowerCase();
  const isKnockoutStage = stage === "knockout" || stage === "knockouts";
  const isKnockoutRound = knockoutRoundOrder.some(
    (roundName) => roundName === fixture.round_name
  );

  return isKnockoutStage || isKnockoutRound;
}

function getKnockoutRoundName(roundName: string | null) {
  const normalized = roundName
    ?.toLowerCase()
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const aliases: Record<string, (typeof knockoutRoundOrder)[number]> = {
    "round of 32": "Round of 32",
    "round of 16": "Round of 16",
    "quarter final": "Quarter-finals",
    "quarter finals": "Quarter-finals",
    quarterfinal: "Quarter-finals",
    quarterfinals: "Quarter-finals",
    "semi final": "Semi-finals",
    "semi finals": "Semi-finals",
    semifinal: "Semi-finals",
    semifinals: "Semi-finals",
    "third place": "Third place",
    "third place play off": "Third place",
    "third place playoff": "Third place",
    final: "Final",
  };

  return (normalized && aliases[normalized]) || roundName || "Knockouts";
}

function FixtureStatusBadge({
  isFinished,
  isLocked,
  hasPrediction,
}: {
  isFinished: boolean;
  isLocked: boolean;
  hasPrediction: boolean;
}) {
  if (isFinished) {
    return (
      <AppBadge variant="emerald">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Result in
      </AppBadge>
    );
  }

  if (isLocked) {
    return (
      <AppBadge variant="red">
        <Lock className="mr-1 h-3 w-3" />
        Locked
      </AppBadge>
    );
  }

  if (hasPrediction) {
    return (
      <AppBadge variant="blue">
        <Target className="mr-1 h-3 w-3" />
        Predicted
      </AppBadge>
    );
  }

  return (
    <AppBadge variant="gold">
      <Sparkles className="mr-1 h-3 w-3" />
      Needs pick
    </AppBadge>
  );
}

export default async function FixturesPage({
  searchParams,
}: FixturesPageProps) {
  const params = await searchParams;
  const error = params.error;
  const success = params.success;
  const stageFilter: StageFilter =
    params.stage === "groups" || params.stage === "knockouts"
      ? params.stage
      : "all";

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

  const { data: fixtures } = await supabase
    .from("fixtures")
    .select(
      `
      id,
      kickoff_at,
      stage,
      match_number,
      venue,
      group_name,
      round_name,
      status,
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

  const fixtureIds = fixtures?.map((fixture) => fixture.id) || [];

  const { data: predictions } =
    fixtureIds.length > 0
      ? await supabase
          .from("predictions")
          .select(
            "fixture_id, predicted_home_score, predicted_away_score, points"
          )
          .eq("user_id", user.id)
          .in("fixture_id", fixtureIds)
      : { data: [] };

  const predictionMap = new Map(
    predictions?.map((prediction) => [prediction.fixture_id, prediction]) || []
  );

  const allFixtures = fixtures || [];
  type Fixture = (typeof allFixtures)[number];

  const matchesStageFilter = (fixture: Fixture) => {
    if (stageFilter === "groups") return !isKnockoutFixture(fixture);
    if (stageFilter === "knockouts") return isKnockoutFixture(fixture);
    return true;
  };

  const compareKickoffAscending = (a: Fixture, b: Fixture) =>
    new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime();

  const compareKnockoutFixtures = (a: Fixture, b: Fixture) => {
    if (a.match_number != null && b.match_number != null) {
      return a.match_number - b.match_number;
    }

    return compareKickoffAscending(a, b);
  };

  const groupKnockoutFixtures = (
    fixturesToGroup: Fixture[],
    compareFixtures = compareKnockoutFixtures
  ) => {
    const groups = new Map<string, Fixture[]>();

    fixturesToGroup.forEach((fixture) => {
      const roundName = getKnockoutRoundName(fixture.round_name);
      groups.set(roundName, [...(groups.get(roundName) || []), fixture]);
    });

    return Array.from(groups.entries())
      .map(([roundName, roundFixtures]) => ({
        roundName,
        fixtures: roundFixtures.sort(compareFixtures),
      }))
      .sort((a, b) => {
        const aIndex = knockoutRoundOrder.indexOf(
          a.roundName as (typeof knockoutRoundOrder)[number]
        );
        const bIndex = knockoutRoundOrder.indexOf(
          b.roundName as (typeof knockoutRoundOrder)[number]
        );

        if (aIndex === -1 && bIndex === -1) {
          return a.roundName.localeCompare(b.roundName);
        }

        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
  };

  const filteredFixtures = allFixtures.filter(matchesStageFilter);
  const activeFixtures = filteredFixtures.filter(
    (fixture) => fixture.status !== "finished"
  );
  const activeGroupFixtures = activeFixtures
    .filter((fixture) => !isKnockoutFixture(fixture))
    .sort(compareKickoffAscending);
  const activeKnockoutRounds = groupKnockoutFixtures(
    activeFixtures.filter(isKnockoutFixture)
  );

  const completedFixtures = filteredFixtures
    .filter((fixture) => fixture.status === "finished")
    .sort(
      (a, b) =>
        new Date(b.kickoff_at).getTime() - new Date(a.kickoff_at).getTime()
    );
  const completedGroupFixtures = completedFixtures.filter(
    (fixture) => !isKnockoutFixture(fixture)
  );
  const completedKnockoutRounds = groupKnockoutFixtures(
    completedFixtures.filter(isKnockoutFixture),
    (a, b) =>
      new Date(b.kickoff_at).getTime() - new Date(a.kickoff_at).getTime()
  );

  const upcomingCount =
    fixtures?.filter((fixture) => new Date(fixture.kickoff_at) > new Date())
      .length || 0;

  const predictedCount = predictions?.length || 0;

  const needsPickCount =
    fixtures?.filter((fixture) => {
      const isFixtureLocked = new Date(fixture.kickoff_at) <= new Date();
      const hasPrediction = predictionMap.has(fixture.id);

      return (
        areFixtureTeamsConfirmed(fixture) &&
        !isFixtureLocked &&
        !hasPrediction
      );
    }).length || 0;

  let hasUnpredictedAnchor = false;
  let hasPredictedAnchor = false;
  let hasUpcomingAnchor = false;

  const renderFixtureCard = (fixture: Fixture) => {
    const prediction = predictionMap.get(fixture.id);
    const kickoffAt = new Date(fixture.kickoff_at);
    const isLocked = kickoffAt <= new Date();
    const isFinished = fixture.status === "finished";
    const hasPrediction = Boolean(prediction);
    const teamsConfirmed = areFixtureTeamsConfirmed(fixture);
    const isUpcoming = kickoffAt > new Date();
    const isUnpredicted = teamsConfirmed && !isLocked && !hasPrediction;
    const anchorIds: string[] = [];

    if (isUnpredicted && !hasUnpredictedAnchor) {
      anchorIds.push("unpredicted-fixtures");
      hasUnpredictedAnchor = true;
    }

    if (hasPrediction && !hasPredictedAnchor) {
      anchorIds.push("predicted-fixtures");
      hasPredictedAnchor = true;
    }

    if (isUpcoming && !hasUpcomingAnchor) {
      anchorIds.push("upcoming-fixtures");
      hasUpcomingAnchor = true;
    }

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

    return (
      <Card
        key={fixture.id}
        className="fixture-card relative scroll-mt-32 overflow-hidden text-white transition duration-200 hover:-translate-y-0.5 hover:bg-white/10"
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
            <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-start lg:justify-between">
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

                  {(teamsConfirmed || isFinished || isLocked) && (
                    <FixtureStatusBadge
                      isFinished={isFinished}
                      isLocked={isLocked}
                      hasPrediction={hasPrediction}
                    />
                  )}

                  {teamsTbc && (
                    <AppBadge variant="muted">Teams TBC</AppBadge>
                  )}

                  {prediction && (
                    <AppBadge variant="blue">
                      Your pick: {prediction.predicted_home_score} -{" "}
                      {prediction.predicted_away_score}
                    </AppBadge>
                  )}
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-5">
                  <div className="flex min-w-0 items-center gap-2 sm:gap-4">
                    <div className="shrink-0">
                      <TeamFlag team={homeTeam} size="sm" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
                        {homeTeam?.short_name || "TBC"}
                      </p>
                      <h2 className="mt-1 truncate text-base font-black tracking-tight sm:text-2xl">
                        {homeTeamName}
                      </h2>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <div className="whitespace-nowrap rounded-full border border-white/10 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-slate-950 shadow-xl sm:px-4 sm:py-2 sm:text-xs sm:tracking-[0.28em]">
                      vs
                    </div>
                  </div>

                  <div className="flex min-w-0 items-center justify-end gap-2 text-right sm:gap-4">
                    <div className="order-2 shrink-0">
                      <TeamFlag team={awayTeam} size="sm" />
                    </div>

                    <div className="order-1 min-w-0">
                      <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
                        {awayTeam?.short_name || "TBC"}
                      </p>
                      <h2 className="mt-1 truncate text-base font-black tracking-tight sm:text-2xl">
                        {awayTeamName}
                      </h2>
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
                      <MapPin className="h-4 w-4" />
                      {fixture.venue}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 py-4 sm:px-6 sm:py-5">
            {isFinished ? (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 sm:rounded-3xl sm:p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
                      <CheckCircle2 className="h-4 w-4" />
                      Full-time result
                    </p>

                    <p className="mt-2 text-2xl font-black tracking-tight sm:text-4xl">
                      {fixture.home_score} - {fixture.away_score}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-center sm:rounded-3xl sm:px-6 sm:py-4">
                    <p className="text-2xl font-black sm:text-4xl">
                      {prediction?.points || 0}
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-300 sm:text-xs sm:tracking-[0.22em]">
                      points
                    </p>
                  </div>
                </div>
              </div>
            ) : !teamsConfirmed ? (
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-slate-300 sm:rounded-3xl sm:px-5 sm:py-4">
                <p className="flex items-center gap-2 font-semibold">
                  <Lock className="h-4 w-4 shrink-0" />
                  Predictions open when both teams are confirmed.
                </p>
              </div>
            ) : isLocked ? (
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-slate-300 sm:rounded-3xl sm:p-5">
                <p className="flex items-center gap-2 font-semibold">
                  <Lock className="h-4 w-4" />
                  Predictions are locked for this fixture.
                </p>

                {prediction ? (
                  <p className="mt-2 text-sm text-slate-400">
                    Your submitted prediction was{" "}
                    <span className="font-semibold text-white">
                      {prediction.predicted_home_score} -{" "}
                      {prediction.predicted_away_score}
                    </span>
                    .
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-slate-400">
                    No prediction was submitted before kickoff.
                  </p>
                )}
              </div>
            ) : (
              <>
                <details className="group sm:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
                    <span className="font-semibold text-slate-100">
                      {prediction ? "Update prediction" : "Make prediction"}
                    </span>
                    <ChevronDown className="h-5 w-5 text-slate-300 transition-transform group-open:rotate-180" />
                  </summary>

                  <div className="mt-3">
                    <PredictionForm
                      fixtureId={fixture.id}
                      homeShortName={homeTeam?.short_name || homeTeamName}
                      awayShortName={awayTeam?.short_name || awayTeamName}
                      initialHomeScore={prediction?.predicted_home_score ?? null}
                      initialAwayScore={prediction?.predicted_away_score ?? null}
                    />
                  </div>
                </details>

                <div className="hidden sm:block">
                  <PredictionForm
                    fixtureId={fixture.id}
                    homeShortName={homeTeam?.short_name || homeTeamName}
                    awayShortName={awayTeam?.short_name || awayTeamName}
                    initialHomeScore={prediction?.predicted_home_score ?? null}
                    initialAwayScore={prediction?.predicted_away_score ?? null}
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <AppShell isAdmin={isAdmin}>
      <div className="sm:hidden">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-white">
          <h1 className="text-2xl font-black tracking-tight">Fixtures</h1>
          <p className="mt-2 text-sm text-slate-300">
            Make your picks before kickoff.
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-2 py-2">
              <p className="text-lg font-black">{fixtures?.length || 0}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-slate-400">
                Total
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-2 py-2">
              <p className="text-lg font-black">{predictedCount}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-slate-400">
                Made
              </p>
            </div>

            <div className="rounded-2xl border border-yellow-300/20 bg-yellow-300/10 px-2 py-2">
              <p className="text-lg font-black">{needsPickCount}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-slate-300">
                Left
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden sm:block">
        <PageHero
          eyebrow="Fixtures"
          title="Make your predictions"
          description="Pick your scorelines before kickoff. Exact scores get the biggest reward, but every correct outcome can move you up the table."
          actions={
            <Button asChild variant="secondary">
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          }
        />
      </div>

      <div className="mt-6 hidden gap-4 sm:grid md:grid-cols-3">
        <Card className="pitch-card text-white">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-slate-300">
              Upcoming fixtures
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight">
              {upcomingCount}
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card text-white">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-slate-300">
              Predictions made
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight">
              {predictedCount}
            </p>
          </CardContent>
        </Card>

        <Card
          className={
            needsPickCount > 0
              ? "gold-card text-white"
              : "glass-card text-white"
          }
        >
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-slate-300">
              Still to predict
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight">
              {needsPickCount}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="sticky top-[73px] z-20 mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-slate-950/80 p-2 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0">
        <Button
          asChild
          variant={stageFilter === "all" ? "default" : "secondary"}
          className="h-9 px-2 text-xs sm:h-10 sm:px-3 sm:text-sm"
        >
          <Link
            href="/fixtures"
            aria-current={stageFilter === "all" ? "page" : undefined}
          >
            All
          </Link>
        </Button>

        <Button
          asChild
          variant={stageFilter === "groups" ? "default" : "secondary"}
          className="h-9 px-2 text-xs sm:h-10 sm:px-3 sm:text-sm"
        >
          <Link
            href="/fixtures?stage=groups"
            aria-current={stageFilter === "groups" ? "page" : undefined}
          >
            Groups
          </Link>
        </Button>

        <Button
          asChild
          variant={stageFilter === "knockouts" ? "default" : "secondary"}
          className="h-9 px-2 text-xs sm:h-10 sm:px-3 sm:text-sm"
        >
          <Link
            href="/fixtures?stage=knockouts"
            aria-current={stageFilter === "knockouts" ? "page" : undefined}
          >
            Knockouts
          </Link>
        </Button>
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

      <div id="fixtures-list" className="mt-4 space-y-3 sm:mt-8 sm:space-y-5">
        {activeGroupFixtures.length > 0 && (
          <section className="space-y-3 sm:space-y-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black tracking-tight text-white sm:text-2xl">
                Group Stage
              </h2>
              <AppBadge variant="slate">
                {activeGroupFixtures.length} active
              </AppBadge>
            </div>

            {activeGroupFixtures.map((fixture) => renderFixtureCard(fixture))}
          </section>
        )}

        {activeKnockoutRounds.length > 0 && (
          <section className="space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black tracking-tight text-white sm:text-2xl">
                Knockouts
              </h2>
              <AppBadge variant="slate">
                {activeKnockoutRounds.reduce(
                  (total, round) => total + round.fixtures.length,
                  0
                )} active
              </AppBadge>
            </div>

            {activeKnockoutRounds.map((round) => (
              <div key={round.roundName} className="space-y-3 sm:space-y-5">
                <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-300 sm:text-base">
                  {round.roundName}
                </h3>
                {round.fixtures.map((fixture) => renderFixtureCard(fixture))}
              </div>
            ))}
          </section>
        )}

        {filteredFixtures.length > 0 && activeFixtures.length === 0 && (
          <Card className="glass-card text-white">
            <CardContent className="flex flex-col items-center justify-center px-6 py-8 text-center">
              <Clock className="mb-3 h-10 w-10 text-slate-500" />
              <h2 className="text-xl font-bold tracking-tight">
                No upcoming fixtures right now
              </h2>
              <p className="mt-2 max-w-md text-slate-400">
                All current fixtures are complete. Check the results below.
              </p>
            </CardContent>
          </Card>
        )}

        {completedFixtures.length > 0 && (
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white backdrop-blur sm:px-6 sm:py-4">
              <span className="font-bold">
                Completed results ({completedFixtures.length})
              </span>
              <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" />
            </summary>

            <div className="mt-3 space-y-3 sm:mt-5 sm:space-y-5">
              {completedGroupFixtures.length > 0 && (
                <section className="space-y-3 sm:space-y-5">
                  <h2 className="text-lg font-black tracking-tight text-white sm:text-xl">
                    Group Stage
                  </h2>
                  {completedGroupFixtures.map((fixture) =>
                    renderFixtureCard(fixture)
                  )}
                </section>
              )}

              {completedKnockoutRounds.length > 0 && (
                <section className="space-y-4 sm:space-y-6">
                  <h2 className="text-lg font-black tracking-tight text-white sm:text-xl">
                    Knockouts
                  </h2>
                  {completedKnockoutRounds.map((round) => (
                    <div
                      key={round.roundName}
                      className="space-y-3 sm:space-y-5"
                    >
                      <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-300">
                        {round.roundName}
                      </h3>
                      {round.fixtures.map((fixture) =>
                        renderFixtureCard(fixture)
                      )}
                    </div>
                  ))}
                </section>
              )}
            </div>
          </details>
        )}

        {stageFilter === "knockouts" && filteredFixtures.length === 0 && (
          <Card className="glass-card text-white">
            <CardContent className="flex flex-col items-center justify-center px-6 py-8 text-center">
              <Clock className="mb-3 h-10 w-10 text-slate-500" />
              <h2 className="text-xl font-bold tracking-tight">
                No knockout fixtures yet
              </h2>
              <p className="mt-2 max-w-md text-slate-400">
                Knockout placeholders will appear here once they are added.
              </p>
            </CardContent>
          </Card>
        )}

        {stageFilter !== "knockouts" &&
          allFixtures.length > 0 &&
          filteredFixtures.length === 0 && (
            <Card className="glass-card text-white">
              <CardContent className="flex flex-col items-center justify-center px-6 py-8 text-center">
                <Clock className="mb-3 h-10 w-10 text-slate-500" />
                <h2 className="text-xl font-bold tracking-tight">
                  No fixtures in this stage
                </h2>
                <p className="mt-2 max-w-md text-slate-400">
                  Try another stage filter to view available fixtures.
                </p>
              </CardContent>
            </Card>
          )}

        {stageFilter !== "knockouts" &&
          (!fixtures || fixtures.length === 0) && (
            <Card className="glass-card text-white">
              <CardContent className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <Clock className="mb-4 h-12 w-12 text-slate-500" />
                <h2 className="text-2xl font-bold tracking-tight">
                  No fixtures yet
                </h2>
                <p className="mt-2 max-w-md text-slate-400">
                  Fixtures will appear here once they have been added.
                </p>
              </CardContent>
            </Card>
          )}
      </div>
    </AppShell>
  );
}
