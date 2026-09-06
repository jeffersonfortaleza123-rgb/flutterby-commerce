/**
 * Extrai uma mensagem legível de um erro, seja ele um Error nativo do
 * JavaScript ou um erro do Supabase (PostgrestError), que tem uma
 * propriedade .message mas não é instanceof Error. Sem isso, erros do
 * banco (como "Estoque insuficiente...") caíam no texto genérico de
 * fallback e escondiam a causa real do problema.
 */
export const getErrorMessage = (err: unknown, fallback = "Ocorreu um erro"): string => {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return fallback;
};
