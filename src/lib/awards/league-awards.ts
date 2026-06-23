export const LEAGUE_AWARD_COMPETITION_YEAR = 2026;

export const GENERATED_LEAGUE_AWARD_TYPES = [
  "league_champion",
  "league_runner_up",
  "most_exact_scores",
  "best_accuracy",
] as const;

export type GeneratedLeagueAwardType =
  (typeof GENERATED_LEAGUE_AWARD_TYPES)[number];

export type LeagueAwardMemberStats = {
  userId: string;
  displayName: string;
  totalPoints: number;
  exactScores: number;
  correctOutcomes: number;
  completedPredictionCount: number;
  completedPredictionPoints: number;
};

export type LeagueAwardPreview = {
  userId: string;
  displayName: string;
  leagueId: string;
  leagueName: string;
  competitionYear: number;
  awardType: GeneratedLeagueAwardType;
  title: string;
  description: string;
  finalPosition: number;
  finalPoints: number;
  exactScores: number;
  correctOutcomes: number;
};

type RankedMember = LeagueAwardMemberStats & {
  rank: number;
};

type CalculateLeagueAwardsInput = {
  leagueId: string;
  leagueName: string;
  members: LeagueAwardMemberStats[];
};

function rankLeagueMembers(
  members: LeagueAwardMemberStats[]
): RankedMember[] {
  let previousPoints: number | null = null;
  let currentRank = 0;

  return [...members]
    .sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores;
      if (b.correctOutcomes !== a.correctOutcomes) {
        return b.correctOutcomes - a.correctOutcomes;
      }

      return a.displayName.localeCompare(b.displayName);
    })
    .map((member) => {
      if (previousPoints === null || member.totalPoints !== previousPoints) {
        currentRank += 1;
      }

      previousPoints = member.totalPoints;
      return { ...member, rank: currentRank };
    });
}

function createAward(
  member: RankedMember,
  input: CalculateLeagueAwardsInput,
  awardType: GeneratedLeagueAwardType,
  title: string,
  description: string
): LeagueAwardPreview {
  return {
    userId: member.userId,
    displayName: member.displayName,
    leagueId: input.leagueId,
    leagueName: input.leagueName,
    competitionYear: LEAGUE_AWARD_COMPETITION_YEAR,
    awardType,
    title,
    description,
    finalPosition: member.rank,
    finalPoints: member.totalPoints,
    exactScores: member.exactScores,
    correctOutcomes: member.correctOutcomes,
  };
}

export function calculateLeagueAwards(
  input: CalculateLeagueAwardsInput
): LeagueAwardPreview[] {
  const rankedMembers = rankLeagueMembers(input.members);

  if (rankedMembers.length === 0) {
    return [];
  }

  const awards: LeagueAwardPreview[] = [];

  for (const member of rankedMembers.filter((row) => row.rank === 1)) {
    awards.push(
      createAward(
        member,
        input,
        "league_champion",
        "Cup Clash 2026 Champion",
        `Finished top of the ${input.leagueName} league.`
      )
    );
  }

  for (const member of rankedMembers.filter((row) => row.rank === 2)) {
    awards.push(
      createAward(
        member,
        input,
        "league_runner_up",
        "Runner-up",
        `Finished second in the ${input.leagueName} league.`
      )
    );
  }

  const highestExactScoreCount = Math.max(
    ...rankedMembers.map((member) => member.exactScores)
  );

  for (const member of rankedMembers.filter(
    (row) => row.exactScores === highestExactScoreCount
  )) {
    awards.push(
      createAward(
        member,
        input,
        "most_exact_scores",
        "Sniper",
        `Recorded the most exact score predictions in ${input.leagueName}.`
      )
    );
  }

  const accuracyCandidates = rankedMembers.filter(
    (member) => member.completedPredictionCount > 0
  );
  const accuracyLeader = [...accuracyCandidates].sort(
    (a, b) =>
      b.completedPredictionPoints / b.completedPredictionCount -
      a.completedPredictionPoints / a.completedPredictionCount
  )[0];

  if (accuracyLeader) {
    const bestAccuracyMembers = accuracyCandidates.filter(
      (member) =>
        member.completedPredictionPoints *
          accuracyLeader.completedPredictionCount ===
        accuracyLeader.completedPredictionPoints *
          member.completedPredictionCount
    );

    for (const member of bestAccuracyMembers) {
      awards.push(
        createAward(
          member,
          input,
          "best_accuracy",
          "Oracle",
          `Showed the best overall prediction accuracy in ${input.leagueName}.`
        )
      );
    }
  }

  return awards;
}
