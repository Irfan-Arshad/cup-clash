"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Target } from "lucide-react";
import {
  savePrediction,
  type SavePredictionState,
} from "@/actions/predictions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

type PredictionFormProps = {
  fixtureId: number;
  homeShortName?: string | null;
  awayShortName?: string | null;
  initialHomeScore?: number | null;
  initialAwayScore?: number | null;
};

const initialState: SavePredictionState = {};

export function PredictionForm({
  fixtureId,
  homeShortName,
  awayShortName,
  initialHomeScore,
  initialAwayScore,
}: PredictionFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(savePrediction, initialState);

  const [savedHomeScore, setSavedHomeScore] = useState<number | null>(
    initialHomeScore ?? null
  );
  const [savedAwayScore, setSavedAwayScore] = useState<number | null>(
    initialAwayScore ?? null
  );

  useEffect(() => {
    if (
      state.success &&
      state.fixtureId === fixtureId &&
      state.predictedHomeScore !== undefined &&
      state.predictedAwayScore !== undefined
    ) {
      setSavedHomeScore(state.predictedHomeScore);
      setSavedAwayScore(state.predictedAwayScore);
      router.refresh();
    }
  }, [state, fixtureId, router]);

  const hasSavedPrediction =
    savedHomeScore !== null && savedAwayScore !== null;

  return (
    <div className="space-y-4">
      {hasSavedPrediction && (
        <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-4 text-center">
          <p className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            Your pick
          </p>

          <p className="mt-2 text-3xl font-black">
            {savedHomeScore} - {savedAwayScore}
          </p>
        </div>
      )}

      {state.error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {state.error}
        </div>
      )}

      {state.success && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {state.success}
        </div>
      )}

      <form
        action={formAction}
        className="rounded-3xl border border-white/10 bg-slate-950/40 p-5"
      >
        <input type="hidden" name="fixtureId" value={fixtureId} />

        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Target className="h-4 w-4 text-emerald-300" />
              Enter your score prediction
            </p>

            <p className="mt-1 text-sm text-slate-500">
              You can change it as many times as you like before kickoff.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                {homeShortName}
              </label>
              <Input
                name="homeScore"
                type="number"
                min="0"
                defaultValue={savedHomeScore ?? ""}
                className="h-12 w-full border-white/10 bg-slate-950 text-center text-lg font-black sm:w-24"
                required
              />
            </div>

            <div className="hidden pb-3 text-lg font-black text-slate-500 sm:block">
              -
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                {awayShortName}
              </label>
              <Input
                name="awayScore"
                type="number"
                min="0"
                defaultValue={savedAwayScore ?? ""}
                className="h-12 w-full border-white/10 bg-slate-950 text-center text-lg font-black sm:w-24"
                required
              />
            </div>

            <SubmitButton
              className="h-12"
              pendingText={hasSavedPrediction ? "Updating..." : "Saving..."}
            >
              {hasSavedPrediction ? "Update prediction" : "Save prediction"}
            </SubmitButton>
          </div>
        </div>
      </form>
    </div>
  );
}
