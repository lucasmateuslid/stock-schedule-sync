import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "disponivel" | "reservado" | "utilizado";
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const variants = {
    disponivel: "bg-success text-success-foreground",
    reservado: "bg-warning text-warning-foreground",
    utilizado: "bg-muted text-muted-foreground",
  };

  const labels = {
    disponivel: "Disponível",
    reservado: "Reservado",
    utilizado: "Utilizado",
  };

  return (
    <Badge className={cn("font-medium", variants[status])}>
      {labels[status]}
    </Badge>
  );
}
