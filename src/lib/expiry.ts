export type ExpiryStatus = "normal" | "proximo" | "vencendo" | "vencido";

/**
 * Calcula o status de validade de uma data, seguindo a mesma regra
 * usada na função get_expiry_status do banco:
 *   vencido   -> já passou da validade
 *   vencendo  -> menos de 1 mês para vencer
 *   proximo   -> entre 1 e 3 meses para vencer
 *   normal    -> mais de 3 meses para vencer
 */
export const getExpiryStatus = (expiryDate: string): ExpiryStatus => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate + "T00:00:00");

  const oneMonth = new Date(today);
  oneMonth.setMonth(oneMonth.getMonth() + 1);
  const threeMonths = new Date(today);
  threeMonths.setMonth(threeMonths.getMonth() + 3);

  if (expiry < today) return "vencido";
  if (expiry < oneMonth) return "vencendo";
  if (expiry < threeMonths) return "proximo";
  return "normal";
};

export const getDaysRemaining = (expiryDate: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate + "T00:00:00");
  return Math.round((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

export const EXPIRY_STATUS_META: Record<ExpiryStatus, { emoji: string; label: string; className: string }> = {
  normal: { emoji: "🟢", label: "Normal", className: "bg-green-100 text-green-700" },
  proximo: { emoji: "🟡", label: "Próximo do vencimento", className: "bg-yellow-100 text-yellow-700" },
  vencendo: { emoji: "🔴", label: "Vencendo", className: "bg-red-100 text-red-700" },
  vencido: { emoji: "⚫", label: "Vencido", className: "bg-gray-200 text-gray-700" },
};
