import { createAdminClient } from "@/lib/supabase/admin";
import {
  fetchOpenFootballWorldCup2026,
  isPlaceholderTeam,
  normaliseTeamName,
  parseOpenFootballKickoff,
  type OpenFootballMatch,
} from "@/lib/worldcup/openfootball";
import { isKnockoutFixture } from "@/lib/fixtures";
import { recalculateFixturePredictionPoints } from "@/lib/prediction-recalculation";

type Team = {
  id: number;
  name: string;
  short_name: string | null;
};

type Fixture = {
  id: number;
  match_number: number | null;
  stage: string | null;
  group_name: string | null;
  round_name: string | null;
  kickoff_at: string;
  venue: string | null;
  home_team_id: number | null;
  away_team_id: number | null;
  home_placeholder: string | null;
  away_placeholder: string | null;
  home_score: number | null;
  away_score: number | null;
  winning_team_id: number | null;
  decided_by: string | null;
  status: string | null;
};

export type WorldCupSyncSummary = {
  totalJsonMatches: number;
  matchedFixtures: number;
  scoresApplied: number;
  scoresSkipped: number;
  scoreConflicts: number;
  needingWinner: number;
  knockoutFixturesChecked: number;
  knockoutTeamsUpdated: number;
  errors: string[];
};

const teamAliasGroups = [
  ["United States", "USA"],
  ["Czech Republic", "Czechia"],
  ["Bosnia and Herzegovina", "Bosnia & Herzegovina"],
  ["Curaçao", "Curacao"],
  ["Congo DR", "DR Congo"],
  ["Côte d'Ivoire", "Ivory Coast"],
];

const teamAliasMap = new Map<string, string>();

teamAliasGroups.forEach(([canonicalName, ...aliases]) => {
  const canonicalKey = normaliseTeamName(canonicalName);
  teamAliasMap.set(canonicalKey, canonicalKey);
  aliases.forEach((alias) => {
    teamAliasMap.set(normaliseTeamName(alias), canonicalKey);
  });
});

function getTeamKey(value: string) {
  const normalized = normaliseTeamName(value);
  return teamAliasMap.get(normalized) || normalized;
}

function getGroupKey(value: string) {
  return normaliseTeamName(value).replace(/^group\s+/, "");
}

function getRoundName(value: string) {
  const normalized = normaliseTeamName(value);
  const roundAliases: Record<string, string> = {
    "quarter final": "Quarter-finals",
    "quarter finals": "Quarter-finals",
    "semi final": "Semi-finals",
    "semi finals": "Semi-finals",
    "match for third place": "Third place",
    "third place": "Third place",
  };

  return roundAliases[normalized] || value;
}

function getMatchNumber(value: OpenFootballMatch["num"]) {
  if (value === null || value === undefined || value === "") return null;

  const matchNumber = Number(value);
  return Number.isInteger(matchNumber) && matchNumber > 0 ? matchNumber : null;
}

function getFullTimeScore(match: OpenFootballMatch): [number, number] | null {
  const score = match.score?.ft;

  if (
    !Array.isArray(score) ||
    score.length < 2 ||
    !Number.isInteger(score[0]) ||
    !Number.isInteger(score[1]) ||
    score[0] < 0 ||
    score[1] < 0
  ) {
    return null;
  }

  return [score[0], score[1]];
}

function getPenaltyScore(match: OpenFootballMatch): [number, number] | null {
  const score = match.score?.pen || match.score?.p;

  if (
    !Array.isArray(score) ||
    score.length < 2 ||
    !Number.isInteger(score[0]) ||
    !Number.isInteger(score[1]) ||
    score[0] < 0 ||
    score[1] < 0 ||
    score[0] === score[1]
  ) {
    return null;
  }

  return [score[0], score[1]];
}

function getJsonWinnerName(match: OpenFootballMatch) {
  return (
    match.winner ||
    match.winnerTeam ||
    match.winner_team ||
    match.winningTeam ||
    match.winning_team ||
    null
  );
}

function getJsonKnockoutWinnerTeamId({
  match,
  fixture,
  teamByName,
  reverseScore,
}: {
  match: OpenFootballMatch;
  fixture: Fixture;
  teamByName: Map<string, Team>;
  reverseScore: boolean;
}) {
  const penaltyScore = getPenaltyScore(match);

  if (penaltyScore) {
    const [jsonHomePenalties, jsonAwayPenalties] = penaltyScore;
    const jsonWinnerSide =
      jsonHomePenalties > jsonAwayPenalties ? "home" : "away";
    const fixtureWinnerSide = reverseScore
      ? jsonWinnerSide === "home"
        ? "away"
        : "home"
      : jsonWinnerSide;

    return fixtureWinnerSide === "home"
      ? fixture.home_team_id
      : fixture.away_team_id;
  }

  const winnerName = getJsonWinnerName(match);

  if (!winnerName) return null;

  const winnerTeam = teamByName.get(getTeamKey(winnerName));

  if (!winnerTeam) return null;

  if (winnerTeam.id === fixture.home_team_id) return fixture.home_team_id;
  if (winnerTeam.id === fixture.away_team_id) return fixture.away_team_id;

  return null;
}

function hasChanged(
  fixture: Fixture,
  update: Record<string, string | number | null>
) {
  return Object.entries(update).some(([key, value]) => {
    const currentValue = fixture[key as keyof Fixture];

    if (
      key === "kickoff_at" &&
      typeof currentValue === "string" &&
      typeof value === "string"
    ) {
      return new Date(currentValue).getTime() !== new Date(value).getTime();
    }

    return currentValue !== value;
  });
}

export async function syncWorldCupData(): Promise<WorldCupSyncSummary> {
  const supabase = createAdminClient();
  const worldCup = await fetchOpenFootballWorldCup2026();

  const summary: WorldCupSyncSummary = {
    totalJsonMatches: worldCup.matches.length,
    matchedFixtures: 0,
    scoresApplied: 0,
    scoresSkipped: 0,
    scoreConflicts: 0,
    needingWinner: 0,
    knockoutFixturesChecked: 0,
    knockoutTeamsUpdated: 0,
    errors: [],
  };

  const { data: teamsData, error: teamsError } = await supabase
    .from("teams")
    .select("id, name, short_name");

  if (teamsError) {
    throw new Error(`Could not load teams: ${teamsError.message}`);
  }

  const teams = (teamsData || []) as Team[];
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const teamByName = new Map<string, Team>();

  teams.forEach((team) => {
    teamByName.set(getTeamKey(team.name), team);

    if (team.short_name) {
      teamByName.set(getTeamKey(team.short_name), team);
    }
  });

  const { data: fixturesData, error: fixturesError } = await supabase
    .from("fixtures")
    .select(
      "id, match_number, stage, group_name, round_name, kickoff_at, venue, home_team_id, away_team_id, home_placeholder, away_placeholder, home_score, away_score, winning_team_id, decided_by, status"
    );

  if (fixturesError) {
    throw new Error(`Could not load fixtures: ${fixturesError.message}`);
  }

  const fixtures = (fixturesData || []) as Fixture[];
  const fixturesByMatchNumber = new Map<number, Fixture>();

  fixtures.forEach((fixture) => {
    if (fixture.match_number !== null) {
      fixturesByMatchNumber.set(fixture.match_number, fixture);
    }
  });

  for (const match of worldCup.matches) {
    const matchNumber = getMatchNumber(match.num);
    let fixture: Fixture | undefined;
    let reverseScore = false;

    if (matchNumber !== null) {
      summary.knockoutFixturesChecked += 1;
      fixture = fixturesByMatchNumber.get(matchNumber);
    } else if (match.team1 && match.team2 && match.group) {
      const team1Key = getTeamKey(match.team1);
      const team2Key = getTeamKey(match.team2);
      const groupKey = getGroupKey(match.group);
      const candidates = fixtures.filter((candidate) => {
        if (!candidate.group_name || getGroupKey(candidate.group_name) !== groupKey) {
          return false;
        }

        const homeTeam = candidate.home_team_id
          ? teamById.get(candidate.home_team_id)
          : null;
        const awayTeam = candidate.away_team_id
          ? teamById.get(candidate.away_team_id)
          : null;

        if (!homeTeam || !awayTeam) return false;

        const homeKey = getTeamKey(homeTeam.name);
        const awayKey = getTeamKey(awayTeam.name);

        return (
          (homeKey === team1Key && awayKey === team2Key) ||
          (homeKey === team2Key && awayKey === team1Key)
        );
      });

      if (candidates.length > 1) {
        summary.errors.push(
          `Multiple fixtures matched ${match.team1} vs ${match.team2} in ${match.group}.`
        );
        continue;
      }

      fixture = candidates[0];

      if (fixture) {
        const homeTeam = fixture.home_team_id
          ? teamById.get(fixture.home_team_id)
          : null;
        reverseScore = Boolean(
          homeTeam && getTeamKey(homeTeam.name) === team2Key
        );
      }
    }

    if (!fixture) continue;
    summary.matchedFixtures += 1;

    if (matchNumber !== null) {
      const knockoutUpdate: Record<string, string | number | null> = {
        stage: "Knockout",
      };

      if (match.round) knockoutUpdate.round_name = getRoundName(match.round);
      if (match.ground) knockoutUpdate.venue = match.ground;

      if (match.date) {
        const kickoff = parseOpenFootballKickoff(
          match.date,
          match.time || undefined
        );

        if (kickoff) knockoutUpdate.kickoff_at = kickoff.toISOString();
      }

      let teamAssignmentChanged = false;

      const applyTeam = (side: "home" | "away", value?: string | null) => {
        if (!value) return;

        const teamIdKey = `${side}_team_id`;
        const placeholderKey = `${side}_placeholder`;

        if (isPlaceholderTeam(value)) {
          knockoutUpdate[teamIdKey] = null;
          knockoutUpdate[placeholderKey] = value;
          teamAssignmentChanged ||=
            fixture?.[teamIdKey as keyof Fixture] !== null ||
            fixture?.[placeholderKey as keyof Fixture] !== value;
          return;
        }

        const team = teamByName.get(getTeamKey(value));

        if (!team) {
          summary.errors.push(
            `No team record matched ${value} for knockout match ${matchNumber}.`
          );
          return;
        }

        knockoutUpdate[teamIdKey] = team.id;
        teamAssignmentChanged ||=
          fixture?.[teamIdKey as keyof Fixture] !== team.id;
      };

      applyTeam("home", match.team1);
      applyTeam("away", match.team2);

      if (hasChanged(fixture, knockoutUpdate)) {
        const { error: knockoutUpdateError } = await supabase
          .from("fixtures")
          .update(knockoutUpdate)
          .eq("id", fixture.id);

        if (knockoutUpdateError) {
          summary.errors.push(
            `Could not update knockout fixture ${fixture.id}: ${knockoutUpdateError.message}`
          );
        } else {
          Object.assign(fixture, knockoutUpdate);
          if (teamAssignmentChanged) summary.knockoutTeamsUpdated += 1;
        }
      }
    }

    const fullTimeScore = getFullTimeScore(match);
    if (!fullTimeScore) continue;

    const [jsonHomeScore, jsonAwayScore] = fullTimeScore;
    const homeScore = reverseScore ? jsonAwayScore : jsonHomeScore;
    const awayScore = reverseScore ? jsonHomeScore : jsonAwayScore;
    const knockoutFixture = isKnockoutFixture(fixture);
    let winningTeamId: number | null = null;
    let decidedBy: string | null = null;

    if (knockoutFixture) {
      if (homeScore > awayScore) {
        winningTeamId = fixture.home_team_id;
        decidedBy = "normal";
      } else if (awayScore > homeScore) {
        winningTeamId = fixture.away_team_id;
        decidedBy = "normal";
      } else {
        winningTeamId = getJsonKnockoutWinnerTeamId({
          match,
          fixture,
          teamByName,
          reverseScore,
        });
        decidedBy = winningTeamId ? "penalties" : null;
      }
    }

    const hasStoredScore =
      fixture.home_score !== null || fixture.away_score !== null;
    const hasSameScore =
      fixture.home_score === homeScore && fixture.away_score === awayScore;
    const hasSameWinner =
      !knockoutFixture ||
      (fixture.winning_team_id === winningTeamId &&
        fixture.decided_by === decidedBy);

    if (hasSameScore && hasSameWinner) {
      if (knockoutFixture && homeScore === awayScore && !winningTeamId) {
        summary.needingWinner += 1;
      }
      summary.scoresSkipped += 1;
      continue;
    }

    if (hasStoredScore && !hasSameScore) {
      summary.scoreConflicts += 1;

      if (process.env.AUTO_OVERWRITE_SCORES !== "true") {
        continue;
      }
    }

    const scoreUpdate: {
      home_score: number;
      away_score: number;
      status: "finished";
      winning_team_id?: number | null;
      decided_by?: string | null;
    } = {
      home_score: homeScore,
      away_score: awayScore,
      status: "finished",
    };

    if (knockoutFixture) {
      scoreUpdate.winning_team_id = winningTeamId;
      scoreUpdate.decided_by = decidedBy;

      if (homeScore === awayScore && !winningTeamId) {
        summary.needingWinner += 1;
      }
    }

    const { error: scoreUpdateError } = await supabase
      .from("fixtures")
      .update(scoreUpdate)
      .eq("id", fixture.id);

    if (scoreUpdateError) {
      summary.errors.push(
        `Could not apply score to fixture ${fixture.id}: ${scoreUpdateError.message}`
      );
      continue;
    }

    fixture.home_score = homeScore;
    fixture.away_score = awayScore;
    fixture.winning_team_id = winningTeamId;
    fixture.decided_by = decidedBy;
    fixture.status = "finished";
    summary.scoresApplied += 1;

    try {
      await recalculateFixturePredictionPoints(supabase, fixture.id);
    } catch (error) {
      summary.errors.push(
        `Score applied to fixture ${fixture.id}, but points recalculation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  return summary;
}
