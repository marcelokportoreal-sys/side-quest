/** /api/tarefa — cria (POST) e arquiva (DELETE) tarefas do usuário. */

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/db/server";
import { criarTarefa, arquivarTarefa } from "@/domain/game.service";
import { validarNovaTarefa } from "@/domain/tarefa";

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "não autenticado" }, { status: 401 });

  let corpo: Record<string, unknown>;
  try {
    corpo = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });
  }

  const v = validarNovaTarefa(corpo);
  if (!v.ok) return NextResponse.json({ erro: v.erro }, { status: 422 });

  try {
    const tarefa = await criarTarefa(supabase, user.id, v.valor);
    return NextResponse.json(tarefa);
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "não autenticado" }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ erro: "id obrigatório" }, { status: 422 });

  try {
    await arquivarTarefa(supabase, user.id, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
