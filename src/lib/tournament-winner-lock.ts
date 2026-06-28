import { createClient } from "@/lib/supabase/server";

const TOURNAMENT_WINNER_PICK_LOCK_KEY = "tournament_winner_pick_locks_at";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type TournamentWinnerPickLockState = {
  locksAt: string | null;
  isLocked: boolean;
};

export async function getTournamentWinnerPickLockState(
  supabase: SupabaseServerClient
): Promise<TournamentWinnerPickLockState> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", TOURNAMENT_WINNER_PICK_LOCK_KEY)
    .maybeSingle();

  const locksAt = data?.value || null;
  const lockTime = locksAt ? new Date(locksAt) : null;
  const isLocked = Boolean(
    lockTime &&
      !Number.isNaN(lockTime.getTime()) &&
      Date.now() >= lockTime.getTime()
  );

  return {
    locksAt,
    isLocked,
  };
}
