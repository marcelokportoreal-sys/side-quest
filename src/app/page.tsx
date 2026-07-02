/** Página única do jogo: onboarding (sem herói) ou dashboard (com herói). */

import { getServerSupabase } from "@/db/server";
import { carregarJogo } from "@/domain/game.service";
import { Dashboard } from "@/components/Dashboard";
import { Onboarding } from "@/components/Onboarding";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null; // middleware redireciona

  const jogo = await carregarJogo(supabase, user.id);
  if (!jogo) return <Onboarding />;
  return <Dashboard inicial={jogo} />;
}
