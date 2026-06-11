import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  Shield,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  deleteLeague,
  updateLeagueName,
} from "@/actions/admin-leagues";
import { AppShell } from "@/components/layout/app-shell";
import { PageHero } from "@/components/layout/page-hero";
import { AppBadge } from "@/components/ui/app-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

type AdminLeaguesPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function AdminLeaguesPage({
  searchParams,
}: AdminLeaguesPageProps) {
  const params = await searchParams;
  const error = params.error;
  const success = params.success;

  const admin = await requireAdmin();

  if (!admin) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const { data: leagues } = await supabase
    .from("leagues")
    .select(
      `
      id,
      name,
      invite_code,
      created_at,
      created_by,
      league_members (
        id,
        user_id,
        role
      )
    `
    )
    .order("created_at", { ascending: false });

  return (
    <AppShell isAdmin>
      <div className="sm:hidden">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-white">
          <h1 className="text-2xl font-black tracking-tight">
            League management
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Manage, rename, and delete leagues.
          </p>

          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Total leagues
              </p>
              <p className="mt-1 text-2xl font-black">
                {leagues?.length || 0}
              </p>
            </div>

            <Button asChild variant="secondary" size="sm">
              <Link href="/admin">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Admin
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="hidden sm:block">
        <PageHero
          eyebrow="Admin"
          title="League management"
          description="View, rename, open and delete Cup Clash leagues."
          actions={
            <Button asChild variant="secondary">
              <Link href="/admin">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to admin
              </Link>
            </Button>
          }
        />
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {decodeURIComponent(error)}
        </div>
      )}

      {success && (
        <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {decodeURIComponent(success)}
        </div>
      )}

      <div className="mt-4 space-y-3 sm:mt-8 sm:space-y-4">
        {leagues?.map((league) => {
          const members = league.league_members || [];

          return (
            <Card key={league.id} className="fixture-card text-white">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Trophy className="h-5 w-5 text-yellow-300" />
                      <h2 className="min-w-0 flex-1 truncate text-xl font-black tracking-tight sm:text-2xl">
                        {league.name}
                      </h2>

                      <AppBadge variant="muted">
                        <Users className="mr-1 h-3 w-3" />
                        {members.length} member{members.length === 1 ? "" : "s"}
                      </AppBadge>

                      <AppBadge variant="gold">
                        {league.invite_code}
                      </AppBadge>
                    </div>

                    <p className="mt-2 text-sm text-slate-400">
                      Created{" "}
                      {new Date(league.created_at).toLocaleString("en-GB", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>

                    <form
                      action={updateLeagueName}
                      className="mt-4 flex flex-col gap-2 sm:mt-5 sm:flex-row sm:gap-3"
                    >
                      <input type="hidden" name="leagueId" value={league.id} />

                      <Input
                        name="name"
                        defaultValue={league.name}
                        maxLength={80}
                        required
                        className="h-11 w-full border-white/10 bg-slate-950"
                      />

                      <SubmitButton
                        className="h-11 w-full sm:w-36"
                        pendingText="Saving..."
                      >
                        Rename
                      </SubmitButton>
                    </form>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-col">
                    <Button asChild variant="secondary" className="w-full">
                      <Link href={`/admin/leagues/${league.id}`}>
                        <Shield className="mr-2 h-4 w-4" />
                        Manage
                      </Link>
                    </Button>

                    <Button asChild variant="secondary" className="w-full">
                      <Link href={`/leagues/${league.id}`}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open
                      </Link>
                    </Button>

                    <form
                      action={deleteLeague}
                      className="rounded-2xl border border-red-500/20 bg-red-500/10 p-2 sm:col-span-2 lg:p-0 lg:border-0 lg:bg-transparent"
                    >
                      <input type="hidden" name="leagueId" value={league.id} />

                      <SubmitButton
                        variant="destructive"
                        className="w-full"
                        pendingText="Deleting..."
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </SubmitButton>
                    </form>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {(!leagues || leagues.length === 0) && (
          <Card className="glass-card text-white">
            <CardContent className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <Trophy className="mb-4 h-12 w-12 text-slate-500" />
              <h2 className="text-2xl font-black tracking-tight">
                No leagues yet
              </h2>
              <p className="mt-2 text-slate-400">
                Created leagues will appear here.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
