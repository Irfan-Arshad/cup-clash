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
import { createClient } from "@/lib/supabase/server";
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

  const supabase = await createClient();

  const { data: league } = await supabase
    .from("leagues")
    .select("id, name, invite_code, created_at")
    .eq("id", leagueId)
    .single();

  if (!league) {
    notFound();
  }

  const { data: members } = await supabase
    .from("league_members")
    .select(
      `
      id,
      user_id,
      role,
      joined_at,
      profiles (
        display_name,
        email
      )
    `
    )
    .eq("league_id", leagueId)
    .order("joined_at", { ascending: true });

  return (
    <AppShell isAdmin>
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

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card className="pitch-card text-white">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-slate-300">Members</p>
            <p className="mt-3 text-3xl font-black">{members?.length || 0}</p>
          </CardContent>
        </Card>

        <Card className="gold-card text-white">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-slate-300">Invite code</p>
            <p className="mt-3 font-mono text-3xl font-black tracking-[0.2em]">
              {league.invite_code}
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card text-white">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-slate-300">Created</p>
            <p className="mt-3 text-lg font-black">
              {new Date(league.created_at).toLocaleDateString("en-GB", {
                dateStyle: "medium",
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8 fixture-card text-white">
        <CardContent className="p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-emerald-300" />
            <h2 className="text-2xl font-black tracking-tight">
              League members
            </h2>
          </div>

          <div className="mt-5 space-y-3">
            {members?.map((member) => {
              const profile = Array.isArray(member.profiles)
                ? member.profiles[0]
                : member.profiles;

              return (
                <div
                  key={member.id}
                  className="flex flex-col justify-between gap-4 rounded-3xl border border-white/10 bg-slate-950/45 px-5 py-4 sm:flex-row sm:items-center"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
                      <User className="h-6 w-6 text-emerald-300" />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-black">
                          {profile?.display_name || "Player"}
                        </p>

                        <AppBadge
                          variant={member.role === "owner" ? "gold" : "muted"}
                          className="capitalize"
                        >
                          {member.role}
                        </AppBadge>
                      </div>

                      <p className="mt-1 text-sm text-slate-400">
                        {profile?.email || member.user_id}
                      </p>
                    </div>
                  </div>

                  <form action={removeLeagueMember}>
                    <input type="hidden" name="leagueId" value={league.id} />
                    <input type="hidden" name="userId" value={member.user_id} />

                    <SubmitButton
                      variant="destructive"
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
              <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-6 text-slate-300">
                No members found.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-8 border-red-500/30 bg-red-500/10 text-white">
        <CardContent className="p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-red-300" />
            <h2 className="text-2xl font-black tracking-tight">
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