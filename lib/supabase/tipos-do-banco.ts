export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      convites: {
        Row: {
          created_at: string;
          criado_por: string | null;
          expira_em: string;
          grupo_id: string;
          id: string;
          revogado_em: string | null;
          token: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          criado_por?: string | null;
          expira_em?: string;
          grupo_id: string;
          id?: string;
          revogado_em?: string | null;
          token?: string;
        };
        Update: {
          created_at?: string;
          criado_por?: string | null;
          expira_em?: string;
          grupo_id?: string;
          id?: string;
          revogado_em?: string | null;
          token?: string;
        };
        Relationships: [
          {
            foreignKeyName: "convites_grupo_id_fkey";
            columns: ["grupo_id"];
            isOneToOne: false;
            referencedRelation: "grupos";
            referencedColumns: ["id"];
          },
        ];
      };
      grupo_membros: {
        Row: {
          created_at: string;
          grupo_id: string;
          papel: Database["public"]["Enums"]["papel_grupo"];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          grupo_id: string;
          papel?: Database["public"]["Enums"]["papel_grupo"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          grupo_id?: string;
          papel?: Database["public"]["Enums"]["papel_grupo"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "grupo_membros_grupo_id_fkey";
            columns: ["grupo_id"];
            isOneToOne: false;
            referencedRelation: "grupos";
            referencedColumns: ["id"];
          },
        ];
      };
      grupos: {
        Row: {
          created_at: string;
          criado_por: string | null;
          id: string;
          nome: string;
          slug: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          criado_por?: string | null;
          id?: string;
          nome: string;
          slug: string;
        };
        Update: {
          created_at?: string;
          criado_por?: string | null;
          id?: string;
          nome?: string;
          slug?: string;
        };
        Relationships: [];
      };
      partidas: {
        Row: {
          cancelada_em: string | null;
          created_at: string;
          criado_por: string | null;
          grupo_id: string;
          id: string;
          inicio: string;
          local: string;
          updated_at: string;
          vagas: number;
        };
        ComputedFields: never;
        Insert: {
          cancelada_em?: string | null;
          created_at?: string;
          criado_por?: string | null;
          grupo_id: string;
          id?: string;
          inicio: string;
          local: string;
          updated_at?: string;
          vagas: number;
        };
        Update: {
          cancelada_em?: string | null;
          created_at?: string;
          criado_por?: string | null;
          grupo_id?: string;
          id?: string;
          inicio?: string;
          local?: string;
          updated_at?: string;
          vagas?: number;
        };
        Relationships: [
          {
            foreignKeyName: "partidas_grupo_id_fkey";
            columns: ["grupo_id"];
            isOneToOne: false;
            referencedRelation: "grupos";
            referencedColumns: ["id"];
          },
        ];
      };
      players: {
        Row: {
          chute: number;
          conta_id: string | null;
          created_at: string;
          defesa: number;
          drible: number;
          fisico: number;
          grupo_id: string;
          id: string;
          image_url: string | null;
          name: string;
          nationality: string;
          ovr: number;
          passe: number;
          posicionamento: number;
          position: string;
          resistencia: number;
          updated_at: string;
          user_id: string | null;
          velocidade: number;
          versao: number;
        };
        ComputedFields: never;
        Insert: {
          chute?: number;
          conta_id?: string | null;
          created_at?: string;
          defesa?: number;
          drible?: number;
          fisico?: number;
          grupo_id: string;
          id?: string;
          image_url?: string | null;
          name: string;
          nationality?: string;
          ovr?: number;
          passe?: number;
          posicionamento?: number;
          position: string;
          resistencia?: number;
          updated_at?: string;
          user_id?: string | null;
          velocidade?: number;
          versao?: number;
        };
        Update: {
          chute?: number;
          conta_id?: string | null;
          created_at?: string;
          defesa?: number;
          drible?: number;
          fisico?: number;
          grupo_id?: string;
          id?: string;
          image_url?: string | null;
          name?: string;
          nationality?: string;
          ovr?: number;
          passe?: number;
          posicionamento?: number;
          position?: string;
          resistencia?: number;
          updated_at?: string;
          user_id?: string | null;
          velocidade?: number;
          versao?: number;
        };
        Relationships: [
          {
            foreignKeyName: "players_grupo_id_fkey";
            columns: ["grupo_id"];
            isOneToOne: false;
            referencedRelation: "grupos";
            referencedColumns: ["id"];
          },
        ];
      };
      presencas: {
        Row: {
          jogador_id: string;
          partida_id: string;
          pediu_vaga_em: string | null;
          respondido_por: string | null;
          situacao: Database["public"]["Enums"]["situacao_presenca"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          jogador_id: string;
          partida_id: string;
          pediu_vaga_em?: string | null;
          respondido_por?: string | null;
          situacao: Database["public"]["Enums"]["situacao_presenca"];
          updated_at?: string;
        };
        Update: {
          jogador_id?: string;
          partida_id?: string;
          pediu_vaga_em?: string | null;
          respondido_por?: string | null;
          situacao?: Database["public"]["Enums"]["situacao_presenca"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "presencas_jogador_id_fkey";
            columns: ["jogador_id"];
            isOneToOne: false;
            referencedRelation: "frequencia_jogadores";
            referencedColumns: ["jogador_id"];
          },
          {
            foreignKeyName: "presencas_jogador_id_fkey";
            columns: ["jogador_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "presencas_partida_id_fkey";
            columns: ["partida_id"];
            isOneToOne: false;
            referencedRelation: "partidas";
            referencedColumns: ["id"];
          },
        ];
      };
      sorteios: {
        Row: {
          partida_id: string;
          publicado_em: string | null;
          sorteado_em: string;
          sorteado_por: string | null;
          times: NonNullable<Json>;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          partida_id: string;
          publicado_em?: string | null;
          sorteado_em?: string;
          sorteado_por?: string | null;
          times: NonNullable<Json>;
          updated_at?: string;
        };
        Update: {
          partida_id?: string;
          publicado_em?: string | null;
          sorteado_em?: string;
          sorteado_por?: string | null;
          times?: NonNullable<Json>;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sorteios_partida_id_fkey";
            columns: ["partida_id"];
            isOneToOne: true;
            referencedRelation: "partidas";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      frequencia_jogadores: {
        Row: {
          frequencia: number | null;
          grupo_id: string;
          jogador_id: string;
          partidas: number | null;
          presencas: number | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "players_grupo_id_fkey";
            columns: ["grupo_id"];
            isOneToOne: false;
            referencedRelation: "grupos";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      aceitar_convite: {
        Args: { token_do_convite: string };
        Returns: {
          created_at: string;
          criado_por: string | null;
          id: string;
          nome: string;
          slug: string;
        };
        SetofOptions: {
          from: "*";
          to: "grupos";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      criar_grupo: {
        Args: { nome_do_grupo: string };
        Returns: {
          created_at: string;
          criado_por: string | null;
          id: string;
          nome: string;
          slug: string;
        };
        SetofOptions: {
          from: "*";
          to: "grupos";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      criar_meu_jogador: {
        Args: { grupo: string; nome: string; posicao: string };
        Returns: {
          chute: number;
          conta_id: string | null;
          created_at: string;
          defesa: number;
          drible: number;
          fisico: number;
          grupo_id: string;
          id: string;
          image_url: string | null;
          name: string;
          nationality: string;
          ovr: number;
          passe: number;
          posicionamento: number;
          position: string;
          resistencia: number;
          updated_at: string;
          user_id: string | null;
          velocidade: number;
          versao: number;
        };
        SetofOptions: {
          from: "*";
          to: "players";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      desligar_do_grupo: { Args: { grupo: string; pessoa: string }; Returns: undefined };
      desvincular_jogador: {
        Args: { jogador: string };
        Returns: {
          chute: number;
          conta_id: string | null;
          created_at: string;
          defesa: number;
          drible: number;
          fisico: number;
          grupo_id: string;
          id: string;
          image_url: string | null;
          name: string;
          nationality: string;
          ovr: number;
          passe: number;
          posicionamento: number;
          position: string;
          resistencia: number;
          updated_at: string;
          user_id: string | null;
          velocidade: number;
          versao: number;
        };
        SetofOptions: {
          from: "*";
          to: "players";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      excluir_grupo: { Args: { confirmacao: string; grupo: string }; Returns: undefined };
      excluir_jogador: {
        Args: { grupo: string; jogador: string };
        Returns: {
          chute: number;
          conta_id: string | null;
          created_at: string;
          defesa: number;
          drible: number;
          fisico: number;
          grupo_id: string;
          id: string;
          image_url: string | null;
          name: string;
          nationality: string;
          ovr: number;
          passe: number;
          posicionamento: number;
          position: string;
          resistencia: number;
          updated_at: string;
          user_id: string | null;
          velocidade: number;
          versao: number;
        };
        SetofOptions: {
          from: "*";
          to: "players";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      exigir_papel: { Args: { grupo: string }; Returns: Database["public"]["Enums"]["papel_grupo"] };
      grupo_da_pasta: { Args: { nome_do_objeto: string }; Returns: string };
      mover_no_sorteio: {
        Args: { jogador: string; para_time: number; partida: string; sorteado_em: string };
        Returns: {
          partida_id: string;
          publicado_em: string | null;
          sorteado_em: string;
          sorteado_por: string | null;
          times: NonNullable<Json>;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "sorteios";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      mudar_papel: {
        Args: { grupo: string; novo: Database["public"]["Enums"]["papel_grupo"]; pessoa: string };
        Returns: {
          created_at: string;
          grupo_id: string;
          papel: Database["public"]["Enums"]["papel_grupo"];
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "grupo_membros";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      papel_no_grupo: { Args: { alvo: string }; Returns: Database["public"]["Enums"]["papel_grupo"] };
      passar_posse: { Args: { grupo: string; pessoa: string }; Returns: undefined };
      pessoas_do_grupo: {
        Args: { grupo: string };
        Returns: {
          desde: string;
          email: string;
          jogador_id: string;
          jogador_nome: string;
          papel: Database["public"]["Enums"]["papel_grupo"];
          user_id: string;
        }[];
      };
      promover_espera: { Args: { alvo: string }; Returns: undefined };
      publicar_sorteio: {
        Args: { partida: string };
        Returns: {
          partida_id: string;
          publicado_em: string | null;
          sorteado_em: string;
          sorteado_por: string | null;
          times: NonNullable<Json>;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "sorteios";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      remover_do_grupo: { Args: { grupo: string; pessoa: string }; Returns: undefined };
      renomear_grupo: {
        Args: { grupo: string; nome: string };
        Returns: {
          created_at: string;
          criado_por: string | null;
          id: string;
          nome: string;
          slug: string;
        };
        SetofOptions: {
          from: "*";
          to: "grupos";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      responder_presenca: {
        Args: { jogador: string; partida: string; vou: boolean };
        Returns: {
          jogador_id: string;
          partida_id: string;
          pediu_vaga_em: string | null;
          respondido_por: string | null;
          situacao: Database["public"]["Enums"]["situacao_presenca"];
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "presencas";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      sair_do_grupo: { Args: { grupo: string }; Returns: undefined };
      salvar_sorteio: {
        Args: { partida: string; times: Json };
        Returns: {
          partida_id: string;
          publicado_em: string | null;
          sorteado_em: string;
          sorteado_por: string | null;
          times: NonNullable<Json>;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "sorteios";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      slug_para: { Args: { texto: string }; Returns: string };
      ver_convite: {
        Args: { token_do_convite: string };
        Returns: {
          grupo_nome: string;
          situacao: string;
        }[];
      };
      vincular_jogador: {
        Args: { jogador: string };
        Returns: {
          chute: number;
          conta_id: string | null;
          created_at: string;
          defesa: number;
          drible: number;
          fisico: number;
          grupo_id: string;
          id: string;
          image_url: string | null;
          name: string;
          nationality: string;
          ovr: number;
          passe: number;
          posicionamento: number;
          position: string;
          resistencia: number;
          updated_at: string;
          user_id: string | null;
          velocidade: number;
          versao: number;
        };
        SetofOptions: {
          from: "*";
          to: "players";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      papel_grupo: "dono" | "admin" | "membro";
      situacao_presenca: "confirmado" | "espera" | "nao_vou";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      papel_grupo: ["dono", "admin", "membro"],
      situacao_presenca: ["confirmado", "espera", "nao_vou"],
    },
  },
} as const;
