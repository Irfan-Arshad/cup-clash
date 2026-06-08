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
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppShell } from "@/components/layout/app-shell";
import { PageHero } from "@/components/layout/page-hero";
import { Badge } from "@/components/ui/badge";

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
        flag_emoji
      ),
      away_team:teams!fixtures_away_team_id_fkey (
        name,
        short_name,
        flag_emoji
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

  const finishedPredictionsWithPoints =
    userPredictions?.filter((prediction) => (prediction.points || 0) > 0)
      .length || 0;

  const nextFixture = upcomingFixtures[0];

  const nextFixtureHomeTeam = nextFixture
    ? Array.isArray(nextFixture.home_team)
      ? nextFixture.home_team[0]
      : nextFixture.home_team
    : null;

  const nextFixtureAwayTeam = nextFixture
    ? Array.isArray(nextFixture.away_team)
      ? nextFixture.away_team[0]
      : nextFixture.away_team
    : null;

  const nextFixturePredicted = nextFixture
    ? predictionFixtureIds.has(nextFixture.id)
    : false;

  const displayName =
    profile?.display_name || user.user_metadata.display_name || "Player";

  const isAdmin = profile?.is_admin === true;

  return (
    <AppShell isAdmin={isAdmin}>
      <PageHero
        eyebrow="Dashboard"
        title={`Welcome, ${displayName}`}
        description="Your Cup Clash command centre. Check your leagues, track your predictions, and stay ahead of the group chat."
        actions={
          <div className="flex flex-col gap-3 sm:flex-row">
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

      <div className="mt-6 grid gap-4 md:grid-cols-3">
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

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
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
                    <Badge variant="outline">
                      Match {nextFixture.match_number}
                    </Badge>
                  )}

                  {nextFixture.group_name && (
                    <Badge variant="secondary">{nextFixture.group_name}</Badge>
                  )}

                  <Badge
                    className={
                      nextFixturePredicted
                        ? "border-emerald-400/20 bg-emerald-400/15 text-emerald-200 hover:bg-emerald-400/15"
                        : "border-yellow-300/20 bg-yellow-300/15 text-yellow-100 hover:bg-yellow-300/15"
                    }
                  >
                    {nextFixturePredicted ? "Predicted" : "Needs pick"}
                  </Badge>
                </div>

                <p className="mt-4 text-2xl font-black tracking-tight">
                  {nextFixtureHomeTeam?.flag_emoji} {nextFixtureHomeTeam?.name}{" "}
                  <span className="text-slate-500">vs</span>{" "}
                  {nextFixtureAwayTeam?.flag_emoji} {nextFixtureAwayTeam?.name}
                </p>

                <p className="mt-3 flex items-center gap-2 text-sm text-slate-400">
                  <CalendarDays className="h-4 w-4" />
                  {new Date(nextFixture.kickoff_at).toLocaleString("en-GB", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
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

      <div className="mt-10">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-black tracking-tight">
              Your leagues
            </h2>
            <p className="mt-1 text-sm text-slate-400">
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
            <CardContent className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <Trophy className="mb-4 h-12 w-12 text-yellow-300" />

              <h3 className="text-2xl font-black tracking-tight">
                No leagues yet
              </h3>

              <p className="mt-2 max-w-md text-slate-300">
                Start your first Cup Clash league and send the invite code to
                your group chat.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
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
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {leagues.map(({ role, league }) => (
              <Card
                key={league.id}
                className="pitch-card overflow-hidden text-white transition duration-200 hover:-translate-y-0.5 hover:bg-white/10"
              >
                <CardContent className="p-6">
                  <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-black tracking-tight">
                          {league.name}
                        </h3>

                        <Badge className="rounded-full border-white/15 bg-white/10 px-2.5 py-1 text-xs font-semibold capitalize text-slate-100 hover:bg-white/10">
                          {role}
                        </Badge>
                      </div>

                      <p className="mt-3 text-sm text-slate-400">
                        Invite code
                      </p>

                      <p className="mt-1 font-mono text-2xl font-black tracking-[0.2em] text-white">
                        {league.invite_code}
                      </p>
                    </div>

                    <Button asChild variant="secondary" size="sm">
                      <Link href={`/leagues/${league.id}`}>
                        Open
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Card className="mt-6 border-white/10 bg-white/[0.03] text-white">
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