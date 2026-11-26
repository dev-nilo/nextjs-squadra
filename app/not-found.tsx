import type { Metadata } from "next";
import { TelaDeAviso } from "@/components/ui/tela-de-aviso";

export const metadata: Metadata = { title: "Página não encontrada · Squadra" };

/**
 * Any address the app doesn't have (a mistyped link, an old one). Next sends it
 * with a 404. Inside a fut, an unknown fut or Partida has its own screen.
 */
export default function NaoEncontrada() {
  return <TelaDeAviso titulo="Essa página não existe" texto="O link pode estar errado ou ser antigo." />;
}
