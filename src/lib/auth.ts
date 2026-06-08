import { createClient } from "@/lib/supabase/server";

export async function getCurrentUserProfile() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      profile: null,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, is_admin")
    .eq("id", user.id)
    .single();

  return {
    user,
    profile,
  };
}

export async function requireAdmin() {
  const { user, profile } = await getCurrentUserProfile();

  if (!user || !profile?.is_admin) {
    return null;
  }

  return {
    user,
    profile,
  };
}