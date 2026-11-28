import { createClient } from "@supabase/supabase-js";
import { cliente } from "../../../compartilhado/infra/cliente";
import { regraSchema } from "../dominio/regra";

export const ler = () => [createClient, cliente, regraSchema];
