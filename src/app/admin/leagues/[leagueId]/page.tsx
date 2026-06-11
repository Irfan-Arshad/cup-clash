import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Shield,
  Trash2,
  Trophy,
  User,
  Users,
} from "lucide-react";
import { removeLeagueMember } from "@/actions/admin-leagues";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { CopyInviteCode } from "@/components/league/copy-invite-code";
import { AppShell } from "@/components/layout/app-shell";
import { PageHero } from "@/components/layout/page-hero";
import { AppBadge } from "@/components/ui/app-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";

type AdminLeagueDetailsPageProps = {
  params: Promise<{
    leagueId: string;
  }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function AdminLeagueDetailsPage({
  params,
  searchParams,
}: AdminLeagueDetailsPageProps) {
  const { leagueId } = await params;
  const query = await searchParams;
  const error = query.error;
  const success = query.success;

  const admin = await requireAdmin();

  if (!admin) {
    redirect("/dashboard");
  }

  const supabase = createAdminClient();

const { data: league, error: leagueError } = await supabase
  .from("leagues")
  .select("id, name, invite_code, created_at")
  .eq("id", leagueId)
  .single();

if (leagueError || !league) {
  notFound();
}

const { data: members, error: membersError } = await supabase
  .from("league_members")
  .select("id, user_id, role, joined_at")
  .eq("league_id", leagueId)
  .order("joined_at", { ascending: true });

const memberUserIds = (members || []).map((member) => member.user_id);

const { data: profiles, error: profilesError } = memberUserIds.length
  ? await supabase
      .from("profiles")
      .select("id, display_name, email")
      .in("id", memberUserIds)
  : { data: [], error: null };

const profileMap = new Map(
  (profiles || []).map((profile) => [profile.id, profile])
);

const memberLoadError = membersError?.message || profilesError?.message;

  return (
    <AppShell isAdmin>
      <div className="sm:hidden">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
            League Admin
          </p>
          <h1 className="mt-2 truncate text-2xl font-black tracking-tight">
            {league.name}
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Manage members and access.
          </p>

          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-yellow-300/20 bg-yellow-300/10 px-3 py-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-yellow-200">
                Invite code
              </p>
              <p className="mt-1 font-mono text-xl font-black tracking-[0.18em]">
                {league.invite_code}
              </p>
            </div>

            <CopyInviteCode
              inviteCode={league.invite_code}
              leagueName={league.name}
              size="sm"
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link href="/admin/leagues">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Leagues
              </Link>
            </Button>

            <Button asChild size="sm">
              <Link href={`/leagues/${league.id}`}>Open league</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="hidden sm:block">
        <PageHero
          eyebrow="Admin"
          title={league.name}
          description="Manage league members and league access."
          actions={
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="secondary">
                <Link href="/admin/leagues">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to leagues
                </Link>
              </Button>

              <Button asChild>
                <Link href={`/leagues/${league.id}`}>
                  Open league
                </Link>
              </Button>
            </div>
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

      {memberLoadError && (
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Failed to load members: {memberLoadError}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-4 md:grid-cols-3">
        <Card className="pitch-card text-white">
          <CardContent className="p-4 sm:p-5">
            <p className="text-sm font-semibold text-slate-300">Members</p>
            <p className="mt-3 text-2xl font-black sm:text-3xl">
              {members?.length || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="gold-card text-white">
          <CardContent className="p-4 sm:p-5">
            <p className="text-sm font-semibold text-slate-300">Invite code</p>
            <p className="mt-3 font-mono text-xl font-black tracking-[0.18em] sm:text-3xl sm:tracking-[0.2em]">
              {league.invite_code}
            </p>
            <div className="mt-3 sm:hidden">
              <CopyInviteCode
                inviteCode={league.invite_code}
                leagueName={league.name}
                size="sm"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card text-white max-md:col-span-2">
          <CardContent className="p-4 sm:p-5">
            <p className="text-sm font-semibold text-slate-300">Created</p>
            <p className="mt-3 text-base font-black sm:text-lg">
              {new Date(league.created_at).toLocaleDateString("en-GB", {
                dateStyle: "medium",
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 fixture-card text-white sm:mt-8">
        <CardContent className="p-4 sm:p-8">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-emerald-300" />
            <h2 className="text-xl font-black tracking-tight sm:text-2xl">
              League members
            </h2>
          </div>

          <div className="mt-4 space-y-2 sm:mt-5 sm:space-y-3">
            {members?.map((member) => {
              const profile = profileMap.get(member.user_id);

              return (
                <div
                  key={member.id}
                  className="flex flex-col justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 sm:gap-4 sm:rounded-3xl sm:px-5 sm:py-4 md:flex-row md:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 sm:h-12 sm:w-12 sm:rounded-2xl">
                      <User className="h-5 w-5 text-emerald-300 sm:h-6 sm:w-6" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-black">
                          {profile?.display_name || "Player"}
                        </p>

                        <AppBadge
                          variant={member.role === "owner" ? "gold" : "muted"}
                          className="capitalize"
                        >
                          {member.role}
                        </AppBadge>
                      </div>

                      <p className="mt-1 truncate text-xs text-slate-400 sm:text-sm">
                        {profile?.email || member.user_id}
                      </p>
                    </div>
                  </div>

                  <form action={removeLeagueMember} className="w-full md:w-auto">
                    <input type="hidden" name="leagueId" value={league.id} />
                    <input type="hidden" name="userId" value={member.user_id} />

                    <SubmitButton
                      variant="destructive"
                      className="h-10 w-full md:w-auto"
                      pendingText="Removing..."
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </SubmitButton>
                  </form>
                </div>
              );
            })}

            {(!members || members.length === 0) && (
              <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 text-slate-300 sm:rounded-3xl sm:p-6">
                No members found.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6 border-red-500/30 bg-red-500/10 text-white sm:mt-8">
        <CardContent className="p-4 sm:p-8">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-red-300" />
            <h2 className="text-xl font-black tracking-tight sm:text-2xl">
              Admin note
            </h2>
          </div>

          <p className="mt-3 text-sm leading-6 text-red-100">
            Removing a member removes their league membership only. Their user
            account and global fixture predictions remain.
          </p>
        </CardContent>
      </Card>
    </AppShell>
  );
}
