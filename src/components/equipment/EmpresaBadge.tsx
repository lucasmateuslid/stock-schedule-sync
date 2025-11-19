import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface EmpresaBadgeProps {
  empresa: "LOCK" | "ALO";
}

export function EmpresaBadge({ empresa }: EmpresaBadgeProps) {
  return (
    <Badge
      className={cn(
        "font-medium",
        empresa === "LOCK" ? "bg-empresa-lock text-white" : "bg-empresa-alo text-white"
      )}
    >
      {empresa}
    </Badge>
  );
}
