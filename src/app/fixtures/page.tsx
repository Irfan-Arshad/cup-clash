import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
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

type FixturesPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

type Team = TeamFlagData;


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

  const upcomingCount =
    fixtures?.filter((fixture) => new Date(fixture.kickoff_at) > new Date())
      .length || 0;

  const predictedCount = predictions?.length || 0;

  const needsPickCount =
    fixtures?.filter((fixture) => {
      const isFixtureLocked = new Date(fixture.kickoff_at) <= new Date();
      const hasPrediction = predictionMap.has(fixture.id);

      return !isFixtureLocked && !hasPrediction;
    }).length || 0;

  return (
    <AppShell isAdmin={isAdmin}>
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

      <div className="mt-6 grid gap-4 md:grid-cols-3">
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

      <div className="mt-8 space-y-5">
        {fixtures?.map((fixture) => {
          const prediction = predictionMap.get(fixture.id);
          const kickoffAt = new Date(fixture.kickoff_at);
          const isLocked = kickoffAt <= new Date();
          const isFinished = fixture.status === "finished";

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

          return (
            <Card
              key={fixture.id}
              className="fixture-card overflow-hidden text-white transition duration-200 hover:-translate-y-0.5 hover:bg-white/10"
            >
              <CardContent className="p-0">
                <div className="border-b border-white/10 px-5 py-4 sm:px-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
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
                          <AppBadge variant="muted">{fixture.round_name}</AppBadge>
                        )}

                        <FixtureStatusBadge
                          isFinished={isFinished}
                          isLocked={isLocked}
                          hasPrediction={Boolean(prediction)}
                        />
                      </div>

                      <div className="grid gap-5 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                        <div className="flex items-center gap-4">
                          <TeamFlag team={homeTeam} />

                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
                              {homeTeam?.short_name}
                            </p>
                            <h2 className="mt-1 text-2xl font-black tracking-tight">
                              {homeTeam?.name}
                            </h2>
                          </div>
                        </div>

                        <div className="flex justify-start sm:justify-center">
                          <div className="rounded-full border border-white/10 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.28em] text-slate-950 shadow-xl">
                            vs
                          </div>
                        </div>

                        <div className="flex items-center gap-4 sm:justify-end sm:text-right">
                          <div className="sm:order-2">
                            <TeamFlag team={awayTeam} />
                          </div>

                          <div className="sm:order-1">
                            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
                              {awayTeam?.short_name}
                            </p>
                            <h2 className="mt-1 text-2xl font-black tracking-tight">
                              {awayTeam?.name}
                            </h2>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-400">
                        <span className="flex items-center gap-1.5">
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

                <div className="px-5 py-5 sm:px-6">
                  {isFinished ? (
                    <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5">
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <div>
                          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
                            <CheckCircle2 className="h-4 w-4" />
                            Full-time result
                          </p>

                          <p className="mt-2 text-4xl font-black tracking-tight">
                            {fixture.home_score} - {fixture.away_score}
                          </p>
                        </div>

                        <div className="rounded-3xl border border-white/10 bg-white/10 px-6 py-4 text-center">
                          <p className="text-4xl font-black">
                            {prediction?.points || 0}
                          </p>
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-300">
                            points
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : isLocked ? (
                    <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5 text-slate-300">
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
                    <PredictionForm
                      fixtureId={fixture.id}
                      homeShortName={homeTeam?.short_name}
                      awayShortName={awayTeam?.short_name}
                      initialHomeScore={prediction?.predicted_home_score ?? null}
                      initialAwayScore={prediction?.predicted_away_score ?? null}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {(!fixtures || fixtures.length === 0) && (
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
