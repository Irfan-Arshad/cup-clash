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
  homeShortName?: string | null;
  awayShortName?: string | null;
  initialHomeScore?: number | null;
  initialAwayScore?: number | null;
  initialStatus?: string | null;
};

const initialState: UpdateFixtureResultState = {};

export function FixtureResultForm({
  fixtureId,
  homeShortName,
  awayShortName,
  initialHomeScore,
  initialAwayScore,
  initialStatus,
}: FixtureResultFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(updateFixtureResult, initialState);
  const [homeScore, setHomeScore] = useState<number | null>(
    initialHomeScore ?? null
  );
  const [awayScore, setAwayScore] = useState<number | null>(
    initialAwayScore ?? null
  );
  const [status, setStatus] = useState<string | null>(initialStatus ?? null);

  useEffect(() => {
    if (
      state.success &&
      state.fixtureId === fixtureId &&
      state.homeScore !== undefined &&
      state.awayScore !== undefined
    ) {
      setHomeScore(state.homeScore);
      setAwayScore(state.awayScore);
      setStatus(state.status || "finished");
      router.refresh();
    }
  }, [state, fixtureId, router]);

  const hasResult =
    status === "finished" && homeScore !== null && awayScore !== null;

  return (
    <div className="space-y-3">
      {hasResult && (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-center sm:hidden">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
            Result
          </p>
          <p className="mt-1 text-2xl font-black">
            {homeScore} - {awayScore}
          </p>
        </div>
      )}

      {state.error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {state.error}
        </div>
      )}

      {state.success && state.fixtureId === fixtureId && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 shadow-lg shadow-emerald-950/20">
          <p className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {state.success}
          </p>
          {homeScore !== null && awayScore !== null && (
            <p className="mt-1 text-xs text-emerald-100">
              Score: {homeScore} - {awayScore}
            </p>
          )}
        </div>
      )}

      <form
        action={formAction}
        className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
      >
        <input type="hidden" name="fixtureId" value={fixtureId} />

        <div>
          <p className="text-sm font-semibold text-slate-300">
            {hasResult ? "Update score" : "Enter score"}
          </p>
          <p className="mt-1 hidden text-sm text-slate-500 sm:block">
            Saving will recalculate points for this fixture.
          </p>
        </div>

        <div className="grid grid-cols-[1fr_1fr] gap-3 sm:flex sm:flex-row sm:items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">
              {homeShortName}
            </label>

            <Input
              name="homeScore"
              type="number"
              min="0"
              defaultValue={homeScore ?? ""}
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
              defaultValue={awayScore ?? ""}
              className="h-12 w-full border-white/10 bg-slate-950 text-center text-lg font-black sm:w-24"
              required
            />
          </div>

          <SubmitButton
            className="col-span-2 h-12 w-full sm:w-auto"
            pendingText="Updating..."
          >
            {hasResult ? "Update result" : "Save result"}
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
