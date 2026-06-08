import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/app-header";

type AppShellProps = {
  children: ReactNode;
  isAdmin?: boolean;
};

export function AppShell({ children, isAdmin = false }: AppShellProps) {
  return (
    <main className="app-bg min-h-screen text-white">
      <AppHeader isAdmin={isAdmin} />

      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        {children}
      </section>
    </main>
  );
}