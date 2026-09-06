import type { Database } from "@/integrations/supabase/types";

export type ProductType = Database["public"]["Enums"]["product_type"];

export interface VariationField {
  key: string;
  label: string;
}

export const PRODUCT_TYPE_META: Record<ProductType, { emoji: string; label: string; fields: VariationField[] }> = {
  maquiagem: {
    emoji: "💄",
    label: "Maquiagem",
    fields: [
      { key: "cor", label: "Cor" },
      { key: "tonalidade", label: "Tonalidade" },
      { key: "tipo", label: "Tipo" },
    ],
  },
  roupas: {
    emoji: "👕",
    label: "Roupas",
    fields: [
      { key: "tamanho", label: "Tamanho" },
      { key: "cor", label: "Cor" },
      { key: "modelo", label: "Modelo" },
    ],
  },
  tenis: {
    emoji: "👟",
    label: "Tênis",
    fields: [
      { key: "numeracao", label: "Numeração" },
      { key: "cor", label: "Cor" },
      { key: "modelo", label: "Modelo" },
    ],
  },
  cosmeticos: {
    emoji: "🧴",
    label: "Cosméticos",
    fields: [
      { key: "volume", label: "Volume" },
      { key: "fragrancia", label: "Fragrância" },
      { key: "tipo", label: "Tipo" },
    ],
  },
  utilidades: {
    emoji: "🏠",
    label: "Utilidades",
    fields: [],
  },
  outros: {
    emoji: "📦",
    label: "Outros",
    fields: [],
  },
};

export const PRODUCT_TYPE_OPTIONS = Object.entries(PRODUCT_TYPE_META).map(([value, meta]) => ({
  value: value as ProductType,
  ...meta,
}));

/** Monta um rótulo legível a partir dos atributos de uma variação, ex: "M / Preto". */
export const formatVariationLabel = (attributes: Record<string, unknown>): string => {
  return Object.values(attributes)
    .filter((v) => v !== null && v !== undefined && v !== "")
    .map(String)
    .join(" / ");
};
