"use client";

import Link from "next/link";
import {
  BarChart3,
  LogOut,
  Menu,
  Plus,
  Shield,
  Target,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { signOut } from "@/actions/auth";
import { Button } from "@/components/ui/button";

type AppHeaderProps = {
  isAdmin?: boolean;
};

export function AppHeader({ isAdmin = false }: AppHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: BarChart3,
    },
    {
      href: "/fixtures",
      label: "Fixtures",
      icon: Target,
    },
    {
      href: "/leagues/join",
      label: "Join",
      icon: Users,
    },
    {
      href: "/leagues/new",
      label: "Create",
      icon: Plus,
    },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/70 backdrop-blur-2xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/dashboard"
          className="group flex items-center gap-3"
          onClick={() => setIsOpen(false)}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 transition group-hover:bg-emerald-400/20">
            <Trophy className="h-5 w-5 text-emerald-300" />
          </div>

          <div className="leading-tight">
            <p className="text-lg font-black tracking-tight text-white">
              Cup Clash
            </p>
            <p className="hidden text-xs font-medium text-slate-500 sm:block">
              Predict. Clash. Win.
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const Icon = link.icon;

            return (
              <Button
                key={link.href}
                asChild
                variant="ghost"
                size="sm"
                className="text-slate-300 hover:bg-white/10 hover:text-white"
              >
                <Link href={link.href}>
                  <Icon className="mr-2 h-4 w-4" />
                  {link.label}
                </Link>
              </Button>
            );
          })}

          {isAdmin && (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-emerald-200 hover:bg-emerald-400/10 hover:text-emerald-100"
            >
              <Link href="/admin">
                <Shield className="mr-2 h-4 w-4" />
                Admin
              </Link>
            </Button>
          )}

          <div className="ml-2 h-6 w-px bg-white/10" />

          <form action={signOut}>
            <Button
              variant="secondary"
              size="sm"
              className="bg-white text-slate-950 hover:bg-slate-200"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </Button>
          </form>
        </nav>

        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-10 w-10 bg-white text-slate-950 hover:bg-slate-200 md:hidden"
          onClick={() => setIsOpen((current) => !current)}
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {isOpen && (
        <div className="border-t border-white/10 bg-slate-950/95 px-4 py-4 backdrop-blur-xl md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-2">
            {navLinks.map((link) => {
              const Icon = link.icon;

              return (
                <Button
                  key={link.href}
                  asChild
                  variant="ghost"
                  className="h-12 justify-start text-slate-200 hover:bg-white/10 hover:text-white"
                  onClick={() => setIsOpen(false)}
                >
                  <Link href={link.href}>
                    <Icon className="mr-3 h-4 w-4" />
                    {link.label}
                  </Link>
                </Button>
              );
            })}

            {isAdmin && (
              <Button
                asChild
                variant="ghost"
                className="h-12 justify-start text-emerald-200 hover:bg-emerald-400/10 hover:text-emerald-100"
                onClick={() => setIsOpen(false)}
              >
                <Link href="/admin">
                  <Shield className="mr-3 h-4 w-4" />
                  Admin
                </Link>
              </Button>
            )}

            <form action={signOut} className="pt-2">
              <Button
                variant="secondary"
                className="h-12 w-full bg-white text-slate-950 hover:bg-slate-200"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </Button>
            </form>
          </nav>
        </div>
      )}
    </header>
  );
}