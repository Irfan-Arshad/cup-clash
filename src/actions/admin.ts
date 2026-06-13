"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";

export type UpdateFixtureResultState = {
  error?: string;
  success?: string;
  fixtureId?: number;
  homeScore?: number;
  awayScore?: number;
  status?: "finished";
};

export async function updateFixtureResult(
  _previousState: UpdateFixtureResultState,
  formData: FormData
): Promise<UpdateFixtureResultState> {
  const fixtureId = Number(formData.get("fixtureId"));
  const homeScore = Number(formData.get("homeScore"));
  const awayScore = Number(formData.get("awayScore"));
  const timingId = `${fixtureId || "unknown"}:${Date.now()}:${Math.random()
    .toString(36)
    .slice(2)}`;
  const actionTimingLabel = `updateFixtureResult full action ${timingId}`;

  console.time(actionTimingLabel);

  try {
    const admin = await requireAdmin();

    if (!admin) {
      redirect("/dashboard");
    }

    const supabase = createAdminClient();

    if (!fixtureId || Number.isNaN(homeScore) || Number.isNaN(awayScore)) {
      return { error: "Invalid score" };
    }

    if (homeScore < 0 || awayScore < 0) {
      return { error: "Scores cannot be negative" };
    }

    const fixtureUpdateTimingLabel = `updateFixtureResult fixture update ${timingId}`;
    console.time(fixtureUpdateTimingLabel);
    let fixtureUpdateError: { message: string } | null = null;
    try {
      const result = await supabase
        .from("fixtures")
        .update({
          home_score: homeScore,
          away_score: awayScore,
          status: "finished",
        })
        .eq("id", fixtureId);

      fixtureUpdateError = result.error;
    } finally {
      console.timeEnd(fixtureUpdateTimingLabel);
    }

    if (fixtureUpdateError) {
      return { error: fixtureUpdateError.message };
    }

    const pointsRpcTimingLabel = `updateFixtureResult points RPC ${timingId}`;
    console.time(pointsRpcTimingLabel);
    let recalculateError: { message: string } | null = null;
    try {
      const result = await supabase.rpc(
        "recalculate_fixture_prediction_points",
        {
          target_fixture_id: fixtureId,
        }
      );

      recalculateError = result.error;
    } finally {
      console.timeEnd(pointsRpcTimingLabel);
    }

    if (recalculateError) {
      return { error: recalculateError.message };
    }

    const revalidateTimingLabel = `updateFixtureResult revalidatePath ${timingId}`;
    console.time(revalidateTimingLabel);
    try {
      revalidatePath("/admin");
      revalidatePath("/fixtures");
      revalidatePath("/dashboard");
      revalidatePath("/leagues");
    } finally {
      console.timeEnd(revalidateTimingLabel);
    }

    return {
      success: "Result saved and points updated.",
      fixtureId,
      homeScore,
      awayScore,
      status: "finished",
    };
  } finally {
    console.timeEnd(actionTimingLabel);
  }
}

export async function recalculateAllFinishedFixtures() {
  const admin = await requireAdmin();

  if (!admin) {
    redirect("/dashboard");
  }

  const supabase = createAdminClient();

  const { data: fixtures, error: fixturesError } = await supabase
    .from("fixtures")
    .select("id, home_score, away_score")
    .eq("status", "finished")
    .not("home_score", "is", null)
    .not("away_score", "is", null);

  if (fixturesError) {
    redirect(`/admin?error=${encodeURIComponent(fixturesError.message)}`);
  }

  try {
    for (const fixture of fixtures || []) {
      const { error: recalculateError } = await supabase.rpc(
        "recalculate_fixture_prediction_points",
        {
          target_fixture_id: fixture.id,
        }
      );

      if (recalculateError) {
        throw new Error(recalculateError.message);
      }
    }
  } catch (error) {
    redirect(
      `/admin?error=${encodeURIComponent(
        error instanceof Error ? error.message : "Could not recalculate points"
      )}`
    );
  }

  revalidatePath("/admin");
  revalidatePath("/fixtures");
  revalidatePath("/dashboard");
  revalidatePath("/leagues");

  redirect("/admin?success=All finished fixture points recalculated");
}

export async function updateTournamentWinner(formData: FormData) {
  const admin = await requireAdmin();

  if (!admin) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const winnerTeamId = Number(formData.get("winnerTeamId"));

  if (!winnerTeamId || Number.isNaN(winnerTeamId)) {
    redirect("/admin?error=Please select a tournament winner");
  }

  const { data: existingResult } = await supabase
    .from("tournament_results")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (existingResult) {
    const { error } = await supabase
      .from("tournament_results")
      .update({
        winner_team_id: winnerTeamId,
        updated_by: admin.user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingResult.id);

    if (error) {
      redirect(`/admin?error=${encodeURIComponent(error.message)}`);
    }
  } else {
    const { error } = await supabase.from("tournament_results").insert({
      winner_team_id: winnerTeamId,
      updated_by: admin.user.id,
    });

    if (error) {
      redirect(`/admin?error=${encodeURIComponent(error.message)}`);
    }
  }

  const { error: pickUpdateError } = await supabase
    .from("tournament_picks")
    .update({
      points: 20,
    })
    .eq("team_id", winnerTeamId);

  if (pickUpdateError) {
    redirect(`/admin?error=${encodeURIComponent(pickUpdateError.message)}`);
  }

  const { error: losingPickUpdateError } = await supabase
    .from("tournament_picks")
    .update({
      points: 0,
    })
    .neq("team_id", winnerTeamId);

  if (losingPickUpdateError) {
    redirect(`/admin?error=${encodeURIComponent(losingPickUpdateError.message)}`);
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/leagues");

  redirect("/admin?success=Tournament winner saved and pick points updated");
}
