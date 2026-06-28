"use server";

import { createClient } from "@/lib/supabase/server";
import {
  areFixtureTeamsConfirmed,
  isKnockoutFixture,
} from "@/lib/fixtures";

export type SavePredictionState = {
  success?: string;
  error?: string;
  fixtureId?: number;
  predictedHomeScore?: number;
  predictedAwayScore?: number;
  predictedAdvancingTeamId?: number | null;
};

export async function savePrediction(
  _previousState: SavePredictionState,
  formData: FormData
): Promise<SavePredictionState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "You need to log in again.",
    };
  }

  const fixtureId = Number(formData.get("fixtureId"));
  const homeScore = Number(formData.get("homeScore"));
  const awayScore = Number(formData.get("awayScore"));
  const selectedAdvancingTeamId = Number(
    formData.get("predictedAdvancingTeamId")
  );

  if (!fixtureId || Number.isNaN(homeScore) || Number.isNaN(awayScore)) {
    return {
      error: "Invalid prediction.",
    };
  }

  if (homeScore < 0 || awayScore < 0) {
    return {
      error: "Scores cannot be negative.",
    };
  }

  const { data: fixture, error: fixtureError } = await supabase
    .from("fixtures")
    .select(
      "id, kickoff_at, stage, round_name, home_team_id, away_team_id, home_placeholder, away_placeholder, bracket_slot, next_match_number"
    )
    .eq("id", fixtureId)
    .single();

  if (fixtureError || !fixture) {
    return {
      error: "Fixture not found.",
    };
  }

  if (!areFixtureTeamsConfirmed(fixture)) {
    return {
      error: "Predictions open when both teams are confirmed.",
    };
  }

  const kickoffAt = new Date(fixture.kickoff_at);
  const now = new Date();

  if (kickoffAt <= now) {
    return {
      error: "Predictions are locked for this fixture.",
    };
  }

  let predictedAdvancingTeamId: number | null = null;

  if (isKnockoutFixture(fixture)) {
    if (homeScore > awayScore) {
      predictedAdvancingTeamId = fixture.home_team_id;
    } else if (awayScore > homeScore) {
      predictedAdvancingTeamId = fixture.away_team_id;
    } else if (
      selectedAdvancingTeamId === fixture.home_team_id ||
      selectedAdvancingTeamId === fixture.away_team_id
    ) {
      predictedAdvancingTeamId = selectedAdvancingTeamId;
    } else {
      return {
        error: "Choose who goes through for a knockout draw prediction.",
      };
    }
  }

  const { error } = await supabase.from("predictions").upsert(
    {
      fixture_id: fixtureId,
      user_id: user.id,
      predicted_home_score: homeScore,
      predicted_away_score: awayScore,
      predicted_advancing_team_id: predictedAdvancingTeamId,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "fixture_id,user_id",
    }
  );

  if (error) {
    return {
      error: error.message,
    };
  }

  return {
    success: "Prediction saved.",
    fixtureId,
    predictedHomeScore: homeScore,
    predictedAwayScore: awayScore,
    predictedAdvancingTeamId,
  };
}
