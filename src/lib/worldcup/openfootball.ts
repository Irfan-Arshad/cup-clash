const DEFAULT_OPENFOOTBALL_2026_URL =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

export type OpenFootballScore = {
  ft?: number[] | null;
  ht?: number[] | null;
};

export type OpenFootballMatch = {
  round?: string | null;
  num?: number | string | null;
  date?: string | null;
  time?: string | null;
  team1?: string | null;
  team2?: string | null;
  score?: OpenFootballScore | null;
  group?: string | null;
  ground?: string | null;
};

export type OpenFootballWorldCup = {
  name?: string | null;
  matches: OpenFootballMatch[];
};

export async function fetchOpenFootballWorldCup2026() {
  const url =
    process.env.OPENFOOTBALL_2026_URL || DEFAULT_OPENFOOTBALL_2026_URL;
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(
      `OpenFootball request failed with ${response.status} ${response.statusText}`
    );
  }

  const data: unknown = await response.json();

  if (
    !data ||
    typeof data !== "object" ||
    !Array.isArray((data as { matches?: unknown }).matches)
  ) {
    throw new Error("OpenFootball returned an invalid World Cup payload.");
  }

  return data as OpenFootballWorldCup;
}

export function isPlaceholderTeam(value: string) {
  const normalized = value.trim().toUpperCase();

  return (
    /^[123][A-L](?:\/[A-L])*$/.test(normalized) ||
    /^[WL]\d+$/.test(normalized)
  );
}

export function normaliseTeamName(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function parseOpenFootballKickoff(date: string, time?: string) {
  const dateValue = date.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return null;
  }

  if (!time?.trim()) {
    const parsedDate = new Date(`${dateValue}T00:00:00Z`);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  const match = time
    .trim()
    .match(
      /^(\d{1,2}):(\d{2})(?:\s*UTC(?:\s*)([+-])(\d{1,2})(?::?(\d{2}))?)?$/i
    );

  if (!match) {
    return null;
  }

  const [, hoursValue, minutesValue, sign, offsetHoursValue, offsetMinutesValue] =
    match;
  const hours = Number(hoursValue);
  const minutes = Number(minutesValue);
  const offsetHours = Number(offsetHoursValue || "0");
  const offsetMinutes = Number(offsetMinutesValue || "0");

  if (
    hours > 23 ||
    minutes > 59 ||
    offsetHours > 23 ||
    offsetMinutes > 59
  ) {
    return null;
  }

  const offset = sign
    ? `${sign}${String(offsetHours).padStart(2, "0")}:${String(
        offsetMinutes
      ).padStart(2, "0")}`
    : "Z";
  const parsedDate = new Date(
    `${dateValue}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:00${offset}`
  );

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}
