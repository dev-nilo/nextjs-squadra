import { z } from "zod";
import type { Resultado } from "../../../compartilhado/dominio/resultado";
import type { Velho } from "../../../../lib/velho";

export const regraSchema = z.string();
export type Regra = Resultado<Velho>;
