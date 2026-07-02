/** Rota /widget — a visão enxuta para a casca desktop always-on-top (Tauri). */

import { getServerSupabase } from "@/db/server";
import { carregarJogo } from "@/domain/game.service";
import { Widget } from "@/components/Widget";

export const dynamic = "force-dynamic";

export default async function WidgetPage() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null; // middleware redireciona

  const jogo = await carregarJogo(supabase, user.id);
  if (!jogo) return null;
  return <Widget jogo={jogo} />;
}
