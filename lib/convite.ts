import { z } from "zod";

/** 128 random bits as hex, as `convites.token` is generated in the database. */
export const tokenDoConviteSchema = z.string().regex(/^[0-9a-f]{32}$/, "Convite inválido.");

export type SituacaoDoConvite = "valido" | "inexistente" | "revogado" | "expirado";

export const PROBLEMA_DO_CONVITE: Record<Exclude<SituacaoDoConvite, "valido">, { titulo: string; texto: string }> = {
  inexistente: {
    titulo: "Convite não encontrado",
    texto: "Confira se o link veio inteiro, ou peça um novo pra quem organiza o fut.",
  },
  revogado: {
    titulo: "Esse convite foi cancelado",
    texto: "Peça um link novo pra quem organiza o fut.",
  },
  expirado: {
    titulo: "Esse convite expirou",
    texto: "Os links valem 7 dias. Peça um novo pra quem organiza o fut.",
  },
};

export function situacaoDoConvite(valor: unknown): SituacaoDoConvite {
  return valor === "valido" || valor === "revogado" || valor === "expirado" ? valor : "inexistente";
}

export const caminhoDoConvite = (token: string) => `/convite/${token}`;

// ---------------------------------------------------------------------------
// The invite being accepted, remembered on this device: whoever opened a link
// and then lands on `/` with no Grupo is sent back to it instead of being asked
// to name a Grupo of their own.
// ---------------------------------------------------------------------------
const CHAVE_PENDENTE = "squadra:convite-pendente";

export function lembrarConvitePendente(token: string) {
  try {
    localStorage.setItem(CHAVE_PENDENTE, token);
  } catch {
    /* storage unavailable */
  }
}

export function convitePendente(): string | null {
  try {
    const token = localStorage.getItem(CHAVE_PENDENTE);
    return token && tokenDoConviteSchema.safeParse(token).success ? token : null;
  } catch {
    return null;
  }
}

export function esquecerConvitePendente() {
  try {
    localStorage.removeItem(CHAVE_PENDENTE);
  } catch {
    /* storage unavailable */
  }
}
