import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

const AdminSettings = () => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*");
      if (error) throw error;
      const map: Record<string, string> = {};
      data?.forEach((s) => { map[s.key] = s.value; });
      return map;
    },
  });

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const [key, value] of Object.entries(form)) {
        const { error } = await supabase.from("site_settings").update({ value }).eq("key", key);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      queryClient.invalidateQueries({ queryKey: ["site_settings"] });
      toast.success("Configurações salvas!");
    },
    onError: () => toast.error("Erro ao salvar"),
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const fields = [
    { key: "store_name", label: "Nome da Loja" },
    { key: "whatsapp_number", label: "WhatsApp (com código do país, ex: 5585999999999)" },
    { key: "whatsapp_message", label: "Mensagem padrão do WhatsApp" },
    { key: "logo_url", label: "URL do Logo" },
    { key: "primary_color", label: "Cor Principal (hex)" },
    { key: "store_address", label: "Endereço da loja (mostrado na opção 'Retirada na loja')" },
    { key: "store_maps_link", label: "Link do Google Maps (cole o link de compartilhar do Maps)" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-heading">Configurações</h1>

      <div className="bg-background rounded-xl border p-6 space-y-4 max-w-2xl">
        {fields.map((field) => (
          <div key={field.key}>
            <label className="text-sm font-medium">{field.label}</label>
            {field.key === "whatsapp_message" ? (
              <textarea
                value={form[field.key] || ""}
                onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                rows={3}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            ) : (
              <input
                value={form[field.key] || ""}
                onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            )}
          </div>
        ))}
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar Configurações
        </button>
      </div>
    </div>
  );
};

export default AdminSettings;
