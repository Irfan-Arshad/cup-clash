"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calculatePredictionPoints } from "@/lib/scoring";
import { requireAdmin } from "@/lib/auth";

async function recalculateFixturePredictionPoints(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fixtureId: number,
  homeScore: number,
  awayScore: number
) {
  const { data: predictions, error: predictionsError } = await supabase
    .from("predictions")
    .select("id, predicted_home_score, predicted_away_score")
    .eq("fixture_id", fixtureId);

  if (predictionsError) {
    throw new Error(predictionsError.message);
  }

  for (const prediction of predictions || []) {
    const points = calculatePredictionPoints({
      predictedHome: prediction.predicted_home_score,
      predictedAway: prediction.predicted_away_score,
      actualHome: homeScore,
      actualAway: awayScore,
    });

    const { error: updateError } = await supabase
      .from("predictions")
      .update({ points })
      .eq("id", prediction.id);

    if (updateError) {
      throw new Error(updateError.message);
    }
  }
}

export async function updateFixtureResult(formData: FormData) {
  const admin = await requireAdmin();

if (!admin) {
  redirect("/dashboard");
}

const supabase = await createClient();

  const fixtureId = Number(formData.get("fixtureId"));
  const homeScore = Number(formData.get("homeScore"));
  const awayScore = Number(formData.get("awayScore"));

  if (!fixtureId || Number.isNaN(homeScore) || Number.isNaN(awayScore)) {
    redirect("/admin?error=Invalid score");
  }

  if (homeScore < 0 || awayScore < 0) {
    redirect("/admin?error=Scores cannot be negative");
  }

  const { error: fixtureUpdateError } = await supabase
    .from("fixtures")
    .update({
      home_score: homeScore,
      away_score: awayScore,
      status: "finished",
    })
    .eq("id", fixtureId);

  if (fixtureUpdateError) {
    redirect(`/admin?error=${encodeURIComponent(fixtureUpdateError.message)}`);
  }

  try {
  await recalculateFixturePredictionPoints(
    supabase,
    fixtureId,
    homeScore,
    awayScore
  );
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

  redirect("/admin?success=Result saved and points calculated");
}

export async function recalculateAllFinishedFixtures() {
  const admin = await requireAdmin();

  if (!admin) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

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
      await recalculateFixturePredictionPoints(
        supabase,
        fixture.id,
        fixture.home_score,
        fixture.away_score
      );
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