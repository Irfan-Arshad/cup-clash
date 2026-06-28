import { isKnockoutFixture } from "@/lib/fixtures";

type FixtureForPredictionScoring = {
  stage?: string | null;
  round_name?: string | null;
  home_team_id: number | null;
  away_team_id: number | null;
  home_score: number | null;
  away_score: number | null;
  winning_team_id?: number | null;
};

type PredictionForScoring = {
  predicted_home_score: number;
  predicted_away_score: number;
  predicted_advancing_team_id?: number | null;
};

function getResult(home: number, away: number) {
  if (home > away) return "HOME";
  if (away > home) return "AWAY";
  return "DRAW";
}

export function getPredictedAdvancingTeamId(
  prediction: Pick<
    PredictionForScoring,
    | "predicted_home_score"
    | "predicted_away_score"
    | "predicted_advancing_team_id"
  >,
  fixture: Pick<FixtureForPredictionScoring, "home_team_id" | "away_team_id">
) {
  if (prediction.predicted_home_score > prediction.predicted_away_score) {
    return fixture.home_team_id;
  }

  if (prediction.predicted_away_score > prediction.predicted_home_score) {
    return fixture.away_team_id;
  }

  return prediction.predicted_advancing_team_id ?? null;
}

export function getActualWinningTeamId(
  fixture: Pick<
    FixtureForPredictionScoring,
    "home_team_id" | "away_team_id" | "home_score" | "away_score" | "winning_team_id"
  >
) {
  if (fixture.winning_team_id) return fixture.winning_team_id;

  if (fixture.home_score === null || fixture.away_score === null) {
    return null;
  }

  if (fixture.home_score > fixture.away_score) return fixture.home_team_id;
  if (fixture.away_score > fixture.home_score) return fixture.away_team_id;

  return null;
}

export function isExactPrediction(
  prediction: PredictionForScoring,
  fixture: FixtureForPredictionScoring
) {
  if (
    fixture.home_score === null ||
    fixture.away_score === null ||
    fixture.home_score !== prediction.predicted_home_score ||
    fixture.away_score !== prediction.predicted_away_score
  ) {
    return false;
  }

  if (
    isKnockoutFixture(fixture) &&
    fixture.home_score === fixture.away_score
  ) {
    const actualWinningTeamId = getActualWinningTeamId(fixture);
    const predictedAdvancingTeamId = getPredictedAdvancingTeamId(
      prediction,
      fixture
    );

    return (
      actualWinningTeamId !== null &&
      predictedAdvancingTeamId === actualWinningTeamId
    );
  }

  return true;
}

export function isCorrectOutcomePrediction(
  prediction: PredictionForScoring,
  fixture: FixtureForPredictionScoring
) {
  if (fixture.home_score === null || fixture.away_score === null) {
    return false;
  }

  if (isKnockoutFixture(fixture)) {
    const actualWinningTeamId = getActualWinningTeamId(fixture);
    const predictedAdvancingTeamId = getPredictedAdvancingTeamId(
      prediction,
      fixture
    );

    return (
      actualWinningTeamId !== null &&
      predictedAdvancingTeamId === actualWinningTeamId
    );
  }

  return (
    getResult(prediction.predicted_home_score, prediction.predicted_away_score) ===
    getResult(fixture.home_score, fixture.away_score)
  );
}

export function calculatePredictionPoints(
  prediction: PredictionForScoring,
  fixture: FixtureForPredictionScoring
) {
  if (fixture.home_score === null || fixture.away_score === null) {
    return 0;
  }

  if (isExactPrediction(prediction, fixture)) {
    return 5;
  }

  if (!isCorrectOutcomePrediction(prediction, fixture)) {
    return 0;
  }

  const predictedGoalDifference =
    prediction.predicted_home_score - prediction.predicted_away_score;
  const actualGoalDifference = fixture.home_score - fixture.away_score;

  if (predictedGoalDifference === actualGoalDifference) {
    return 3;
  }

  return 2;
}
