"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { isKnockoutFixture } from "@/lib/fixtures";
import { recalculateFixturePredictionPoints } from "@/lib/prediction-recalculation";

export type UpdateFixtureResultState = {
  error?: string;
  success?: string;
  fixtureId?: number;
  homeScore?: number;
  awayScore?: number;
  winningTeamId?: number | null;
  decidedBy?: string | null;
  status?: "finished";
};

export async function updateFixtureResult(
  _previousState: UpdateFixtureResultState,
  formData: FormData
): Promise<UpdateFixtureResultState> {
  const fixtureId = Number(formData.get("fixtureId"));
  const homeScore = Number(formData.get("homeScore"));
  const awayScore = Number(formData.get("awayScore"));
  const selectedWinningTeamId = Number(formData.get("winningTeamId"));
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

    const { data: fixture, error: fixtureLoadError } = await supabase
      .from("fixtures")
      .select("id, stage, round_name, home_team_id, away_team_id")
      .eq("id", fixtureId)
      .single();

    if (fixtureLoadError || !fixture) {
      return { error: fixtureLoadError?.message || "Fixture not found" };
    }

    const fixtureUpdate: {
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

    let winningTeamId: number | null = null;
    let decidedBy: string | null = null;

    if (isKnockoutFixture(fixture)) {
      if (homeScore > awayScore) {
        winningTeamId = fixture.home_team_id;
        decidedBy = "normal";
      } else if (awayScore > homeScore) {
        winningTeamId = fixture.away_team_id;
        decidedBy = "normal";
      } else if (
        selectedWinningTeamId === fixture.home_team_id ||
        selectedWinningTeamId === fixture.away_team_id
      ) {
        winningTeamId = selectedWinningTeamId;
        decidedBy = "penalties";
      } else {
        return {
          error: "Choose who progressed for a drawn knockout fixture.",
          fixtureId,
        };
      }

      fixtureUpdate.winning_team_id = winningTeamId;
      fixtureUpdate.decided_by = decidedBy;
    }

    const fixtureUpdateTimingLabel = `updateFixtureResult fixture update ${timingId}`;
    console.time(fixtureUpdateTimingLabel);
    let fixtureUpdateError: { message: string } | null = null;
    try {
      const result = await supabase
        .from("fixtures")
        .update(fixtureUpdate)
        .eq("id", fixtureId);

      fixtureUpdateError = result.error;
    } finally {
      console.timeEnd(fixtureUpdateTimingLabel);
    }

    if (fixtureUpdateError) {
      return { error: fixtureUpdateError.message };
    }

    const pointsTimingLabel = `updateFixtureResult points recalculation ${timingId}`;
    console.time(pointsTimingLabel);
    try {
      await recalculateFixturePredictionPoints(supabase, fixtureId);
    } finally {
      console.timeEnd(pointsTimingLabel);
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
      winningTeamId,
      decidedBy,
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
      await recalculateFixturePredictionPoints(supabase, fixture.id);
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
