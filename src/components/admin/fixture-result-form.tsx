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
  isKnockout?: boolean;
  homeTeamId?: number | null;
  awayTeamId?: number | null;
  homeShortName?: string | null;
  awayShortName?: string | null;
  initialHomeScore?: number | null;
  initialAwayScore?: number | null;
  initialWinningTeamId?: number | null;
  initialDecidedBy?: string | null;
  initialStatus?: string | null;
};

const initialState: UpdateFixtureResultState = {};

export function FixtureResultForm({
  fixtureId,
  isKnockout = false,
  homeTeamId,
  awayTeamId,
  homeShortName,
  awayShortName,
  initialHomeScore,
  initialAwayScore,
  initialWinningTeamId,
  initialDecidedBy,
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
  const [homeScoreInput, setHomeScoreInput] = useState(
    initialHomeScore === null || initialHomeScore === undefined
      ? ""
      : String(initialHomeScore)
  );
  const [awayScoreInput, setAwayScoreInput] = useState(
    initialAwayScore === null || initialAwayScore === undefined
      ? ""
      : String(initialAwayScore)
  );
  const [winningTeamId, setWinningTeamId] = useState<number | null>(
    initialWinningTeamId ?? null
  );
  const [decidedBy, setDecidedBy] = useState<string | null>(
    initialDecidedBy ?? null
  );

  useEffect(() => {
    if (
      state.success &&
      state.fixtureId === fixtureId &&
      state.homeScore !== undefined &&
      state.awayScore !== undefined
    ) {
      setHomeScore(state.homeScore);
      setAwayScore(state.awayScore);
      setHomeScoreInput(String(state.homeScore));
      setAwayScoreInput(String(state.awayScore));
      setWinningTeamId(state.winningTeamId ?? null);
      setDecidedBy(state.decidedBy ?? null);
      setStatus(state.status || "finished");

      const timeout = setTimeout(() => {
        router.refresh();
      }, 1500);

      return () => clearTimeout(timeout);
    }
  }, [state, fixtureId, router]);

  const hasResult =
    status === "finished" && homeScore !== null && awayScore !== null;
  const parsedHomeScore =
    homeScoreInput === "" ? null : Number(homeScoreInput);
  const parsedAwayScore =
    awayScoreInput === "" ? null : Number(awayScoreInput);
  const isDrawResult =
    parsedHomeScore !== null &&
    parsedAwayScore !== null &&
    !Number.isNaN(parsedHomeScore) &&
    !Number.isNaN(parsedAwayScore) &&
    parsedHomeScore === parsedAwayScore;
  const shouldShowWinnerChoice =
    isKnockout && homeTeamId && awayTeamId && isDrawResult;
  const winnerName =
    winningTeamId === homeTeamId
      ? homeShortName
      : winningTeamId === awayTeamId
        ? awayShortName
        : null;

  return (
    <div className="space-y-3">
      {state.error && (!state.fixtureId || state.fixtureId === fixtureId) && (
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
              {isKnockout && winnerName && `, ${winnerName} through`}
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
              value={homeScoreInput}
              onChange={(event) => setHomeScoreInput(event.target.value)}
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
              value={awayScoreInput}
              onChange={(event) => setAwayScoreInput(event.target.value)}
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

        {shouldShowWinnerChoice && (
          <fieldset className="lg:basis-full rounded-2xl border border-white/10 bg-white/5 p-4">
            <legend className="px-1 text-sm font-semibold text-slate-200">
              Who progressed?
            </legend>

            <input type="hidden" name="decidedBy" value="penalties" />

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {[
                { id: homeTeamId, label: homeShortName },
                { id: awayTeamId, label: awayShortName },
              ].map((team) => (
                <label
                  key={team.id}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm font-bold text-slate-100 transition hover:bg-white/10 has-[:checked]:border-emerald-400/50 has-[:checked]:bg-emerald-400/10 has-[:checked]:text-emerald-100"
                >
                  <input
                    type="radio"
                    name="winningTeamId"
                    value={team.id}
                    checked={winningTeamId === team.id}
                    onChange={() => {
                      setWinningTeamId(team.id);
                      setDecidedBy("penalties");
                    }}
                    required
                    className="h-4 w-4 accent-emerald-400"
                  />
                  {team.label}
                </label>
              ))}
            </div>

            {decidedBy === "penalties" && winnerName && (
              <p className="mt-3 text-xs font-semibold text-emerald-200">
                {winnerName} marked as progressing on penalties.
              </p>
            )}
          </fieldset>
        )}
      </form>
    </div>
  );
}
