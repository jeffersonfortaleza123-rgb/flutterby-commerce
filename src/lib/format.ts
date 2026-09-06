/** Formata um número tipo "5585999999999" em "(85) 99999-9999". */
export const formatPhoneDisplay = (raw: string): string => {
  const digits = raw.replace(/\D/g, "");
  // Remove o código do país (55) se estiver presente e o número for longo o suficiente
  const local = digits.length > 11 && digits.startsWith("55") ? digits.slice(2) : digits;

  if (local.length === 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }
  if (local.length === 10) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  }
  return raw;
};

/** Link do Google Maps: usa o link direto configurado, ou monta uma busca a partir do endereço. */
export const buildMapsLink = (mapsLink?: string | null, address?: string | null): string | null => {
  if (mapsLink) return mapsLink;
  if (address) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  return null;
};
