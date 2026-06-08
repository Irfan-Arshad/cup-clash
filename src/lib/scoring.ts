type ScoreInput = {
  predictedHome: number;
  predictedAway: number;
  actualHome: number;
  actualAway: number;
};

function getResult(home: number, away: number) {
  if (home > away) return "HOME";
  if (away > home) return "AWAY";
  return "DRAW";
}

export function calculatePredictionPoints({
  predictedHome,
  predictedAway,
  actualHome,
  actualAway,
}: ScoreInput) {
  const exactScore =
    predictedHome === actualHome && predictedAway === actualAway;

  if (exactScore) return 5;

  const predictedResult = getResult(predictedHome, predictedAway);
  const actualResult = getResult(actualHome, actualAway);

  if (predictedResult !== actualResult) return 0;

  const predictedGoalDifference = predictedHome - predictedAway;
  const actualGoalDifference = actualHome - actualAway;

  if (actualResult === "DRAW") return 3;

  if (predictedGoalDifference === actualGoalDifference) return 3;

  return 2;
}