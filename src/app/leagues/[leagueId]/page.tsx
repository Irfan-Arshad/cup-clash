import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
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
import { TeamFlag, type TeamFlagData } from "@/components/team/team-flag";
import { AppBadge } from "@/components/ui/app-badge";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatUkKickoff } from "@/lib/format-date";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const dynamic = "force-dynamic";

type LeaguePageProps = {
  params: Promise<{
    leagueId: string;
  }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

type Team = TeamFlagData & {
  id?: number;
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

type RankedLeaderboardRow = LeaderboardRow & {
  rank: number;
};

type FinishedFixtureBreakdown = {
  fixtureId: number;
  kickoff_at: string;
  homeTeam: Team | null;
  awayTeam: Team | null;
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
};

type PredictionCountRow = {
  member_user_id: string;
  predictions_made: number | string | null;
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

  const { data: predictionCountRows } = await supabase.rpc(
    "get_league_prediction_counts",
    {
      target_league_id: leagueId,
    }
  );

  const predictionCountMap = new Map<string, number>(
    ((predictionCountRows || []) as PredictionCountRow[]).map((row) => [
      row.member_user_id,
      Number(row.predictions_made || 0),
    ])
  );

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
        short_name,
        flag_emoji,
        flag_url
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
  ) as Team | undefined;

  const currentUserPickTeamName = currentUserPickTeam?.name || "Unknown team";

  const { data: tournamentPickRows } = await supabase
    .from("tournament_picks")
    .select(
      `
      user_id,
      team_id,
      points,
      teams (
        name,
        short_name,
        flag_emoji,
        flag_url
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

  const tournamentPickMap = new Map(
    tournamentPickRows?.map((pick) => {
      const team = (
        Array.isArray(pick.teams) ? pick.teams[0] : pick.teams
      ) as Team | undefined;

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

  const isAdmin = currentUserProfile?.is_admin === true;

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
        predictionsMade:
          predictionCountMap.get(member.user_id) ?? memberPredictions.length,
        exactScores,
        correctResults,
      };
    }) || [];

  const sortedLeaderboard: RankedLeaderboardRow[] = [...leaderboard]
    .sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.exactScores !== a.exactScores) {
        return b.exactScores - a.exactScores;
      }
      if (b.correctResults !== a.correctResults) {
        return b.correctResults - a.correctResults;
      }

      return a.displayName.localeCompare(b.displayName);
    })
    .reduce<RankedLeaderboardRow[]>((rankedRows, row, index) => {
      const previousRow = rankedRows[index - 1];
      const rank =
        previousRow && previousRow.totalPoints === row.totalPoints
          ? previousRow.rank
          : (previousRow?.rank ?? 0) + 1;

      rankedRows.push({
        ...row,
        rank,
      });

      return rankedRows;
    }, []);

  const finishedFixturePredictionGroups = new Map<
    number,
    FinishedFixtureBreakdown
  >();

  for (const prediction of predictionRows || []) {
    const fixture = Array.isArray(prediction.fixtures)
      ? prediction.fixtures[0]
      : prediction.fixtures;

    const isKickoffPassed =
      fixture?.kickoff_at && new Date(fixture.kickoff_at) <= new Date();

    if (!fixture || (!isKickoffPassed && fixture.status !== "finished")) {
      continue;
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

    if (!finishedFixturePredictionGroups.has(fixture.id)) {
      finishedFixturePredictionGroups.set(fixture.id, {
        fixtureId: fixture.id,
        kickoff_at: fixture.kickoff_at,
        matchNumber: fixture.match_number,
        groupName: fixture.group_name,
        venue: fixture.venue,
        homeTeam,
        awayTeam,
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
  const currentUserRank = currentUserRow?.rank ?? null;

  const topPlayer = sortedLeaderboard[0];

  return (
    <AppShell isAdmin={isAdmin}>
      <div className="sm:hidden">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
            Private League
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight">
            {league.name}
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            {leaderboard.length} members · Rank{" "}
            {currentUserRank ? `#${currentUserRank}` : "-"} ·{" "}
            {currentUserRow?.totalPoints || 0} pts
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button asChild size="sm">
              <Link href="/fixtures">Predict</Link>
            </Button>

            <CopyInviteCode
              inviteCode={league.invite_code}
              leagueName={league.name}
              size="sm"
            />
          </div>

          {isAdmin && (
            <Button asChild variant="secondary" size="sm" className="mt-2 w-full">
              <Link href="/admin">Admin scores</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="hidden sm:block">
        <PageHero
          eyebrow="Private League"
          title={league.name}
          description="Predict fixtures, earn points, and climb above your group chat."
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

      <Card className="mt-4 glass-card text-white md:hidden">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-2 py-3">
              <p className="text-lg font-black">{leaderboard.length}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-slate-400">
                Members
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-2 py-3">
              <p className="text-lg font-black">
                {currentUserRank ? `#${currentUserRank}` : "-"}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-slate-400">
                Rank
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-2 py-3">
              <p className="text-lg font-black">
                {currentUserRow?.totalPoints || 0}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-slate-400">
                Points
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-yellow-300/20 bg-yellow-300/10 px-3 py-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-yellow-200">
                Invite code
              </p>
              <p className="mt-0.5 font-mono text-lg font-black tracking-[0.18em]">
                {league.invite_code}
              </p>
            </div>

            <CopyInviteCode
              inviteCode={league.invite_code}
              leagueName={league.name}
              size="sm"
            />
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 hidden gap-4 md:grid md:grid-cols-4">
        <StatCard
          title="Members"
          value={leaderboard.length}
          description="Players joined"
          icon={<Users className="h-5 w-5" />}
        />

        <StatCard
          title="Your rank"
          value={currentUserRank ? `#${currentUserRank}` : "-"}
          description="In this league"
          icon={<Medal className="h-5 w-5" />}
        />

        <StatCard
          title="Your points"
          value={currentUserRow?.totalPoints || 0}
          description="Points earned"
          icon={<Target className="h-5 w-5" />}
        />

        <Card className="gold-card text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-slate-300">
                Invite code
              </p>
              <Copy className="h-5 w-5 text-yellow-300" />
            </div>

            <p className="mt-6 font-mono text-3xl font-black tracking-[0.22em]">
              {league.invite_code}
            </p>

            <p className="mt-2 text-sm text-slate-400">
              Share with friends.
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

      <div className="sticky top-[73px] z-20 mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-slate-950/80 p-2 backdrop-blur sm:static sm:flex sm:flex-wrap sm:border-0 sm:bg-transparent sm:p-0">
        <Button asChild variant="secondary" className="h-10 px-3 text-sm">
          <a href="#leaderboard">Table</a>
        </Button>

        <Button asChild variant="secondary" className="h-10 px-3 text-sm">
          <a href="#winner-pick">Winner pick</a>
        </Button>

        <Button asChild variant="secondary" className="h-10 px-3 text-sm">
          <a href="#breakdown">Breakdown</a>
        </Button>
      </div>

      {topPlayer && (
        <Card className="mt-6 hidden pitch-card text-white sm:block">
          <CardContent className="flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center">
            <div>
              <AppBadge variant="gold" className="px-3 py-1.5">
                <Sparkles className="mr-1 h-3 w-3" />
                {topPlayer.displayName} leads with {topPlayer.totalPoints} pts
              </AppBadge>

              <h2 className="mt-4 text-2xl font-black tracking-tight">
                The league table is live
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Fixture points and tournament winner bonus points are combined
                into the total.
              </p>
            </div>

            <Trophy className="h-14 w-14 text-yellow-300" />
          </CardContent>
        </Card>
      )}

      <Card id="leaderboard" className="mt-4 glass-card text-white sm:mt-8">
        <CardContent className="p-4 sm:p-8">
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-300" />
            <h2 className="text-xl font-black tracking-tight sm:text-2xl">
              Leaderboard
            </h2>
          </div>

          {sortedLeaderboard.length === 0 ? (
            <p className="mt-5 text-slate-300">No members yet.</p>
          ) : (
            <div className="mt-4 space-y-2 sm:mt-5 sm:space-y-3">
              {sortedLeaderboard.map((row) => {
                const rank = row.rank;
                const isCurrentUser = row.userId === user.id;

                return (
                  <div
                    key={row.userId}
                    className={`rounded-2xl border px-3 py-3 sm:rounded-3xl sm:px-5 sm:py-5 ${getRankClasses(
                      rank,
                      isCurrentUser
                    )}`}
                  >
                    <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 sm:h-14 sm:w-14 sm:rounded-2xl">
                          {getRankIcon(rank)}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-base font-black sm:text-lg">
                              #{rank} {row.displayName}
                            </p>

                            {isCurrentUser && (
                              <AppBadge variant="emerald">You</AppBadge>
                            )}

                            <AppBadge
                              variant="muted"
                              className="capitalize"
                            >
                              {row.role}
                            </AppBadge>

                            <AppBadge
                              variant={
                                rank === 1
                                  ? "gold"
                                  : rank === 2
                                    ? "slate"
                                    : rank === 3
                                      ? "gold"
                                      : "muted"
                              }
                            >
                              {getRankLabel(rank)}
                            </AppBadge>
                          </div>

                          <p className="mt-1 text-xs text-slate-400 sm:mt-2 sm:text-sm">
                            {row.predictionsMade} predictions made • Winner
                            pick:{" "}
                            <span className="text-slate-200">
                              {row.winnerPick || "Not picked yet"}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[340px] sm:gap-3">
                        <div className="score-pill rounded-xl px-2 py-1.5 sm:rounded-2xl sm:px-4 sm:py-3">
                          <p className="text-lg font-black sm:text-2xl">
                            {row.totalPoints}
                          </p>
                          <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400 sm:text-xs sm:tracking-[0.18em]">
                            total pts
                          </p>
                        </div>

                        <div className="score-pill rounded-xl px-2 py-1.5 sm:rounded-2xl sm:px-4 sm:py-3">
                          <p className="text-lg font-black sm:text-2xl">
                            {row.exactScores}
                          </p>
                          <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400 sm:text-xs sm:tracking-[0.18em]">
                            exact
                          </p>
                        </div>

                        <div className="score-pill rounded-xl px-2 py-1.5 sm:rounded-2xl sm:px-4 sm:py-3">
                          <p className="text-lg font-black sm:text-2xl">
                            {row.correctResults}
                          </p>
                          <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400 sm:text-xs sm:tracking-[0.18em]">
                            outcomes
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card id="winner-pick" className="mt-6 pitch-card text-white sm:mt-8">
        <CardContent className="p-4 sm:p-8">
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_420px] lg:items-end">
            <div>
              <div className="flex items-center gap-2">
                <Crown className="h-6 w-6 text-yellow-300" />
                <h2 className="text-xl font-black tracking-tight sm:text-2xl">
                  Tournament winner pick
                </h2>
              </div>

              <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:mt-3 sm:text-base">
                <span className="sm:hidden">Worth bonus points later.</span>
                <span className="hidden sm:inline">
                  Pick the team you think will win the World Cup. This can be
                  worth bonus points later.
                </span>
              </p>

              {currentUserPick && (
                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-yellow-300/20 bg-yellow-300/10 px-4 py-3 sm:mt-5 sm:gap-4 sm:rounded-3xl sm:px-5 sm:py-4">
                  <TeamFlag team={currentUserPickTeam} size="sm" />

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-yellow-200 sm:text-sm sm:tracking-[0.2em]">
                      Your current pick
                    </p>
                    <p className="mt-1 text-lg font-black sm:text-xl">
                      {currentUserPickTeamName}
                    </p>
                  </div>
                </div>
              )}
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

              <SubmitButton
                className="h-12 w-full"
                pendingText={
                  currentUserPick ? "Updating pick..." : "Saving pick..."
                }
              >
                {currentUserPick ? "Update winner pick" : "Save winner pick"}
              </SubmitButton>
            </form>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-8 glass-card text-white">
        <CardContent className="p-4 sm:p-8">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Crown className="h-6 w-6 text-yellow-300" />
                <h2 className="text-xl font-black tracking-tight sm:text-2xl">
                  League winner picks
                </h2>
              </div>

              <ChevronDown className="h-6 w-6 text-slate-300 transition-transform group-open:rotate-180" />
            </summary>

            {sortedLeaderboard.length === 0 ? (
              <p className="mt-5 text-slate-300">No picks yet.</p>
            ) : (
              <div className="mt-4 grid gap-2 sm:mt-5 sm:gap-3 md:grid-cols-2">
                {sortedLeaderboard.map((row) => (
                  <div
                    key={`winner-pick-${row.userId}`}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 sm:rounded-3xl sm:px-5 sm:py-4"
                  >
                    <div>
                      <p className="font-bold">{row.displayName}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {row.winnerPick || "Not picked yet"}
                      </p>
                    </div>

                    <AppBadge variant="gold">
                      {row.tournamentPickPoints} pts
                    </AppBadge>
                  </div>
                ))}
              </div>
            )}
          </details>
        </CardContent>
      </Card>

      <Card id="breakdown" className="mt-8 fixture-card text-white">
        <CardContent className="p-4 sm:p-6">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Target className="h-6 w-6 text-emerald-300" />
                <h2 className="text-xl font-black tracking-tight sm:text-2xl">
                  Prediction breakdown
                </h2>
              </div>

              <ChevronDown className="h-6 w-6 text-slate-300 transition-transform group-open:rotate-180" />
            </summary>

            {finishedFixtureBreakdown.length === 0 ? (
              <p className="mt-4 text-slate-300">
                Prediction breakdowns will appear once fixtures are finished.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {finishedFixtureBreakdown.map((fixture) => (
                  <div
                    key={fixture.fixtureId}
                    className="rounded-2xl border border-white/10 bg-slate-950/45 p-4"
                  >
                    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                      <div className="min-w-0 flex-1">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          {fixture.matchNumber && (
                            <AppBadge variant="muted">
                              Match {fixture.matchNumber}
                            </AppBadge>
                          )}

                          {fixture.groupName && (
                            <AppBadge variant="slate">
                              {fixture.groupName}
                            </AppBadge>
                          )}

                          <AppBadge variant="muted">
                            <CalendarDays className="mr-1 h-3 w-3" />
                            {formatUkKickoff(fixture.kickoff_at)}
                          </AppBadge>

                          {fixture.venue && (
                            <AppBadge variant="muted">
                              {fixture.venue}
                            </AppBadge>
                          )}
                        </div>

                        <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                          <div className="flex items-center gap-3">
                            <TeamFlag team={fixture.homeTeam} size="sm" />

                            <div>
                              <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
                                {fixture.homeTeam?.short_name}
                              </p>
                              <h3 className="mt-1 text-lg font-black tracking-tight">
                                {fixture.homeTeam?.name}
                              </h3>
                            </div>
                          </div>

                          <div className="flex justify-start sm:justify-center">
                            <div className="rounded-full border border-white/10 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-[0.24em] text-slate-950">
                              {fixture.homeScore} - {fixture.awayScore}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 sm:justify-end sm:text-right">
                            <div className="sm:order-2">
                              <TeamFlag team={fixture.awayTeam} size="sm" />
                            </div>

                            <div className="sm:order-1">
                              <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
                                {fixture.awayTeam?.short_name}
                              </p>
                              <h3 className="mt-1 text-lg font-black tracking-tight">
                                {fixture.awayTeam?.name}
                              </h3>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 md:grid-cols-2">
                      {[...fixture.predictions]
                        .sort((a, b) => b.points - a.points)
                        .map((prediction) => (
                          <div
                            key={`${fixture.fixtureId}-${prediction.userId}`}
                            className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                          >
                            <div>
                              <p className="font-bold">
                                {prediction.displayName}
                              </p>

                              <p className="mt-1 text-sm text-slate-400">
                                Predicted{" "}
                                <span className="text-slate-200">
                                  {prediction.predictedHome} -{" "}
                                  {prediction.predictedAway}
                                </span>
                              </p>
                            </div>

                            <AppBadge
                              variant={
                                prediction.points > 0 ? "emerald" : "muted"
                              }
                            >
                              {prediction.points} pts
                            </AppBadge>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </details>
        </CardContent>
      </Card>

      <Card className="mt-8 glass-card text-white">
        <CardContent className="p-4 sm:p-8">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-emerald-300" />
                <h2 className="text-xl font-black tracking-tight sm:text-2xl">
                  Scoring rules
                </h2>
              </div>

              <ChevronDown className="h-6 w-6 text-slate-300 transition-transform group-open:rotate-180" />
            </summary>

            <div className="mt-5 grid gap-3 text-sm text-slate-300 md:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xl font-black text-white">5 pts</p>
                <p className="mt-1">Exact scoreline</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xl font-black text-white">3 pts</p>
                <p className="mt-1">Correct result + goal difference</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xl font-black text-white">3 pts</p>
                <p className="mt-1">Correct draw, wrong score</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xl font-black text-white">2 pts</p>
                <p className="mt-1">Correct result only</p>
              </div>
            </div>
          </details>
        </CardContent>
      </Card>
    </AppShell>
  );
}
