import { executar } from "../../../compartilhado/aplicacao/executar";
import { regraSchema } from "../dominio/regra";
import { ler } from "../infra/repositorio";

export const caso = () => executar([regraSchema, ler]);
