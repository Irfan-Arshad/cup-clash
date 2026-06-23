"use client";

import { useState, useTransition } from "react";
import { Award, Eye, Sparkles } from "lucide-react";
import {
  generateLeagueAwards,
  previewLeagueAwards,
  type LeagueAwardsActionResult,
} from "@/actions/league-awards";
import type { LeagueAwardPreview } from "@/lib/awards/league-awards";
import { AppBadge } from "@/components/ui/app-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type AwardGroup = {
  leagueId: string;
  leagueName: string;
  awards: LeagueAwardPreview[];
};

function groupAwardsByLeague(awards: LeagueAwardPreview[]) {
  const groups = new Map<string, AwardGroup>();

  for (const award of awards) {
    const group = groups.get(award.leagueId) || {
      leagueId: award.leagueId,
      leagueName: award.leagueName,
      awards: [],
    };
    group.awards.push(award);
    groups.set(award.leagueId, group);
  }

  return Array.from(groups.values());
}

function getAwardLabel(awardType: LeagueAwardPreview["awardType"]) {
  switch (awardType) {
    case "league_champion":
      return "Champion";
    case "league_runner_up":
      return "Runner-up";
    case "most_exact_scores":
      return "Most exact";
    case "best_accuracy":
      return "Best accuracy";
  }
}

export function LeagueAwardsCard() {
  const [result, setResult] = useState<LeagueAwardsActionResult | null>(null);
  const [pendingAction, setPendingAction] = useState<
    "preview" | "generate" | null
  >(null);
  const [isPending, startTransition] = useTransition();
  const awardGroups = result ? groupAwardsByLeague(result.awards) : [];

  const runAction = (action: "preview" | "generate") => {
    setPendingAction(action);
    startTransition(async () => {
      const actionResult =
        action === "preview"
          ? await previewLeagueAwards()
          : await generateLeagueAwards();
      setResult(actionResult);
      setPendingAction(null);
    });
  };

  return (
    <Card id="league-awards" className="mt-4 glass-card scroll-mt-28 text-white sm:mt-6">
      <CardContent className="p-4 sm:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-2">
              <Award className="h-6 w-6 text-yellow-300" />
              <h2 className="text-xl font-black tracking-tight sm:text-2xl">
                League awards
              </h2>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Preview awards from the current standings, then generate the 2026
              league achievements.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isPending}
              onClick={() => runAction("preview")}
            >
              <Eye className="mr-2 h-4 w-4" />
              {isPending && pendingAction === "preview"
                ? "Previewing..."
                : "Preview awards"}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              onClick={() => runAction("generate")}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {isPending && pendingAction === "generate"
                ? "Generating..."
                : "Generate awards"}
            </Button>
          </div>
        </div>

        {result?.error && (
          <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {result.error}
          </div>
        )}

        {result?.success && (
          <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {result.success}
          </div>
        )}

        {result && !result.error && awardGroups.length === 0 && (
          <div className="mt-5 rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-5 text-sm text-slate-300">
            No league awards are currently available.
          </div>
        )}

        {awardGroups.length > 0 && (
          <div className="mt-5 space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              {result?.awards.length} proposed award
              {result?.awards.length === 1 ? "" : "s"}
            </p>

            {awardGroups.map((group) => (
              <div
                key={group.leagueId}
                className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 sm:p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="min-w-0 truncate text-lg font-black">
                    {group.leagueName}
                  </h3>
                  <AppBadge variant="muted">
                    {group.awards.length} award
                    {group.awards.length === 1 ? "" : "s"}
                  </AppBadge>
                </div>

                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {group.awards.map((award) => (
                    <div
                      key={`${award.userId}-${award.awardType}`}
                      className="rounded-xl border border-white/10 bg-white/5 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-bold">
                            {award.displayName}
                          </p>
                          <p className="mt-1 text-sm text-slate-400">
                            {award.title}
                          </p>
                        </div>
                        <AppBadge
                          variant={
                            award.awardType === "league_champion"
                              ? "gold"
                              : "slate"
                          }
                        >
                          {getAwardLabel(award.awardType)}
                        </AppBadge>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <AppBadge variant="muted">
                          Rank #{award.finalPosition}
                        </AppBadge>
                        <AppBadge variant="muted">
                          {award.finalPoints} pts
                        </AppBadge>
                        <AppBadge variant="muted">
                          {award.exactScores} exact
                        </AppBadge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
