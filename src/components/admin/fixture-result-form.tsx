"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import {
  updateFixtureResult,
  type UpdateFixtureResultState,
} from "@/actions/admin";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

type FixtureResultFormProps = {
  fixtureId: number;
  initialHomeScore?: number | null;
  initialAwayScore?: number | null;
  homeShortName?: string | null;
  awayShortName?: string | null;
};

const initialState: UpdateFixtureResultState = {};

export function FixtureResultForm({
  fixtureId,
  initialHomeScore,
  initialAwayScore,
  homeShortName,
  awayShortName,
}: FixtureResultFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    updateFixtureResult,
    initialState
  );

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
      state.homeScore !== undefined &&
      state.awayScore !== undefined
    ) {
      setSavedHomeScore(state.homeScore);
      setSavedAwayScore(state.awayScore);
      router.refresh();
    }
  }, [state, fixtureId, router]);

  const hasScore =
    savedHomeScore !== null &&
    savedAwayScore !== null &&
    savedHomeScore !== undefined &&
    savedAwayScore !== undefined;

  return (
    <div className="space-y-3">
      {hasScore && (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
            <CheckCircle2 className="h-4 w-4" />
            Current result: {savedHomeScore} - {savedAwayScore}
          </p>
        </div>
      )}

      {state.error && state.fixtureId === fixtureId && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {state.error}
        </div>
      )}

      {state.success && state.fixtureId === fixtureId && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {state.success}
        </div>
      )}

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="fixtureId" value={fixtureId} />

        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              {homeShortName || "Home"}
            </label>
            <Input
              name="homeScore"
              type="number"
              min="0"
              defaultValue={savedHomeScore ?? ""}
              className="h-12 border-white/10 bg-slate-950 text-center text-lg font-black"
              required
            />
          </div>

          <div className="pb-3 text-lg font-black text-slate-500">-</div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              {awayShortName || "Away"}
            </label>
            <Input
              name="awayScore"
              type="number"
              min="0"
              defaultValue={savedAwayScore ?? ""}
              className="h-12 border-white/10 bg-slate-950 text-center text-lg font-black"
              required
            />
          </div>
        </div>

        <SubmitButton
          className="h-11 w-full"
          pendingText={hasScore ? "Updating..." : "Saving..."}
        >
          {hasScore ? "Update result" : "Save result"}
        </SubmitButton>
      </form>
    </div>
  );
}