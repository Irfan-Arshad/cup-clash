import { redirect } from "next/navigation";
import { Plus, Share2, Trophy, Users } from "lucide-react";
import { createLeague } from "@/actions/leagues";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import { PageHero } from "@/components/layout/page-hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type NewLeaguePageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function NewLeaguePage({
  searchParams,
}: NewLeaguePageProps) {
  const params = await searchParams;
  const error = params.error;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.is_admin === true;

  return (
    <AppShell isAdmin={isAdmin}>
      <PageHero
        eyebrow="Create League"
        title="Start your own league"
        description="Create a private Cup Clash table for your mates, family, work group, club, or tournament chat."
      />

      {error && (
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {decodeURIComponent(error)}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_420px] lg:items-start">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="pitch-card text-white">
            <CardContent className="p-5">
              <Users className="h-7 w-7 text-emerald-300" />
              <p className="mt-5 text-3xl font-black">1</p>
              <p className="mt-1 text-sm font-semibold text-slate-200">
                Create league
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Give your competition a name.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card text-white">
            <CardContent className="p-5">
              <Share2 className="h-7 w-7 text-emerald-300" />
              <p className="mt-5 text-3xl font-black">2</p>
              <p className="mt-1 text-sm font-semibold text-slate-200">
                Share invite
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Send the code into your group chat.
              </p>
            </CardContent>
          </Card>

          <Card className="gold-card text-white">
            <CardContent className="p-5">
              <Trophy className="h-7 w-7 text-yellow-300" />
              <p className="mt-5 text-3xl font-black">3</p>
              <p className="mt-1 text-sm font-semibold text-slate-200">
                Battle for top spot
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Predict scores and climb the table.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="fixture-card text-white">
          <CardContent className="p-6 sm:p-8">
            <div>
              <h2 className="text-2xl font-black tracking-tight">
                League details
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                You can create more leagues later for different groups.
              </p>
            </div>

            <form action={createLeague} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">League name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="The Lads League"
                  required
                  className="h-12 border-white/10 bg-slate-950"
                />
              </div>

              <Button type="submit" className="h-12 w-full">
                <Plus className="mr-2 h-4 w-4" />
                Create league
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}