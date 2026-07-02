/** Acesso tipado às variáveis de ambiente (12-Factor, leitura preguiçosa). */

function req(nome: string): string {
  const v = process.env[nome];
  if (!v) throw new Error(`Variável de ambiente ausente: ${nome}`);
  return v;
}

export const env = {
  supabase: {
    get url() { return req("NEXT_PUBLIC_SUPABASE_URL"); },
    get anonKey() { return req("NEXT_PUBLIC_SUPABASE_ANON_KEY"); },
  },
} as const;
