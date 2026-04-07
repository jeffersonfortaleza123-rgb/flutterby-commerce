import { MessageCircle } from "lucide-react";
import { useSiteSettings } from "@/hooks/useProducts";

const WhatsAppButton = () => {
  const { data: settings } = useSiteSettings();
  const phone = settings?.whatsapp_number || "5500000000000";

  return (
    <a
      href={`https://wa.me/${phone}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-40 bg-green-500 hover:bg-green-600 text-primary-foreground p-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110"
      aria-label="WhatsApp"
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  );
};

export default WhatsAppButton;
