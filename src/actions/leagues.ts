"use server";

import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createLeague(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const name = String(formData.get("name") || "").trim();

  if (!name) {
    redirect("/leagues/new?error=League name is required");
  }

  const inviteCode = nanoid(8).toUpperCase();

  const { data: league, error: leagueError } = await supabase
    .from("leagues")
    .insert({
      name,
      invite_code: inviteCode,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (leagueError || !league) {
    redirect(
      `/leagues/new?error=${encodeURIComponent(
        leagueError?.message || "Could not create league"
      )}`
    );
  }

  const { error: memberError } = await supabase.from("league_members").insert({
    league_id: league.id,
    user_id: user.id,
    role: "owner",
  });

  if (memberError) {
    redirect(
      `/leagues/new?error=${encodeURIComponent(
        memberError.message || "League created but owner could not be added"
      )}`
    );
  }

  revalidatePath("/dashboard");
  revalidatePath("/leagues");

  redirect(`/leagues/${league.id}`);
}

export async function joinLeague(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const inviteCode = String(formData.get("inviteCode") || "")
    .trim()
    .toUpperCase();

  if (!inviteCode) {
    redirect("/leagues/join?error=Invite code is required");
  }

  const { data: leagueId, error } = await supabase.rpc(
    "join_league_by_invite_code",
    {
      invite_code_input: inviteCode,
    }
  );

  if (error || !leagueId) {
    redirect(
      `/leagues/join?error=${encodeURIComponent(
        error?.message || "Could not join league"
      )}`
    );
  }

  revalidatePath("/dashboard");
  revalidatePath("/leagues");

  redirect(`/leagues/${leagueId}`);
}