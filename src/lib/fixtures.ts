import type { TeamFlagData } from "@/components/team/team-flag";

export type FixtureKnockoutFields = {
  home_team_id: number | null;
  away_team_id: number | null;
  home_placeholder: string | null;
  away_placeholder: string | null;
  bracket_slot: string | null;
  next_match_number: number | null;
  stage?: string | null;
  round_name?: string | null;
};

export const knockoutRoundOrder = [
  "Round of 32",
  "Round of 16",
  "Quarter-finals",
  "Semi-finals",
  "Third place",
  "Final",
] as const;

export function getFixtureTeamName(
  team: TeamFlagData | null,
  placeholder: string | null
) {
  return team?.name || placeholder || "Team TBC";
}

export function areFixtureTeamsConfirmed(
  fixture: Pick<FixtureKnockoutFields, "home_team_id" | "away_team_id">
) {
  return fixture.home_team_id !== null && fixture.away_team_id !== null;
}

export function getKnockoutRoundName(roundName: string | null | undefined) {
  const normalized = roundName
    ?.toLowerCase()
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const aliases: Record<string, (typeof knockoutRoundOrder)[number]> = {
    "round of 32": "Round of 32",
    "round of 16": "Round of 16",
    "quarter final": "Quarter-finals",
    "quarter finals": "Quarter-finals",
    "quarter-final": "Quarter-finals",
    "quarter-finals": "Quarter-finals",
    quarterfinal: "Quarter-finals",
    quarterfinals: "Quarter-finals",
    "semi final": "Semi-finals",
    "semi finals": "Semi-finals",
    "semi-final": "Semi-finals",
    "semi-finals": "Semi-finals",
    semifinal: "Semi-finals",
    semifinals: "Semi-finals",
    "match for third place": "Third place",
    "third place": "Third place",
    "third place play off": "Third place",
    "third place playoff": "Third place",
    final: "Final",
  };

  return (normalized && aliases[normalized]) || roundName || "Knockouts";
}

export function isKnockoutFixture(
  fixture: Pick<FixtureKnockoutFields, "stage" | "round_name">
) {
  const stage = fixture.stage?.toLowerCase();
  const isKnockoutStage = stage === "knockout" || stage === "knockouts";
  const roundName = getKnockoutRoundName(fixture.round_name);
  const isKnockoutRound = knockoutRoundOrder.some(
    (knockoutRoundName) => knockoutRoundName === roundName
  );

  return isKnockoutStage || isKnockoutRound;
}
