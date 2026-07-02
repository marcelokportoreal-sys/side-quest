/** POST /api/upgrade — compra 1 nível de um upgrade (sink de ouro). */

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/db/server";
import { comprarUpgrade } from "@/domain/game.service";
import { type UpgradeId } from "@/domain/upgrades";

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "não autenticado" }, { status: 401 });

  let corpo: { id?: string };
  try {
    corpo = (await request.json()) as { id?: string };
  } catch {
    return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });
  }
  if (!corpo.id) return NextResponse.json({ erro: "id obrigatório" }, { status: 422 });

  try {
    const r = await comprarUpgrade(supabase, user.id, corpo.id as UpgradeId);
    return NextResponse.json(r);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = /insuficiente|máximo|inválido/.test(msg) ? 409 : 500;
    return NextResponse.json({ erro: msg }, { status });
  }
}
