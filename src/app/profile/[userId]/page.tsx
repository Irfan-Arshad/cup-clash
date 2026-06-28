import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Award,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Crown,
  Medal,
  Percent,
  Shield,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHero } from "@/components/layout/page-hero";
import { TeamFlag, type TeamFlagData } from "@/components/team/team-flag";
import { AppBadge } from "@/components/ui/app-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CountdownTimer } from "@/components/ui/countdown-timer";
import { StatCard } from "@/components/ui/stat-card";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  getAccentThemeClasses,
  getBannerThemeClasses,
} from "@/lib/profile-personalisation";
import {
  isCorrectOutcomePrediction,
  isExactPrediction,
} from "@/lib/prediction-scoring";
import { getTournamentWinnerPickLockState } from "@/lib/tournament-winner-lock";

export const dynamic = "force-dynamic";

type ProfilePageProps = {
  params: Promise<{
    userId: string;
  }>;
};

type League = {
  id: string;
  name: string;
};

type Membership = {
  league_id: string;
  user_id: string;
  leagues?: League | League[] | null;
};

type FixtureResult = {
  status: string;
  stage: string | null;
  round_name: string | null;
  home_team_id: number | null;
  away_team_id: number | null;
  home_score: number | null;
  away_score: number | null;
  winning_team_id: number | null;
};

type Prediction = {
  user_id: string;
  predicted_home_score: number;
  predicted_away_score: number;
  predicted_advancing_team_id: number | null;
  points: number | null;
  fixtures: FixtureResult | FixtureResult[] | null;
};

type TournamentPick = {
  user_id: string;
  league_id: string;
  points: number | null;
  teams: TeamFlagData | TeamFlagData[] | null;
};

type LeagueAward = {
  id: string;
  competition_year: number;
  award_type: string;
  title: string;
  description: string | null;
  final_position: number | null;
  final_points: number | null;
  exact_scores: number | null;
  correct_outcomes: number | null;
  leagues: League | League[] | null;
};

type LeagueRankRow = {
  userId: string;
  displayName: string;
  totalPoints: number;
  exactScores: number;
  correctResults: number;
  rank?: number;
};

const awardIcons: Record<string, string> = {
  league_champion: "🏆",
  league_runner_up: "🥈",
  most_exact_scores: "🎯",
  best_accuracy: "🧠",
  longest_streak: "🔥",
  chaos_merchant: "🃏",
  safe_predictor: "🛡️",
};

const awardPriority: Record<string, number> = {
  league_champion: 0,
  most_exact_scores: 1,
  best_accuracy: 2,
  longest_streak: 3,
  chaos_merchant: 4,
  safe_predictor: 5,
};

function getAwardIcon(awardType: string) {
  return awardIcons[awardType] || "⭐";
}

function getInitials(displayName: string) {
  const initials = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "CC";
}

function formatJoinedDate(dateValue: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
  }).format(new Date(dateValue));
}

function getRelatedItem<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function ProfileAvatar({
  avatarUrl,
  displayName,
  compact = false,
  accentClassName =
    "border-emerald-400/25 bg-emerald-400/15 text-emerald-100",
}: {
  avatarUrl: string | null;
  displayName: string;
  compact?: boolean;
  accentClassName?: string;
}) {
  const classes = `${
    compact
      ? "flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border text-xl font-black shadow-lg"
      : "flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border text-3xl font-black shadow-xl sm:h-28 sm:w-28"
  } ${accentClassName}`;

  if (avatarUrl) {
    return (
      <div className={classes}>
        {/* Avatar hosts are user-configurable, so a native image is intentional. */}
        <img
          src={avatarUrl}
          alt={`${displayName} avatar`}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  return <div className={classes}>{getInitials(displayName)}</div>;
}

function ProfileUnavailable({ isAdmin }: { isAdmin: boolean }) {
  return (
    <AppShell isAdmin={isAdmin}>
      <PageHero
        eyebrow="Profile"
        title="Profile not available"
        description="This profile does not exist or is not available to your account."
        actions={
          <Button asChild variant="secondary">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to dashboard
            </Link>
          </Button>
        }
      />
    </AppShell>
  );
}

export default async function PublicProfilePage({ params }: ProfilePageProps) {
  const { userId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const winnerPickLock = await getTournamentWinnerPickLockState(supabase);

  const { data: viewerProfile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = viewerProfile?.is_admin === true;
  const adminSupabase = createAdminClient();

  const [targetProfileResult, targetMembershipResult, viewerMembershipResult] =
    await Promise.all([
      adminSupabase
        .from("profiles")
        .select(
          "id, display_name, avatar_url, profile_tagline, banner_theme, accent_theme, selected_title, favourite_team_id, created_at, is_admin"
        )
        .eq("id", userId)
        .maybeSingle(),
      adminSupabase
        .from("league_members")
        .select("league_id, user_id, leagues (id, name)")
        .eq("user_id", userId),
      adminSupabase
        .from("league_members")
        .select("league_id")
        .eq("user_id", user.id),
    ]);

  const targetProfile = targetProfileResult.data;
  const targetMemberships = (targetMembershipResult.data || []) as Membership[];
  const viewerLeagueIds = new Set(
    (viewerMembershipResult.data || []).map((membership) => membership.league_id)
  );
  const sharesLeague = targetMemberships.some((membership) =>
    viewerLeagueIds.has(membership.league_id)
  );
  const canView = user.id === userId || isAdmin || sharesLeague;

  if (!targetProfile || !canView) {
    return <ProfileUnavailable isAdmin={isAdmin} />;
  }

  const leagueIds = targetMemberships.map((membership) => membership.league_id);
  const { data: favouriteTeam } = targetProfile.favourite_team_id
    ? await adminSupabase
        .from("teams")
        .select("name, short_name, flag_emoji, flag_url")
        .eq("id", targetProfile.favourite_team_id)
        .maybeSingle()
    : { data: null };
  const allMembershipResult =
    leagueIds.length > 0
      ? await adminSupabase
          .from("league_members")
          .select("league_id, user_id")
          .in("league_id", leagueIds)
      : { data: [] };
  const allMemberships = (allMembershipResult.data || []) as Membership[];
  const memberUserIds = Array.from(
    new Set([userId, ...allMemberships.map((membership) => membership.user_id)])
  );

  const [
    predictionResult,
    tournamentPickResult,
    memberProfileResult,
    fixtureCountResult,
    awardResult,
  ] = await Promise.all([
      adminSupabase
        .from("predictions")
        .select(
          `
          user_id,
          predicted_home_score,
          predicted_away_score,
          predicted_advancing_team_id,
          points,
          fixtures (
            status,
            stage,
            round_name,
            home_team_id,
            away_team_id,
            home_score,
            away_score,
            winning_team_id
          )
        `
        )
        .in("user_id", memberUserIds),
      leagueIds.length > 0
        ? adminSupabase
            .from("tournament_picks")
            .select(
              `
              user_id,
              league_id,
              points,
              teams (
                name,
                short_name,
                flag_emoji,
                flag_url
              )
            `
            )
            .in("league_id", leagueIds)
        : Promise.resolve({ data: [] }),
      adminSupabase
        .from("profiles")
        .select("id, display_name")
        .in("id", memberUserIds),
      adminSupabase
        .from("fixtures")
        .select("id", { count: "exact", head: true })
        .not("home_team_id", "is", null)
        .not("away_team_id", "is", null),
      adminSupabase
        .from("league_awards")
        .select(
          `
          id,
          competition_year,
          award_type,
          title,
          description,
          final_position,
          final_points,
          exact_scores,
          correct_outcomes,
          leagues (
            id,
            name
          )
        `
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);

  const predictions = (predictionResult.data || []) as Prediction[];
  const tournamentPicks = (tournamentPickResult.data || []) as TournamentPick[];
  const awards = (awardResult.data || []) as LeagueAward[];
  const targetPredictions = predictions.filter(
    (prediction) => prediction.user_id === userId
  );
  const targetTournamentPicks = tournamentPicks.filter(
    (pick) => pick.user_id === userId
  );
  const profileNameMap = new Map(
    (memberProfileResult.data || []).map((profile) => [
      profile.id,
      profile.display_name || "Player",
    ])
  );
  const predictionsByUser = new Map<string, Prediction[]>();

  for (const prediction of predictions) {
    const existingPredictions = predictionsByUser.get(prediction.user_id) || [];
    existingPredictions.push(prediction);
    predictionsByUser.set(prediction.user_id, existingPredictions);
  }

  const tournamentPointsByLeagueAndUser = new Map<string, number>();

  for (const pick of tournamentPicks) {
    tournamentPointsByLeagueAndUser.set(
      `${pick.league_id}:${pick.user_id}`,
      pick.points || 0
    );
  }

  const predictionsMade = targetPredictions.length;
  const exactScores = targetPredictions.filter(
    (prediction) => prediction.points === 5
  ).length;
  const correctOutcomes = targetPredictions.filter(
    (prediction) =>
      (prediction.points || 0) > 0 && (prediction.points || 0) < 5
  ).length;
  const fixturePoints = targetPredictions.reduce(
    (sum, prediction) => sum + (prediction.points || 0),
    0
  );
  const tournamentPoints = targetTournamentPicks.reduce(
    (sum, pick) => sum + (pick.points || 0),
    0
  );
  const totalPoints = fixturePoints + tournamentPoints;
  const leagueWins = awards.filter(
    (award) => award.award_type === "league_champion"
  ).length;
  const eligibleFixtureCount = fixtureCountResult.count || 0;
  const completionPercentage =
    eligibleFixtureCount > 0
      ? Math.min(100, Math.round((predictionsMade / eligibleFixtureCount) * 100))
      : 0;

  const leaguePerformance = targetMemberships.flatMap((membership) => {
    const league = getRelatedItem(membership.leagues);

    if (!league) {
      return [];
    }

    const leagueMembers = allMemberships.filter(
      (member) => member.league_id === membership.league_id
    );
    let previousPoints: number | null = null;
    let currentRank = 0;
    const rankedRows: LeagueRankRow[] = leagueMembers
      .map((member) => {
        const memberPredictions = predictionsByUser.get(member.user_id) || [];
        const finishedPredictions = memberPredictions.filter((prediction) => {
          const fixture = getRelatedItem(prediction.fixtures);
          return fixture?.status === "finished";
        });
        const memberExactScores = finishedPredictions.filter((prediction) => {
          const fixture = getRelatedItem(prediction.fixtures);
          return fixture ? isExactPrediction(prediction, fixture) : false;
        }).length;
        const memberCorrectResults = finishedPredictions.filter((prediction) => {
          const fixture = getRelatedItem(prediction.fixtures);
          return fixture ? isCorrectOutcomePrediction(prediction, fixture) : false;
        }).length;
        const memberFixturePoints = memberPredictions.reduce(
          (sum, prediction) => sum + (prediction.points || 0),
          0
        );
        const memberTournamentPoints =
          tournamentPointsByLeagueAndUser.get(
            `${membership.league_id}:${member.user_id}`
          ) || 0;

        return {
          userId: member.user_id,
          displayName: profileNameMap.get(member.user_id) || "Player",
          totalPoints: memberFixturePoints + memberTournamentPoints,
          exactScores: memberExactScores,
          correctResults: memberCorrectResults,
        };
      })
      .sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores;
        if (b.correctResults !== a.correctResults) {
          return b.correctResults - a.correctResults;
        }

        return a.displayName.localeCompare(b.displayName);
      })
      .map((row) => {
        if (previousPoints === null || row.totalPoints !== previousPoints) {
          currentRank += 1;
        }

        previousPoints = row.totalPoints;
        return { ...row, rank: currentRank };
      });
    const targetRow = rankedRows.find((row) => row.userId === userId);
    const firstPlaceRow = rankedRows[0];
    const targetRank = targetRow?.rank;
    const nextPlaceRow = targetRank
      ? rankedRows.find((row) => row.rank === targetRank - 1)
      : undefined;

    return [
      {
        id: league.id,
        name: league.name,
        position: targetRow?.rank || null,
        memberCount: leagueMembers.length,
        gapToFirst:
          targetRow && firstPlaceRow && targetRow.rank !== 1
            ? firstPlaceRow.totalPoints - targetRow.totalPoints
            : null,
        gapToNext:
          targetRow && nextPlaceRow
            ? nextPlaceRow.totalPoints - targetRow.totalPoints
            : null,
      },
    ];
  });

  const rankedPositions = leaguePerformance
    .map((league) => league.position)
    .filter((position): position is number => position !== null);
  const bestLeaguePosition =
    rankedPositions.length > 0 ? Math.min(...rankedPositions) : null;
  const displayName = targetProfile.display_name || "Cup Clash Player";
  const winnerPick = targetTournamentPicks[0];
  const winnerTeam = getRelatedItem(winnerPick?.teams);
  const bannerClasses = getBannerThemeClasses(targetProfile.banner_theme);
  const accentClasses = getAccentThemeClasses(targetProfile.accent_theme);
  const avatarAccentClasses = `${accentClasses.border} ${accentClasses.surface} ${accentClasses.text}`;
  const featuredAwards = [...awards]
    .sort(
      (a, b) =>
        (awardPriority[a.award_type] ?? 6) -
        (awardPriority[b.award_type] ?? 6)
    )
    .slice(0, 3);
  const additionalAwardCount = Math.max(0, awards.length - featuredAwards.length);
  const profileStats = [
    {
      title: "Total points",
      value: totalPoints,
      description: "Predictions and picks",
      icon: <Trophy className="h-5 w-5" />,
    },
    {
      title: "Exact scores",
      value: exactScores,
      description: "Five-point picks",
      icon: <Target className="h-5 w-5" />,
    },
    {
      title: "Correct outcomes",
      value: correctOutcomes,
      description: "Scoring result picks",
      icon: <CheckCircle2 className="h-5 w-5" />,
    },
    {
      title: "Predictions made",
      value: predictionsMade,
      description: "Scorelines submitted",
      icon: <BarChart3 className="h-5 w-5" />,
    },
    {
      title: "Completion",
      value: `${completionPercentage}%`,
      description: `${eligibleFixtureCount} eligible fixtures`,
      icon: <Percent className="h-5 w-5" />,
    },
    {
      title: "Best position",
      value: bestLeaguePosition ? `#${bestLeaguePosition}` : "-",
      description: "Across current leagues",
      icon: <Medal className="h-5 w-5" />,
    },
    {
      title: "Leagues joined",
      value: leaguePerformance.length,
      description: "Current memberships",
      icon: <Users className="h-5 w-5" />,
    },
    {
      title: "League wins",
      value: leagueWins,
      description: "Champion awards",
      icon: <Crown className="h-5 w-5" />,
    },
  ];

  return (
    <AppShell isAdmin={isAdmin}>
      {/* Keep future public profile features compact and mobile-first. */}
      <div className="sm:hidden">
        <div className={`rounded-2xl border p-4 ${bannerClasses}`}>
          <div className="flex items-center gap-3">
            <ProfileAvatar
              avatarUrl={targetProfile.avatar_url}
              displayName={displayName}
              compact
              accentClassName={avatarAccentClasses}
            />

            <div className="min-w-0 flex-1">
              <p
                className={`text-[10px] font-bold uppercase tracking-[0.18em] ${accentClasses.text}`}
              >
                Player profile
              </p>
              <h1 className="mt-1 break-words text-2xl font-black leading-tight">
                {displayName}
              </h1>
              {targetProfile.profile_tagline && (
                <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-300">
                  {targetProfile.profile_tagline}
                </p>
              )}
              <p className="mt-1 text-xs leading-5 text-slate-400">
                Joined {formatJoinedDate(targetProfile.created_at)} ·{" "}
                {leaguePerformance.length}{" "}
                {leaguePerformance.length === 1 ? "league" : "leagues"}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${accentClasses.border} ${accentClasses.surface} ${accentClasses.text}`}
            >
              Cup Clash Player
            </span>
            {targetProfile.selected_title && (
              <AppBadge variant="gold">{targetProfile.selected_title}</AppBadge>
            )}
            {targetProfile.is_admin && (
              <AppBadge variant="gold">
                <Shield className="mr-1 h-3 w-3" />
                Admin
              </AppBadge>
            )}
          </div>

          {favouriteTeam && (
            <div
              className={`mt-3 flex items-center gap-3 rounded-xl border p-2.5 ${accentClasses.border} ${accentClasses.surface}`}
            >
              <TeamFlag team={favouriteTeam} size="sm" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Favourite team
                </p>
                <p className="truncate text-sm font-black">
                  {favouriteTeam.name}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="hidden sm:block">
        <div
          className={`overflow-hidden rounded-3xl border p-8 lg:p-10 ${bannerClasses}`}
        >
          <div className="flex items-end justify-between gap-8">
            <div className="min-w-0">
              <p
                className={`text-xs font-bold uppercase tracking-[0.24em] ${accentClasses.text}`}
              >
                Player profile
              </p>
              <h1 className="mt-4 break-words text-5xl font-bold leading-tight lg:text-6xl">
                {displayName}
              </h1>
              {targetProfile.profile_tagline && (
                <p className="mt-3 max-w-2xl text-lg leading-7 text-slate-200">
                  {targetProfile.profile_tagline}
                </p>
              )}
              <p className="mt-3 text-sm text-slate-400">
                Joined {formatJoinedDate(targetProfile.created_at)} |{" "}
                {leaguePerformance.length}{" "}
                {leaguePerformance.length === 1 ? "league" : "leagues"}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${accentClasses.border} ${accentClasses.surface} ${accentClasses.text}`}
                >
                  Cup Clash Player
                </span>
                {targetProfile.selected_title && (
                  <AppBadge variant="gold">
                    {targetProfile.selected_title}
                  </AppBadge>
                )}
                {targetProfile.is_admin && (
                  <AppBadge variant="gold">
                    <Shield className="mr-1 h-3 w-3" />
                    Admin
                  </AppBadge>
                )}
              </div>

              {favouriteTeam && (
                <div
                  className={`mt-4 inline-flex items-center gap-3 rounded-xl border px-3 py-2 ${accentClasses.border} ${accentClasses.surface}`}
                >
                  <TeamFlag team={favouriteTeam} size="sm" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      Favourite team
                    </p>
                    <p className="text-sm font-black">{favouriteTeam.name}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="shrink-0">
              <ProfileAvatar
                avatarUrl={targetProfile.avatar_url}
                displayName={displayName}
                accentClassName={avatarAccentClasses}
              />
            </div>
          </div>
        </div>
      </div>

      {featuredAwards.length > 0 && (
        <Card className="mt-4 pitch-card text-white sm:mt-6">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-300" />
                <h2 className="text-lg font-black tracking-tight sm:text-xl">
                  Achievement showcase
                </h2>
              </div>

              <Link
                href="#achievements"
                className="shrink-0 text-xs font-bold text-emerald-300 hover:text-emerald-200"
              >
                View all
              </Link>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {featuredAwards.map((award) => {
                const awardLeague = getRelatedItem(award.leagues);

                return (
                  <div
                    key={`featured-${award.id}`}
                    className="flex min-w-0 items-center gap-3 rounded-xl border border-yellow-300/20 bg-yellow-300/[0.08] p-3"
                  >
                    <span className="text-2xl" aria-hidden="true">
                      {getAwardIcon(award.award_type)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">
                        {award.title}
                      </p>
                      {awardLeague?.name && (
                        <p className="mt-0.5 truncate text-xs text-slate-400">
                          {awardLeague.name}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {additionalAwardCount > 0 && (
              <p className="mt-3 text-xs font-semibold text-slate-300">
                +{additionalAwardCount} more achievement
                {additionalAwardCount === 1 ? "" : "s"}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="mt-4 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:hidden">
        {profileStats.map((stat) => (
          <div
            key={stat.title}
            className="glass-card flex min-h-28 flex-col justify-between rounded-xl p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold leading-4 text-slate-300">
                {stat.title}
              </p>
              <div className="shrink-0 text-emerald-300">{stat.icon}</div>
            </div>
            <div>
              <p className="mt-3 text-2xl font-black">{stat.value}</p>
              <p className="mt-1 text-[11px] leading-4 text-slate-500">
                {stat.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 hidden gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-4">
        {profileStats.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            description={stat.description}
            icon={stat.icon}
          />
        ))}
      </div>

      <Card className="mt-8 glass-card text-white">
        <CardContent className="p-4 sm:p-8">
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-300" />
            <h2 className="text-xl font-black tracking-tight sm:text-2xl">
              League performance
            </h2>
          </div>

          {leaguePerformance.length === 0 ? (
            <p className="mt-5 text-slate-300">No league memberships yet.</p>
          ) : (
            <div className="mt-5 space-y-3">
              {leaguePerformance.map((league) => (
                <div
                  key={league.id}
                  className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 sm:p-5"
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-black sm:text-xl">
                        {league.name}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        Current position {league.position ? `#${league.position}` : "-"} of{" "}
                        {league.memberCount}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {league.position === 1 ? (
                          <AppBadge variant="gold">Top of the table</AppBadge>
                        ) : (
                          <>
                            {league.gapToFirst !== null && (
                              <AppBadge variant="muted">
                                {league.gapToFirst} {league.gapToFirst === 1 ? "pt" : "pts"} behind 1st
                              </AppBadge>
                            )}
                            {league.gapToNext !== null && (
                              <AppBadge variant="slate">
                                {league.gapToNext} {league.gapToNext === 1 ? "pt" : "pts"} behind next place
                              </AppBadge>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <Button asChild variant="secondary" size="sm" className="shrink-0">
                      <Link href={`/leagues/${league.id}`}>View league</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="pitch-card text-white">
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-center gap-2">
              <Crown className="h-6 w-6 text-yellow-300" />
              <h2 className="text-xl font-black tracking-tight sm:text-2xl">
                Tournament winner pick
              </h2>
            </div>

            <p className="mt-2 text-sm font-semibold text-yellow-100">
              <CountdownTimer locksAt={winnerPickLock.locksAt} />
            </p>

            {winnerPick && winnerTeam ? (
              <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-yellow-300/20 bg-yellow-300/10 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <TeamFlag team={winnerTeam} size="md" />
                  <div className="min-w-0">
                    <p className="truncate text-xl font-black">
                      {winnerTeam.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      {winnerTeam.short_name}
                    </p>
                  </div>
                </div>
                <AppBadge variant="gold">{winnerPick.points || 0} pts</AppBadge>
              </div>
            ) : (
              <p className="mt-5 text-slate-300">
                No tournament winner pick yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card id="achievements" className="glass-card scroll-mt-24 text-white">
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-center gap-2">
              <Award className="h-6 w-6 text-emerald-300" />
              <h2 className="text-xl font-black tracking-tight sm:text-2xl">
                Achievements
              </h2>
            </div>
            {awards.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center">
                <CalendarDays className="mx-auto h-8 w-8 text-slate-500" />
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Achievements will appear here as the tournament progresses.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {awards.map((award) => {
                  const awardLeague = getRelatedItem(award.leagues);

                  return (
                    <div
                      key={award.id}
                      className="rounded-2xl border border-yellow-300/20 bg-yellow-300/[0.07] p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-2xl">
                          <span aria-hidden="true">
                            {getAwardIcon(award.award_type)}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-black">
                            {award.title}
                          </h3>
                          <p className="mt-1 text-sm text-yellow-100/80">
                            {awardLeague?.name || "League"} ·{" "}
                            {award.competition_year}
                          </p>

                          {award.description && (
                            <p className="mt-3 text-sm leading-6 text-slate-300">
                              {award.description}
                            </p>
                          )}

                          <div className="mt-3 flex flex-wrap gap-2">
                            {award.final_position !== null && (
                              <AppBadge variant="gold">
                                Position #{award.final_position}
                              </AppBadge>
                            )}
                            {award.final_points !== null && (
                              <AppBadge variant="muted">
                                {award.final_points} pts
                              </AppBadge>
                            )}
                            {award.exact_scores !== null && (
                              <AppBadge variant="muted">
                                {award.exact_scores} exact
                              </AppBadge>
                            )}
                            {award.correct_outcomes !== null && (
                              <AppBadge variant="slate">
                                {award.correct_outcomes} outcomes
                              </AppBadge>
                            )}
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
      </div>
    </AppShell>
  );
}
