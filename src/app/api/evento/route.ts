/** POST /api/evento — resolve um evento de escolha e devolve o estado atualizado. */

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/db/server";
import { resolverEvento } from "@/domain/game.service";

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "não autenticado" }, { status: 401 });

  let corpo: { eventoId?: string; opcaoId?: string };
  try {
    corpo = (await request.json()) as { eventoId?: string; opcaoId?: string };
  } catch {
    return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });
  }
  if (!corpo.eventoId || !corpo.opcaoId) {
    return NextResponse.json({ erro: "eventoId e opcaoId obrigatórios" }, { status: 422 });
  }

  try {
    const r = await resolverEvento(supabase, user.id, corpo.eventoId, corpo.opcaoId);
    return NextResponse.json(r);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = /já resolvido/.test(msg) ? 409 : 500;
    return NextResponse.json({ erro: msg }, { status });
  }
}
