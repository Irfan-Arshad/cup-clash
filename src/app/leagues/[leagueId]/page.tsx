import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  BarChart3,
  CheckCircle2,
  Copy,
  Crown,
  Medal,
  Shield,
  Sparkles,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { saveTournamentPick } from "@/actions/tournament-picks";
import { CopyInviteCode } from "@/components/league/copy-invite-code";
import { AppShell } from "@/components/layout/app-shell";
import { PageHero } from "@/components/layout/page-hero";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type LeaguePageProps = {
  params: Promise<{
    leagueId: string;
  }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

type LeaderboardRow = {
  userId: string;
  displayName: string;
  role: string;
  joinedAt: string;
  totalPoints: number;
  fixturePoints: number;
  tournamentPickPoints: number;
  winnerPick: string | null;
  predictionsMade: number;
  exactScores: number;
  correctResults: number;
};

type TournamentPickTeam = {
  name: string;
  short_name: string;
};

function getResult(home: number, away: number) {
  if (home > away) return "HOME";
  if (away > home) return "AWAY";
  return "DRAW";
}

function getRankLabel(rank: number) {
  if (rank === 1) return "Top of the table";
  if (rank === 2) return "Runner-up spot";
  if (rank === 3) return "Podium place";
  return "Chasing pack";
}

function getRankClasses(rank: number, isCurrentUser: boolean) {
  if (isCurrentUser) {
    return "border-emerald-400/45 bg-emerald-400/10";
  }

  if (rank === 1) return "leaderboard-rank-gold";
  if (rank === 2) return "leaderboard-rank-silver";
  if (rank === 3) return "leaderboard-rank-bronze";

  return "border-white/10 bg-slate-950/45";
}

function getRankIcon(rank: number) {
  if (rank === 1) return <Crown className="h-5 w-5 text-yellow-300" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-slate-200" />;
  if (rank === 3) return <Medal className="h-5 w-5 text-orange-300" />;

  return <Shield className="h-5 w-5 text-slate-400" />;
}

export default async function LeaguePage({
  params,
  searchParams,
}: LeaguePageProps) {
  const { leagueId } = await params;
  const query = await searchParams;
  const error = query.error;
  const success = query.success;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: league } = await supabase
    .from("leagues")
    .select("id, name, invite_code, created_at")
    .eq("id", leagueId)
    .single();

  if (!league) {
    notFound();
  }

  const { data: memberRows } = await supabase
    .from("league_members")
    .select("id, user_id, role, joined_at")
    .eq("league_id", leagueId)
    .order("joined_at", { ascending: true });

  const userIds = memberRows?.map((member) => member.user_id) || [];

  const { data: profileRows } =
    userIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, display_name, is_admin")
          .in("id", userIds)
      : { data: [] };

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, short_name")
    .order("name", { ascending: true });

  const { data: currentUserPick } = await supabase
    .from("tournament_picks")
    .select(
      `
      id,
      team_id,
      points,
      teams (
        name,
        short_name
      )
    `
    )
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .maybeSingle();

  const currentUserPickTeam = (
    Array.isArray(currentUserPick?.teams)
      ? currentUserPick.teams[0]
      : currentUserPick?.teams
  ) as TournamentPickTeam | undefined;

  const currentUserPickTeamName =
    currentUserPickTeam?.name || "Not picked yet";

  const { data: tournamentPickRows } = await supabase
    .from("tournament_picks")
    .select(
      `
      user_id,
      team_id,
      points,
      teams (
        name,
        short_name
      )
    `
    )
    .eq("league_id", leagueId);

  const { data: predictionRows } =
    userIds.length > 0
      ? await supabase
          .from("predictions")
          .select(
            `
            user_id,
            predicted_home_score,
            predicted_away_score,
            points,
            fixtures (
              id,
              kickoff_at,
              match_number,
              venue,
              group_name,
              home_score,
              away_score,
              status,
              home_team:teams!fixtures_home_team_id_fkey (
                name,
                short_name
              ),
              away_team:teams!fixtures_away_team_id_fkey (
                name,
                short_name
              )
            )
          `
          )
          .in("user_id", userIds)
      : { data: [] };

  const profileMap = new Map(
    profileRows?.map((profile) => [profile.id, profile.display_name]) || []
  );

  const currentUserProfile = profileRows?.find(
    (profile) => profile.id === user.id
  );

  const isAdmin = currentUserProfile?.is_admin === true;

  const tournamentPickMap = new Map(
    tournamentPickRows?.map((pick) => {
      const team = (
        Array.isArray(pick.teams) ? pick.teams[0] : pick.teams
      ) as TournamentPickTeam | undefined;

      return [
        pick.user_id,
        {
          teamName: team?.name || "Unknown team",
          shortName: team?.short_name || "",
          points: pick.points || 0,
        },
      ];
    }) || []
  );

  const leaderboard: LeaderboardRow[] =
    memberRows?.map((member) => {
      const memberPredictions =
        predictionRows?.filter(
          (prediction) => prediction.user_id === member.user_id
        ) || [];

      const finishedPredictions = memberPredictions.filter((prediction) => {
        const fixture = Array.isArray(prediction.fixtures)
          ? prediction.fixtures[0]
          : prediction.fixtures;

        return fixture?.status === "finished";
      });

      const exactScores = finishedPredictions.filter((prediction) => {
        const fixture = Array.isArray(prediction.fixtures)
          ? prediction.fixtures[0]
          : prediction.fixtures;

        return (
          fixture?.home_score === prediction.predicted_home_score &&
          fixture?.away_score === prediction.predicted_away_score
        );
      }).length;

      const correctResults = finishedPredictions.filter((prediction) => {
        const fixture = Array.isArray(prediction.fixtures)
          ? prediction.fixtures[0]
          : prediction.fixtures;

        if (
          fixture?.home_score === null ||
          fixture?.away_score === null ||
          fixture?.home_score === undefined ||
          fixture?.away_score === undefined
        ) {
          return false;
        }

        const predictedResult = getResult(
          prediction.predicted_home_score,
          prediction.predicted_away_score
        );

        const actualResult = getResult(fixture.home_score, fixture.away_score);

        return predictedResult === actualResult;
      }).length;

      const fixturePoints = memberPredictions.reduce(
        (sum, prediction) => sum + (prediction.points || 0),
        0
      );

      const tournamentPickPoints =
        tournamentPickMap.get(member.user_id)?.points || 0;

      const totalPoints = fixturePoints + tournamentPickPoints;

      return {
        userId: member.user_id,
        displayName: profileMap.get(member.user_id) || "Player",
        role: member.role,
        joinedAt: member.joined_at,
        totalPoints,
        fixturePoints,
        tournamentPickPoints,
        winnerPick: tournamentPickMap.get(member.user_id)?.teamName || null,
        predictionsMade: memberPredictions.length,
        exactScores,
        correctResults,
      };
    }) || [];

  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }

    if (b.exactScores !== a.exactScores) {
      return b.exactScores - a.exactScores;
    }

    if (b.correctResults !== a.correctResults) {
      return b.correctResults - a.correctResults;
    }

    return a.displayName.localeCompare(b.displayName);
  });

  const finishedFixturePredictionGroups = new Map<
    number,
    {
      fixtureId: number;
      homeTeam: string;
      awayTeam: string;
      homeScore: number | null;
      awayScore: number | null;
      matchNumber: number | null;
      groupName: string | null;
      venue: string | null;
      predictions: {
        userId: string;
        displayName: string;
        predictedHome: number;
        predictedAway: number;
        points: number;
      }[];
    }
  >();

  for (const prediction of predictionRows || []) {
    const fixture = Array.isArray(prediction.fixtures)
      ? prediction.fixtures[0]
      : prediction.fixtures;

    if (!fixture || fixture.status !== "finished") {
      continue;
    }

    const homeTeam = Array.isArray(fixture.home_team)
      ? fixture.home_team[0]
      : fixture.home_team;

    const awayTeam = Array.isArray(fixture.away_team)
      ? fixture.away_team[0]
      : fixture.away_team;

    if (!finishedFixturePredictionGroups.has(fixture.id)) {
      finishedFixturePredictionGroups.set(fixture.id, {
        fixtureId: fixture.id,
        matchNumber: fixture.match_number,
        groupName: fixture.group_name,
        venue: fixture.venue,
        homeTeam: homeTeam?.name || "Home",
        awayTeam: awayTeam?.name || "Away",
        homeScore: fixture.home_score,
        awayScore: fixture.away_score,
        predictions: [],
      });
    }

    finishedFixturePredictionGroups.get(fixture.id)?.predictions.push({
      userId: prediction.user_id,
      displayName: profileMap.get(prediction.user_id) || "Player",
      predictedHome: prediction.predicted_home_score,
      predictedAway: prediction.predicted_away_score,
      points: prediction.points || 0,
    });
  }

  const finishedFixtureBreakdown = Array.from(
    finishedFixturePredictionGroups.values()
  );

  const currentUserRow = sortedLeaderboard.find((row) => row.userId === user.id);
  const currentUserRank = currentUserRow
    ? sortedLeaderboard.findIndex((row) => row.userId === user.id) + 1
    : null;

  const topPlayer = sortedLeaderboard[0];
  const pointsToTop =
    currentUserRow && topPlayer && currentUserRow.userId !== topPlayer.userId
      ? topPlayer.totalPoints - currentUserRow.totalPoints
      : 0;

  return (
    <AppShell isAdmin={isAdmin}>
      <PageHero
        eyebrow="Private League"
        title={league.name}
        description="Predict fixtures, earn points, compare winner picks, and climb above your group chat."
        actions={
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="secondary">
              <Link href="/fixtures">Predict fixtures</Link>
            </Button>

            {isAdmin && (
              <Button asChild>
                <Link href="/admin">Admin scores</Link>
              </Button>
            )}
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

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Members"
          value={leaderboard.length}
          description="Players joined this league."
          icon={<Users className="h-5 w-5" />}
        />

        <StatCard
          title="Your rank"
          value={currentUserRank ? `#${currentUserRank}` : "-"}
          description={
            pointsToTop > 0
              ? `${pointsToTop} points off top spot.`
              : "You are leading or level top."
          }
          icon={<Medal className="h-5 w-5" />}
        />

        <StatCard
          title="Your points"
          value={currentUserRow?.totalPoints || 0}
          description="Fixture and bonus points."
          icon={<Target className="h-5 w-5" />}
        />

        <Card className="pitch-card text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-slate-300">
                Invite code
              </p>

              <div className="rounded-2xl border border-white/10 bg-white/10 p-2 text-emerald-300">
                <Copy className="h-5 w-5" />
              </div>
            </div>

            <p className="mt-5 font-mono text-3xl font-black tracking-[0.22em]">
              {league.invite_code}
            </p>

            <p className="mt-2 text-sm text-slate-400">
              Share this with friends to join.
            </p>

            <div className="mt-4">
              <CopyInviteCode
                inviteCode={league.invite_code}
                leagueName={league.name}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 pitch-card text-white">
        <CardContent className="p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_420px] lg:items-end">
            <div>
              <div className="flex items-center gap-2">
                <Crown className="h-6 w-6 text-yellow-300" />
                <h2 className="text-2xl font-bold tracking-tight">
                  Tournament winner pick
                </h2>
              </div>

              <p className="mt-3 max-w-2xl text-slate-300">
                Pick the team you think will win the tournament. If you get it
                right, you can steal 20 bonus points at the end.
              </p>

              <div className="mt-5 rounded-3xl border border-yellow-300/20 bg-yellow-300/10 px-5 py-4">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-yellow-200">
                  Your current pick
                </p>

                <p className="mt-2 text-2xl font-black">
                  {currentUserPickTeamName}
                </p>
              </div>
            </div>

            <form action={saveTournamentPick} className="space-y-3">
              <input type="hidden" name="leagueId" value={league.id} />

              <Select
                name="teamId"
                defaultValue={String(currentUserPick?.team_id || "")}
              >
                <SelectTrigger className="h-12 border-white/10 bg-slate-950">
                  <SelectValue placeholder="Choose your winner" />
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
                {currentUserPick ? "Update winner pick" : "Save winner pick"}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.85fr_1.4fr]">
        <Card className="glass-card text-white">
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-center gap-2">
              <Crown className="h-6 w-6 text-yellow-300" />
              <h2 className="text-2xl font-bold tracking-tight">
                Winner picks
              </h2>
            </div>

            {sortedLeaderboard.length === 0 ? (
              <p className="mt-5 text-slate-300">No picks yet.</p>
            ) : (
              <div className="mt-5 space-y-3">
                {sortedLeaderboard.map((row) => {
                  const hasPick = Boolean(row.winnerPick);

                  return (
                    <div
                      key={`winner-pick-${row.userId}`}
                      className="flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-slate-950/45 px-4 py-3"
                    >
                      <div>
                        <p className="font-bold">{row.displayName}</p>
                        <p className="mt-1 text-sm text-slate-400">
                          {row.winnerPick || "Not picked yet"}
                        </p>
                      </div>

                      <Badge
                        className={
                          hasPick
                            ? "border-emerald-400/20 bg-emerald-400/15 text-emerald-200 hover:bg-emerald-400/15"
                            : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/5"
                        }
                      >
                        {row.tournamentPickPoints} pts
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card text-white">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-yellow-300" />
                <h2 className="text-2xl font-bold tracking-tight">
                  Leaderboard
                </h2>
              </div>

              {topPlayer && (
                <Badge className="w-fit rounded-full border-yellow-300/25 bg-yellow-300/10 px-3 py-1.5 text-xs font-bold text-yellow-100 shadow-sm shadow-yellow-950/30 hover:bg-yellow-300/10">
                  <Sparkles className="mr-1 h-3 w-3" />
                  {topPlayer.displayName} leads with {topPlayer.totalPoints} pts
                </Badge>
              )}
            </div>

            {sortedLeaderboard.length === 0 ? (
              <p className="mt-5 text-slate-300">No members yet.</p>
            ) : (
              <div className="mt-5 space-y-3">
                {sortedLeaderboard.map((row, index) => {
                  const rank = index + 1;
                  const isCurrentUser = row.userId === user.id;

                  return (
                    <div
                      key={row.userId}
                      className={`rounded-3xl border p-4 transition duration-200 hover:-translate-y-0.5 ${getRankClasses(
                        rank,
                        isCurrentUser
                      )}`}
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex items-center gap-4">
                          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-white text-2xl font-black text-slate-950 shadow-xl">
                            {rank}
                            <div className="absolute -right-2 -top-2 rounded-full border border-white/10 bg-slate-950 p-1">
                              {getRankIcon(rank)}
                            </div>
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-xl font-black tracking-tight">
                                {row.displayName}
                              </p>

                              {isCurrentUser && (
                                  <Badge className="rounded-full border-emerald-400/30 bg-emerald-400/15 px-2.5 py-1 text-xs font-bold text-emerald-100 hover:bg-emerald-400/15">
                                    You
                                  </Badge>
                                )}

                                <Badge className="rounded-full border-white/15 bg-white/10 px-2.5 py-1 text-xs font-semibold capitalize text-slate-100 hover:bg-white/10">
                                  {row.role}
                                </Badge>

                                <Badge
                                    className={
                                      rank === 1
                                        ? "rounded-full border-yellow-300/20 bg-yellow-300/10 px-2.5 py-1 text-xs font-semibold text-yellow-100 hover:bg-yellow-300/10"
                                        : rank === 2
                                          ? "rounded-full border-slate-300/20 bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-100 hover:bg-white/10"
                                          : rank === 3
                                            ? "rounded-full border-orange-300/20 bg-orange-300/10 px-2.5 py-1 text-xs font-semibold text-orange-100 hover:bg-orange-300/10"
                                            : "rounded-full border-white/15 bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-100 hover:bg-white/10"
                                    }
                                  >
                                    {getRankLabel(rank)}
                                </Badge>
                            </div>

                            <p className="mt-2 text-sm text-slate-400">
                              {row.predictionsMade} predictions made
                            </p>

                            <p className="mt-1 text-sm text-slate-400">
                              Winner pick:{" "}
                              <span className="font-medium text-slate-200">
                                {row.winnerPick || "Not picked yet"}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 text-center sm:min-w-[340px]">
                          <div className="score-pill rounded-2xl px-3 py-3">
                            <p className="text-3xl font-black">
                              {row.totalPoints}
                            </p>
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                              total
                            </p>
                          </div>

                          <div className="score-pill rounded-2xl px-3 py-3">
                            <p className="text-3xl font-black">
                              {row.exactScores}
                            </p>
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                              exact
                            </p>
                          </div>

                          <div className="score-pill rounded-2xl px-3 py-3">
                            <p className="text-3xl font-black">
                              {row.correctResults}
                            </p>
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                              results
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 text-sm text-slate-300 sm:grid-cols-2">
                        <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-2">
                          <span>Fixture points</span>
                          <span className="font-bold text-white">
                            {row.fixturePoints}
                          </span>
                        </div>

                        <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-2">
                          <span>Bonus points</span>
                          <span className="font-bold text-white">
                            {row.tournamentPickPoints}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 fixture-card text-white">
        <CardContent className="p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <Target className="h-6 w-6 text-emerald-300" />
            <h2 className="text-2xl font-bold tracking-tight">
              Prediction breakdown
            </h2>
          </div>

          {finishedFixtureBreakdown.length === 0 ? (
            <p className="mt-5 text-slate-300">
              Prediction breakdowns will appear once fixtures are finished.
            </p>
          ) : (
            <div className="mt-5 space-y-4">
              {finishedFixtureBreakdown.map((fixture) => (
                <div
                  key={fixture.fixtureId}
                  className="rounded-3xl border border-white/10 bg-slate-950/45 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        {fixture.matchNumber && (
                          <Badge variant="outline">
                            Match {fixture.matchNumber}
                          </Badge>
                        )}

                        {fixture.groupName && (
                          <Badge variant="secondary">
                            {fixture.groupName}
                          </Badge>
                        )}
                      </div>

                      <p className="mt-3 text-xl font-black tracking-tight">
                        {fixture.homeTeam} vs {fixture.awayTeam}
                      </p>

                      <p className="mt-1 text-sm text-slate-300">
                        Final score:{" "}
                        <span className="font-bold text-white">
                          {fixture.homeScore} - {fixture.awayScore}
                        </span>
                      </p>

                      {fixture.venue && (
                        <p className="mt-1 text-sm text-slate-500">
                          {fixture.venue}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {[...fixture.predictions]
                      .sort((a, b) => b.points - a.points)
                      .map((prediction) => (
                        <div
                          key={`${fixture.fixtureId}-${prediction.userId}`}
                          className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                        >
                          <div>
                            <p className="font-bold">
                              {prediction.displayName}
                            </p>

                            <p className="mt-1 text-sm text-slate-400">
                              Predicted{" "}
                              <span className="font-medium text-slate-200">
                                {prediction.predictedHome} -{" "}
                                {prediction.predictedAway}
                              </span>
                            </p>
                          </div>

                          <Badge
                            className={
                              prediction.points >= 5
                                ? "border-yellow-300/20 bg-yellow-300/15 text-yellow-100 hover:bg-yellow-300/15"
                                : prediction.points > 0
                                  ? "border-emerald-400/20 bg-emerald-400/15 text-emerald-200 hover:bg-emerald-400/15"
                                  : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/5"
                            }
                          >
                            {prediction.points} pts
                          </Badge>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6 border-white/10 bg-white/[0.03] text-white">
        <CardContent className="p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-emerald-300" />
            <h2 className="text-2xl font-bold tracking-tight">
              Scoring rules
            </h2>
          </div>

          <div className="mt-5 grid gap-3 text-sm text-slate-300 md:grid-cols-4">
            <div className="rounded-2xl border border-yellow-300/20 bg-yellow-300/10 p-4">
              <p className="text-xl font-black text-white">5 pts</p>
              <p className="mt-1">Exact scoreline</p>
            </div>

            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
              <p className="text-xl font-black text-white">3 pts</p>
              <p className="mt-1">Correct result + goal difference</p>
            </div>

            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
              <p className="text-xl font-black text-white">3 pts</p>
              <p className="mt-1">Correct draw, wrong score</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xl font-black text-white">2 pts</p>
              <p className="mt-1">Correct result only</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}