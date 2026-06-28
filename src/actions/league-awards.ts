"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  calculateLeagueAwards,
  GENERATED_LEAGUE_AWARD_TYPES,
  LEAGUE_AWARD_COMPETITION_YEAR,
  type LeagueAwardMemberStats,
  type LeagueAwardPreview,
} from "@/lib/awards/league-awards";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isCorrectOutcomePrediction,
  isExactPrediction,
} from "@/lib/prediction-scoring";

export type LeagueAwardsActionResult = {
  awards: LeagueAwardPreview[];
  error?: string;
  success?: string;
  generatedCount?: number;
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

type PredictionRow = {
  user_id: string;
  predicted_home_score: number;
  predicted_away_score: number;
  predicted_advancing_team_id: number | null;
  points: number | null;
  fixtures: FixtureResult | FixtureResult[] | null;
};

function getRelatedItem<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function loadLeagueAwardPreview(): Promise<LeagueAwardPreview[]> {
  const supabase = createAdminClient();
  const [leagueResult, membershipResult] = await Promise.all([
    supabase.from("leagues").select("id, name").order("name"),
    supabase.from("league_members").select("league_id, user_id"),
  ]);

  if (leagueResult.error) throw new Error(leagueResult.error.message);
  if (membershipResult.error) throw new Error(membershipResult.error.message);

  const leagues = leagueResult.data || [];
  const memberships = membershipResult.data || [];
  const userIds = Array.from(
    new Set(memberships.map((membership) => membership.user_id))
  );
  const leagueIds = leagues.map((league) => league.id);

  if (userIds.length === 0 || leagueIds.length === 0) {
    return [];
  }

  const [profileResult, predictionResult, tournamentPickResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds),
      supabase
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
        .in("user_id", userIds),
      supabase
        .from("tournament_picks")
        .select("user_id, league_id, points")
        .in("league_id", leagueIds),
    ]);

  if (profileResult.error) throw new Error(profileResult.error.message);
  if (predictionResult.error) throw new Error(predictionResult.error.message);
  if (tournamentPickResult.error) {
    throw new Error(tournamentPickResult.error.message);
  }

  const predictions = (predictionResult.data || []) as PredictionRow[];
  const profileNameMap = new Map(
    (profileResult.data || []).map((profile) => [
      profile.id,
      profile.display_name || "Player",
    ])
  );
  const predictionsByUser = new Map<string, PredictionRow[]>();

  for (const prediction of predictions) {
    const userPredictions = predictionsByUser.get(prediction.user_id) || [];
    userPredictions.push(prediction);
    predictionsByUser.set(prediction.user_id, userPredictions);
  }

  const tournamentPointsMap = new Map(
    (tournamentPickResult.data || []).map((pick) => [
      `${pick.league_id}:${pick.user_id}`,
      pick.points || 0,
    ])
  );

  return leagues.flatMap((league) => {
    const leagueMembers = memberships.filter(
      (membership) => membership.league_id === league.id
    );
    const memberStats: LeagueAwardMemberStats[] = leagueMembers.map(
      (membership) => {
        const memberPredictions =
          predictionsByUser.get(membership.user_id) || [];
        const completedPredictions = memberPredictions.filter((prediction) => {
          const fixture = getRelatedItem(prediction.fixtures);
          return fixture?.status === "finished";
        });
        const exactScores = completedPredictions.filter((prediction) => {
          const fixture = getRelatedItem(prediction.fixtures);
          return fixture ? isExactPrediction(prediction, fixture) : false;
        }).length;
        const correctOutcomes = completedPredictions.filter((prediction) => {
          const fixture = getRelatedItem(prediction.fixtures);
          return fixture ? isCorrectOutcomePrediction(prediction, fixture) : false;
        }).length;
        const fixturePoints = memberPredictions.reduce(
          (sum, prediction) => sum + (prediction.points || 0),
          0
        );
        const completedPredictionPoints = completedPredictions.reduce(
          (sum, prediction) => sum + (prediction.points || 0),
          0
        );
        const tournamentPoints =
          tournamentPointsMap.get(`${league.id}:${membership.user_id}`) || 0;

        return {
          userId: membership.user_id,
          displayName: profileNameMap.get(membership.user_id) || "Player",
          totalPoints: fixturePoints + tournamentPoints,
          exactScores,
          correctOutcomes,
          completedPredictionCount: completedPredictions.length,
          completedPredictionPoints,
        };
      }
    );

    return calculateLeagueAwards({
      leagueId: league.id,
      leagueName: league.name,
      members: memberStats,
    });
  });
}

export async function previewLeagueAwards(): Promise<LeagueAwardsActionResult> {
  const admin = await requireAdmin();

  if (!admin) {
    return { awards: [], error: "Admin access required." };
  }

  try {
    const awards = await loadLeagueAwardPreview();
    return { awards };
  } catch (error) {
    return {
      awards: [],
      error:
        error instanceof Error ? error.message : "Could not preview awards.",
    };
  }
}

export async function generateLeagueAwards(): Promise<LeagueAwardsActionResult> {
  const admin = await requireAdmin();

  if (!admin) {
    return { awards: [], error: "Admin access required." };
  }

  try {
    const awards = await loadLeagueAwardPreview();
    const supabase = createAdminClient();
    const generatedTypes = [...GENERATED_LEAGUE_AWARD_TYPES];
    const { data: existingAwards, error: existingAwardsError } = await supabase
      .from("league_awards")
      .select("id, user_id, league_id, award_type")
      .eq("competition_year", LEAGUE_AWARD_COMPETITION_YEAR)
      .in("award_type", generatedTypes);

    if (existingAwardsError) throw new Error(existingAwardsError.message);

    if (awards.length > 0) {
      const { error: upsertError } = await supabase.from("league_awards").upsert(
        awards.map((award) => ({
          user_id: award.userId,
          league_id: award.leagueId,
          competition_year: award.competitionYear,
          award_type: award.awardType,
          title: award.title,
          description: award.description,
          final_position: award.finalPosition,
          final_points: award.finalPoints,
          exact_scores: award.exactScores,
          correct_outcomes: award.correctOutcomes,
        })),
        {
          onConflict: "user_id,league_id,competition_year,award_type",
        }
      );

      if (upsertError) throw new Error(upsertError.message);
    }

    const currentAwardKeys = new Set(
      awards.map(
        (award) =>
          `${award.userId}:${award.leagueId}:${award.competitionYear}:${award.awardType}`
      )
    );
    const staleAwardIds = (existingAwards || [])
      .filter(
        (award) =>
          !currentAwardKeys.has(
            `${award.user_id}:${award.league_id}:${LEAGUE_AWARD_COMPETITION_YEAR}:${award.award_type}`
          )
      )
      .map((award) => award.id);

    if (staleAwardIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("league_awards")
        .delete()
        .in("id", staleAwardIds);

      if (deleteError) throw new Error(deleteError.message);
    }

    revalidatePath("/admin");
    revalidatePath("/profile");
    revalidatePath("/leagues");

    for (const userId of new Set(awards.map((award) => award.userId))) {
      revalidatePath(`/profile/${userId}`);
    }

    for (const leagueId of new Set(awards.map((award) => award.leagueId))) {
      revalidatePath(`/leagues/${leagueId}`);
    }

    return {
      awards,
      generatedCount: awards.length,
      success: `${awards.length} award${awards.length === 1 ? "" : "s"} generated.`,
    };
  } catch (error) {
    return {
      awards: [],
      error:
        error instanceof Error ? error.message : "Could not generate awards.",
    };
  }
}
