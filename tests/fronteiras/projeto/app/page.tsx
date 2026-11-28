import { Tela } from "../src/modulos/a";
import { cliente } from "../src/compartilhado/infra/cliente";
import { velho } from "../lib/velho";

export default function Pagina() {
  return [Tela, cliente, velho];
}
