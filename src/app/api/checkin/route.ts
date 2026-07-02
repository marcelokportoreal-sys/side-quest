/** POST /api/checkin — conclui uma missão real e devolve as recompensas. */

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/db/server";
import { fazerCheckin, fazerCheckinTarefa } from "@/domain/game.service";

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "não autenticado" }, { status: 401 });

  let corpo: { missaoId?: string; tarefaId?: string; prova?: string };
  try {
    corpo = (await request.json()) as { missaoId?: string; tarefaId?: string; prova?: string };
  } catch {
    return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });
  }
  if (!corpo.missaoId && !corpo.tarefaId) {
    return NextResponse.json({ erro: "missaoId ou tarefaId obrigatório" }, { status: 422 });
  }

  try {
    const r = corpo.tarefaId
      ? await fazerCheckinTarefa(supabase, user.id, corpo.tarefaId, corpo.prova ?? null)
      : await fazerCheckin(supabase, user.id, corpo.missaoId!, corpo.prova ?? null);
    return NextResponse.json(r);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = /já concluída/.test(msg) ? 409 : 500;
    return NextResponse.json({ erro: msg }, { status });
  }
}
