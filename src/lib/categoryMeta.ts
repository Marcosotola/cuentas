import {
  Building2,
  CreditCard,
  Droplet,
  Flame,
  Home,
  Lightbulb,
  Receipt,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import type { Categoria } from "@/types/bill";

export const CATEGORY_META: Record<
  Categoria,
  { label: string; icon: LucideIcon }
> = {
  luz: { label: "Luz", icon: Lightbulb },
  gas: { label: "Gas", icon: Flame },
  agua: { label: "Agua", icon: Droplet },
  internet: { label: "Internet", icon: Wifi },
  tarjeta: { label: "Tarjeta", icon: CreditCard },
  alquiler: { label: "Alquiler", icon: Home },
  expensas: { label: "Expensas", icon: Building2 },
  otro: { label: "Otro", icon: Receipt },
};
