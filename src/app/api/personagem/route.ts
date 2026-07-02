/** POST /api/personagem — cria o herói no primeiro acesso (onboarding). */

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/db/server";
import { criarPersonagem, obterPersonagem } from "@/domain/game.service";

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "não autenticado" }, { status: 401 });

  let corpo: { nome?: string };
  try {
    corpo = (await request.json()) as { nome?: string };
  } catch {
    return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });
  }
  const nome = corpo.nome?.trim();
  if (!nome || nome.length < 2 || nome.length > 24) {
    return NextResponse.json({ erro: "nome deve ter 2–24 caracteres" }, { status: 422 });
  }

  try {
    if (await obterPersonagem(supabase, user.id)) {
      return NextResponse.json({ erro: "personagem já existe" }, { status: 409 });
    }
    await criarPersonagem(supabase, user.id, nome);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
