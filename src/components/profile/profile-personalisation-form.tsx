"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Palette, UserRound } from "lucide-react";
import { updateProfilePersonalisation } from "@/actions/profile";
import { TeamFlag, type TeamFlagData } from "@/components/team/team-flag";
import { AppBadge } from "@/components/ui/app-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  ACCENT_THEME_OPTIONS,
  BANNER_THEME_OPTIONS,
  getAccentThemeClasses,
  getBannerThemeClasses,
  isAccentTheme,
  isBannerTheme,
  type AccentTheme,
  type BannerTheme,
} from "@/lib/profile-personalisation";

export type ProfilePersonalisationTeam = TeamFlagData & {
  id: number;
};

export type InitialProfilePersonalisation = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  profile_tagline: string | null;
  banner_theme: string | null;
  accent_theme: string | null;
  selected_title: string | null;
  favourite_team_id: number | null;
  created_at: string;
  is_admin: boolean | null;
};

type ProfilePersonalisationFormProps = {
  initialProfile: InitialProfilePersonalisation;
  teams: ProfilePersonalisationTeam[];
};

const themeSwatchClasses: Record<string, string> = {
  classic: "bg-slate-300",
  midnight: "bg-slate-950",
  emerald: "bg-emerald-400",
  blue: "bg-sky-400",
  purple: "bg-violet-400",
  gold: "bg-yellow-300",
  red: "bg-red-400",
};

function getInitials(displayName: string) {
  return (
    displayName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "CC"
  );
}

export function ProfilePersonalisationForm({
  initialProfile,
  teams,
}: ProfilePersonalisationFormProps) {
  const savedBannerTheme = initialProfile.banner_theme || "";
  const savedAccentTheme = initialProfile.accent_theme || "";
  const initialBannerTheme = isBannerTheme(savedBannerTheme)
    ? savedBannerTheme
    : "classic";
  const initialAccentTheme = isAccentTheme(savedAccentTheme)
    ? savedAccentTheme
    : "emerald";
  const [displayName, setDisplayName] = useState(
    initialProfile.display_name || ""
  );
  const [avatarUrl, setAvatarUrl] = useState(initialProfile.avatar_url || "");
  const [profileTagline, setProfileTagline] = useState(
    initialProfile.profile_tagline || ""
  );
  const [bannerTheme, setBannerTheme] =
    useState<BannerTheme>(initialBannerTheme);
  const [accentTheme, setAccentTheme] =
    useState<AccentTheme>(initialAccentTheme);
  const [favouriteTeamId, setFavouriteTeamId] = useState(
    initialProfile.favourite_team_id
      ? String(initialProfile.favourite_team_id)
      : ""
  );

  useEffect(() => {
    setDisplayName(initialProfile.display_name || "");
    setAvatarUrl(initialProfile.avatar_url || "");
    setProfileTagline(initialProfile.profile_tagline || "");
    setBannerTheme(initialBannerTheme);
    setAccentTheme(initialAccentTheme);
    setFavouriteTeamId(
      initialProfile.favourite_team_id
        ? String(initialProfile.favourite_team_id)
        : ""
    );
  }, [initialAccentTheme, initialBannerTheme, initialProfile]);

  const previewName = displayName.trim() || "Cup Clash Player";
  const previewAvatarUrl = /^https?:\/\//i.test(avatarUrl.trim())
    ? avatarUrl.trim()
    : null;
  const favouriteTeam = teams.find(
    (team) => String(team.id) === favouriteTeamId
  );
  const bannerClasses = getBannerThemeClasses(bannerTheme);
  const accentClasses = getAccentThemeClasses(accentTheme);

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
      <Card className="order-2 glass-card text-white lg:order-1">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-emerald-300">
              <UserRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">
                Profile personalisation
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Update your public Cup Clash identity.
              </p>
            </div>
          </div>

          <form action={updateProfilePersonalisation} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display name</Label>
                <Input
                  id="displayName"
                  name="displayName"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  maxLength={40}
                  required
                  className="h-11 border-white/10 bg-slate-950"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatarUrl">Avatar URL</Label>
                <Input
                  id="avatarUrl"
                  name="avatarUrl"
                  type="url"
                  inputMode="url"
                  value={avatarUrl}
                  onChange={(event) => setAvatarUrl(event.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="h-11 border-white/10 bg-slate-950"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="profileTagline">Profile tagline</Label>
                <span className="text-xs text-slate-500">
                  {profileTagline.length}/80
                </span>
              </div>
              <textarea
                id="profileTagline"
                name="profileTagline"
                value={profileTagline}
                onChange={(event) => setProfileTagline(event.target.value)}
                maxLength={80}
                rows={3}
                placeholder="A short line about your prediction style"
                className="w-full resize-none rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Banner theme</Label>
                <Select
                  name="bannerTheme"
                  value={bannerTheme}
                  onValueChange={(value) => setBannerTheme(value as BannerTheme)}
                >
                  <SelectTrigger className="h-11 w-full border-white/10 bg-slate-950">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BANNER_THEME_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <span
                          className={`h-3 w-3 rounded-full border border-white/20 ${themeSwatchClasses[option.value]}`}
                        />
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Accent theme</Label>
                <Select
                  name="accentTheme"
                  value={accentTheme}
                  onValueChange={(value) => setAccentTheme(value as AccentTheme)}
                >
                  <SelectTrigger className="h-11 w-full border-white/10 bg-slate-950">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCENT_THEME_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <span
                          className={`h-3 w-3 rounded-full ${themeSwatchClasses[option.value]}`}
                        />
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Favourite team</Label>
              <Select
                name="favouriteTeamId"
                value={favouriteTeamId || "none"}
                onValueChange={(value) =>
                  setFavouriteTeamId(value === "none" ? "" : value)
                }
              >
                <SelectTrigger className="h-11 w-full border-white/10 bg-slate-950">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No favourite team</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={String(team.id)}>
                      <span>{team.flag_emoji || "🏳️"}</span>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <SubmitButton className="h-11 w-full sm:w-auto" pendingText="Saving profile...">
              Save profile
            </SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card className="order-1 pitch-card text-white lg:sticky lg:top-24 lg:order-2">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-yellow-300" />
              <h2 className="text-lg font-black">Public profile preview</h2>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-8 px-2">
              <Link href={`/profile/${initialProfile.id}`}>
                View
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          <div className={`mt-4 rounded-2xl border p-4 ${bannerClasses}`}>
            <div className="flex items-center gap-3">
              <div
                className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border text-xl font-black ${accentClasses.border} ${accentClasses.surface} ${accentClasses.text}`}
              >
                {previewAvatarUrl ? (
                  <img
                    src={previewAvatarUrl}
                    alt={`${previewName} avatar preview`}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  getInitials(previewName)
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="break-words text-xl font-black leading-tight">
                  {previewName}
                </p>
                <p
                  className={`mt-1 line-clamp-2 text-sm ${
                    profileTagline.trim()
                      ? "text-slate-300"
                      : "italic text-slate-500"
                  }`}
                >
                  {profileTagline.trim() ||
                    "Your profile tagline will appear here."}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${accentClasses.border} ${accentClasses.surface} ${accentClasses.text}`}
              >
                Cup Clash Player
              </span>
              {initialProfile.selected_title && (
                <AppBadge variant="gold">
                  {initialProfile.selected_title}
                </AppBadge>
              )}
              {initialProfile.is_admin && (
                <AppBadge variant="gold">Admin</AppBadge>
              )}
            </div>

            {favouriteTeam && (
              <div
                className={`mt-3 flex items-center gap-3 rounded-xl border p-2.5 ${accentClasses.border} ${accentClasses.surface}`}
              >
                <TeamFlag team={favouriteTeam} size="sm" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    Favourite team
                  </p>
                  <p className="truncate text-sm font-black">
                    {favouriteTeam.name}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
