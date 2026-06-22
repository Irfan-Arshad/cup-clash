import type { TeamFlagData } from "@/components/team/team-flag";

export type FixtureKnockoutFields = {
  home_team_id: number | null;
  away_team_id: number | null;
  home_placeholder: string | null;
  away_placeholder: string | null;
  bracket_slot: string | null;
  next_match_number: number | null;
};

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
