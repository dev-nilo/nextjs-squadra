import type { Resultado } from "../dominio/resultado";
import { cliente } from "../infra/cliente";

export const executar = <T>(valor: T): Resultado<T> => (cliente.name ? { ok: true, valor } : { ok: false, erro: "" });
