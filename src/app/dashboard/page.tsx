import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock,
  Plus,
  Sparkles,
  Target,
  Trophy,
  User,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/ui/stat-card";
import { AppBadge } from "@/components/ui/app-badge";
import { TeamFlag, type TeamFlagData } from "@/components/team/team-flag";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppShell } from "@/components/layout/app-shell";
import { PageHero } from "@/components/layout/page-hero";
import { CopyInviteCode } from "@/components/league/copy-invite-code";
import { formatUkKickoff } from "@/lib/format-date";

type Team = TeamFlagData;

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, is_admin")
    .eq("id", user.id)
    .single();

  const { data: memberships } = await supabase
    .from("league_members")
    .select(
      `
      role,
      leagues (
        id,
        name,
        invite_code,
        created_at
      )
    `
    )
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  const leagues =
    memberships
      ?.map((membership) => {
        const league = Array.isArray(membership.leagues)
          ? membership.leagues[0]
          : membership.leagues;

        return {
          role: membership.role,
          league,
        };
      })
      .filter((item) => item.league) || [];

  const { data: fixtures } = await supabase
    .from("fixtures")
    .select(
      `
      id,
      kickoff_at,
      status,
      match_number,
      group_name,
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

  const { data: userPredictions } =
    fixtureIds.length > 0
      ? await supabase
          .from("predictions")
          .select("fixture_id, points")
          .eq("user_id", user.id)
          .in("fixture_id", fixtureIds)
      : { data: [] };

  const predictionFixtureIds = new Set(
    userPredictions?.map((prediction) => prediction.fixture_id) || []
  );

  const upcomingFixtures =
    fixtures?.filter((fixture) => new Date(fixture.kickoff_at) > new Date()) ||
    [];

  const missingPredictions = upcomingFixtures.filter(
    (fixture) => !predictionFixtureIds.has(fixture.id)
  ).length;

  const predictionsMade = userPredictions?.length || 0;

  const totalPoints =
    userPredictions?.reduce(
      (sum, prediction) => sum + (prediction.points || 0),
      0
    ) || 0;

  const nextFixture = upcomingFixtures[0];

  const nextFixtureHomeTeam = nextFixture
    ? (Array.isArray(nextFixture.home_team)
        ? nextFixture.home_team[0]
        : nextFixture.home_team) as Team | null
    : null;

  const nextFixtureAwayTeam = nextFixture
    ? (Array.isArray(nextFixture.away_team)
        ? nextFixture.away_team[0]
        : nextFixture.away_team) as Team | null
    : null;

  const nextFixturePredicted = nextFixture
    ? predictionFixtureIds.has(nextFixture.id)
    : false;

  const displayName =
    profile?.display_name || user.user_metadata.display_name || "Player";

  const isAdmin = profile?.is_admin === true;

  return (
    <AppShell isAdmin={isAdmin}>
      <div className="sm:hidden">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-white">
          <h1 className="text-2xl font-black tracking-tight">Dashboard</h1>
          <p className="mt-2 text-sm text-slate-300">
            Your Cup Clash home.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Button asChild className="h-10 px-2 text-xs">
            <Link href="/fixtures">Predict fixtures</Link>
          </Button>

          <Button asChild variant="secondary" className="h-10 px-2 text-xs">
            <Link href="/leagues/join">Join league</Link>
          </Button>

          <Button asChild variant="secondary" className="h-10 px-2 text-xs">
            <Link href="/leagues/new">Create league</Link>
          </Button>
        </div>
      </div>

      <div className="hidden sm:block">
        <PageHero
          eyebrow="Dashboard"
          title={`Welcome, ${displayName}`}
          description="Your Cup Clash command centre. Check your leagues, track your predictions, and stay ahead of the group chat."
          actions={
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="secondary">
                <Link href="/profile">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </Button>

              <Button asChild variant="secondary">
                <Link href="/leagues/join">Join league</Link>
              </Button>

              <Button asChild>
                <Link href="/leagues/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create league
                </Link>
              </Button>
            </div>
          }
        />
      </div>

      <Card className="mt-4 fixture-card text-white sm:hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-emerald-300" />
              <h2 className="text-lg font-black tracking-tight">
                Next fixture
              </h2>
            </div>

            {nextFixture && (
              <AppBadge variant={nextFixturePredicted ? "emerald" : "gold"}>
                {nextFixturePredicted ? "Predicted" : "Needs pick"}
              </AppBadge>
            )}
          </div>

          {nextFixture ? (
            <div className="mt-4">
              <div className="flex flex-wrap items-center gap-2">
                {nextFixture.match_number && (
                  <AppBadge variant="muted">
                    Match {nextFixture.match_number}
                  </AppBadge>
                )}

                {nextFixture.group_name && (
                  <AppBadge variant="slate">{nextFixture.group_name}</AppBadge>
                )}
              </div>

              <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <TeamFlag team={nextFixtureHomeTeam} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                      {nextFixtureHomeTeam?.short_name}
                    </p>
                    <p className="mt-1 truncate text-sm font-black">
                      {nextFixtureHomeTeam?.name}
                    </p>
                  </div>
                </div>

                <div className="rounded-full border border-white/10 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-950">
                  vs
                </div>

                <div className="flex min-w-0 items-center justify-end gap-2 text-right">
                  <div className="order-2">
                    <TeamFlag team={nextFixtureAwayTeam} size="sm" />
                  </div>
                  <div className="order-1 min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                      {nextFixtureAwayTeam?.short_name}
                    </p>
                    <p className="mt-1 truncate text-sm font-black">
                      {nextFixtureAwayTeam?.name}
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-4 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200">
                <CalendarDays className="h-4 w-4" />
                {formatUkKickoff(nextFixture.kickoff_at)}
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-slate-400">
              No upcoming fixtures are currently available.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:hidden">
        <Card className="glass-card text-white">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-slate-300">My leagues</p>
            <p className="mt-3 text-2xl font-black">{leagues.length}</p>
          </CardContent>
        </Card>

        <Card className="glass-card text-white">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-slate-300">Predictions</p>
            <p className="mt-3 text-2xl font-black">{predictionsMade}</p>
          </CardContent>
        </Card>

        <Card className="glass-card text-white">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-slate-300">Points</p>
            <p className="mt-3 text-2xl font-black">{totalPoints}</p>
          </CardContent>
        </Card>

        <Card
          className={
            missingPredictions > 0
              ? "gold-card text-white"
              : "glass-card text-white"
          }
        >
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-slate-300">
              Still to pick
            </p>
            <p className="mt-3 text-2xl font-black">{missingPredictions}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 hidden gap-4 sm:grid md:grid-cols-3">
        <StatCard
          title="My leagues"
          value={leagues.length}
          description="Prediction leagues you have joined."
          icon={<Users className="h-5 w-5" />}
        />

        <StatCard
          title="Predictions made"
          value={predictionsMade}
          description="Scoreline predictions submitted."
          icon={<Target className="h-5 w-5" />}
        />

        <StatCard
          title="Current points"
          value={totalPoints}
          description="Points earned from fixtures and bonus picks."
          icon={<BarChart3 className="h-5 w-5" />}
        />
      </div>

      <div className="mt-6 hidden gap-6 sm:grid lg:grid-cols-[1.1fr_0.9fr]">
        <Card
          className={
            missingPredictions > 0
              ? "gold-card text-white"
              : "pitch-card text-white"
          }
        >
          <CardContent className="flex flex-col justify-between gap-5 p-6 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                {missingPredictions > 0 ? (
                  <Sparkles className="h-6 w-6 text-yellow-300" />
                ) : (
                  <CheckCircle2 className="h-6 w-6 text-emerald-300" />
                )}

                <h2 className="text-xl font-black tracking-tight">
                  {missingPredictions > 0
                    ? "Predictions still needed"
                    : "You’re all caught up"}
                </h2>
              </div>

              <p className="mt-2 text-sm leading-6 text-slate-300 sm:text-base">
                {missingPredictions > 0 ? (
                  <>
                    You have{" "}
                    <span className="font-bold text-white">
                      {missingPredictions}
                    </span>{" "}
                    upcoming fixture
                    {missingPredictions === 1 ? "" : "s"} left to predict.
                  </>
                ) : (
                  "You have predicted every currently available upcoming fixture."
                )}
              </p>
            </div>

            <Button asChild className="sm:shrink-0">
              <Link href="/fixtures">
                {missingPredictions > 0 ? "Predict now" : "View fixtures"}
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="fixture-card text-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Clock className="h-6 w-6 text-emerald-300" />
              <h2 className="text-xl font-black tracking-tight">
                Next fixture
              </h2>
            </div>

            {nextFixture ? (
              <div className="mt-5">
                <div className="flex flex-wrap items-center gap-2">
                  {nextFixture.match_number && (
                    <AppBadge variant="muted">
                      Match {nextFixture.match_number}
                    </AppBadge>
                  )}

                  {nextFixture.group_name && (
                    <AppBadge variant="slate">
                      {nextFixture.group_name}
                    </AppBadge>
                  )}

                  <AppBadge variant={nextFixturePredicted ? "emerald" : "gold"}>
                    {nextFixturePredicted ? "Predicted" : "Needs pick"}
                  </AppBadge>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                  <div className="flex items-center gap-3">
                    <TeamFlag team={nextFixtureHomeTeam} size="sm" />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                        {nextFixtureHomeTeam?.short_name}
                      </p>
                      <p className="mt-1 text-lg font-black">
                        {nextFixtureHomeTeam?.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-start sm:justify-center">
                    <div className="rounded-full border border-white/10 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-[0.24em] text-slate-950">
                      vs
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:justify-end sm:text-right">
                    <div className="sm:order-2">
                      <TeamFlag team={nextFixtureAwayTeam} size="sm" />
                    </div>
                    <div className="sm:order-1">
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                        {nextFixtureAwayTeam?.short_name}
                      </p>
                      <p className="mt-1 text-lg font-black">
                        {nextFixtureAwayTeam?.name}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="mt-5 flex items-center gap-2 text-sm text-slate-400">
                  <CalendarDays className="h-4 w-4" />
                  {formatUkKickoff(nextFixture.kickoff_at)}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-slate-400">
                No upcoming fixtures are currently available.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 sm:mt-10">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-black tracking-tight sm:text-2xl">
              Your leagues
            </h2>
            <p className="mt-1 hidden text-sm text-slate-400 sm:block">
              Open a league to view the leaderboard, winner picks, and
              prediction breakdowns.
            </p>
          </div>

          <Button asChild variant="secondary" size="sm">
            <Link href="/leagues/new">
              <Plus className="mr-2 h-4 w-4" />
              New league
            </Link>
          </Button>
        </div>

        {leagues.length === 0 ? (
          <Card className="mt-5 border-dashed border-white/10 bg-white/[0.03] text-white">
            <CardContent className="flex flex-col items-center justify-center px-4 py-8 text-center sm:px-6 sm:py-12">
              <Trophy className="mb-3 h-10 w-10 text-yellow-300 sm:mb-4 sm:h-12 sm:w-12" />

              <h3 className="text-xl font-black tracking-tight sm:text-2xl">
                No leagues yet
              </h3>

              <p className="mt-2 max-w-md text-slate-300">
                Start your first Cup Clash league and send the invite code to
                your group chat.
              </p>

              <div className="mt-5 flex flex-col gap-3 sm:mt-6 sm:flex-row">
                <Button asChild variant="secondary">
                  <Link href="/leagues/join">Join a league</Link>
                </Button>

                <Button asChild>
                  <Link href="/leagues/new">Create your first league</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-3 grid gap-3 sm:mt-5 sm:gap-4 md:grid-cols-2">
            {leagues.map(({ role, league }) => (
              <Card
                key={league.id}
                className="pitch-card overflow-hidden text-white transition duration-200 hover:-translate-y-0.5 hover:bg-white/10"
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col justify-between gap-4 sm:gap-5 sm:flex-row sm:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-lg font-black tracking-tight sm:text-xl">
                          {league.name}
                        </h3>

                        <AppBadge
                          variant={role === "owner" ? "gold" : "muted"}
                          className="capitalize"
                        >
                          {role}
                        </AppBadge>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <AppBadge variant="emerald">
                          {totalPoints} pts
                        </AppBadge>
                        <AppBadge variant="muted">
                          {predictionsMade} picks
                        </AppBadge>
                      </div>

                      <p className="mt-3 text-xs text-slate-400 sm:text-sm">
                        Invite code
                      </p>

                      <p className="mt-1 font-mono text-lg font-black tracking-[0.16em] text-white sm:text-2xl sm:tracking-[0.2em]">
                        {league.invite_code}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-col sm:items-end">
                      <CopyInviteCode
                        inviteCode={league.invite_code}
                        leagueName={league.name}
                        size="sm"
                      />

                      <Button asChild variant="secondary" size="sm">
                        <Link href={`/leagues/${league.id}`}>
                          Open
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Card className="mt-6 hidden border-white/10 bg-white/[0.03] text-white sm:block">
        <CardContent className="grid gap-4 p-6 text-sm text-slate-300 md:grid-cols-3">
          <div>
            <p className="font-bold text-white">Exact score</p>
            <p className="mt-1">Earn 5 points for getting the full scoreline.</p>
          </div>

          <div>
            <p className="font-bold text-white">Correct outcome</p>
            <p className="mt-1">Still pick up points for backing the result.</p>
          </div>

          <div>
            <p className="font-bold text-white">Winner bonus</p>
            <p className="mt-1">Tournament winner picks can swing the table.</p>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
