"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  isAccentTheme,
  isBannerTheme,
} from "@/lib/profile-personalisation";

export async function updateDisplayName(formData: FormData) {
  const displayName = String(formData.get("displayName") || "").trim();

  if (!displayName) {
    redirect("/profile?error=Display%20name%20is%20required");
  }

  if (displayName.length < 2) {
    redirect("/profile?error=Display%20name%20must%20be%20at%20least%202%20characters");
  }

  if (displayName.length > 40) {
    redirect("/profile?error=Display%20name%20must%20be%2040%20characters%20or%20less");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
    })
    .eq("id", user.id);

  if (error) {
    redirect(
      `/profile?error=${encodeURIComponent("Could not update display name")}`
    );
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/fixtures");
  revalidatePath("/leagues");

  redirect("/profile?success=Display%20name%20updated");
}

export async function updateProfilePersonalisation(formData: FormData) {
  const displayName = String(formData.get("displayName") || "").trim();
  const avatarUrl = String(formData.get("avatarUrl") || "").trim();
  const profileTagline = String(formData.get("profileTagline") || "").trim();
  const bannerTheme = String(formData.get("bannerTheme") || "");
  const accentTheme = String(formData.get("accentTheme") || "");
  const favouriteTeamValue = String(formData.get("favouriteTeamId") || "none");

  if (!displayName) {
    redirect("/profile?error=Display%20name%20is%20required");
  }

  if (displayName.length > 40) {
    redirect(
      "/profile?error=Display%20name%20must%20be%2040%20characters%20or%20less"
    );
  }

  if (profileTagline.length > 80) {
    redirect(
      "/profile?error=Profile%20tagline%20must%20be%2080%20characters%20or%20less"
    );
  }

  if (avatarUrl) {
    let parsedAvatarUrl: URL;

    try {
      parsedAvatarUrl = new URL(avatarUrl);
    } catch {
      redirect("/profile?error=Avatar%20URL%20must%20be%20a%20valid%20URL");
    }

    if (!["http:", "https:"].includes(parsedAvatarUrl.protocol)) {
      redirect("/profile?error=Avatar%20URL%20must%20use%20http%20or%20https");
    }
  }

  if (!isBannerTheme(bannerTheme)) {
    redirect("/profile?error=Invalid%20banner%20theme");
  }

  if (!isAccentTheme(accentTheme)) {
    redirect("/profile?error=Invalid%20accent%20theme");
  }

  const favouriteTeamId =
    favouriteTeamValue === "none" ? null : Number(favouriteTeamValue);

  if (
    favouriteTeamId !== null &&
    (!Number.isInteger(favouriteTeamId) || favouriteTeamId <= 0)
  ) {
    redirect("/profile?error=Invalid%20favourite%20team");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  if (favouriteTeamId !== null) {
    const { data: favouriteTeam } = await supabase
      .from("teams")
      .select("id")
      .eq("id", favouriteTeamId)
      .maybeSingle();

    if (!favouriteTeam) {
      redirect("/profile?error=Favourite%20team%20was%20not%20found");
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      avatar_url: avatarUrl || null,
      profile_tagline: profileTagline || null,
      banner_theme: bannerTheme,
      accent_theme: accentTheme,
      favourite_team_id: favouriteTeamId,
    })
    .eq("id", user.id);

  if (error) {
    redirect(
      `/profile?error=${encodeURIComponent("Could not update profile personalisation")}`
    );
  }

  revalidatePath("/profile");
  revalidatePath(`/profile/${user.id}`);
  revalidatePath("/dashboard");
  revalidatePath("/fixtures");
  revalidatePath("/leagues");

  redirect("/profile?success=Profile%20personalisation%20updated");
}
