import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import { EmpresaBadge } from "./EmpresaBadge";
import { Clock, User, Wrench } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Equipment {
  id: string;
  imei: string;
  iccid: string;
  empresa: "LOCK" | "ALO";
  status: "disponivel" | "reservado" | "utilizado";
  reservado_por: string | null;
  data_reserva: string | null;
  remover_apos: string | null;
  technician?: { nome: string } | null;
}

interface EquipmentCardProps {
  equipment: Equipment;
  onReserve: (id: string) => void;
  onRelease: (id: string) => void;
  onMarkUsed: (id: string) => void;
  isAdmin: boolean;
}

export function EquipmentCard({
  equipment,
  onReserve,
  onRelease,
  onMarkUsed,
  isAdmin,
}: EquipmentCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow duration-base">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">IMEI</p>
            <p className="font-mono text-sm font-semibold">{equipment.imei}</p>
          </div>
          <StatusBadge status={equipment.status} />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">ICCID</p>
          <p className="font-mono text-sm">{equipment.iccid}</p>
        </div>

        <div className="flex items-center gap-2">
          <EmpresaBadge empresa={equipment.empresa} />
          {equipment.technician && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Wrench className="h-3 w-3" />
              <span>{equipment.technician.nome}</span>
            </div>
          )}
        </div>

        {equipment.status === "reservado" && (
          <div className="rounded-lg bg-warning/10 p-3 space-y-2">
            {equipment.reservado_por && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-warning" />
                <span className="font-medium">{equipment.reservado_por}</span>
              </div>
            )}
            {equipment.remover_apos && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  Expira: {format(new Date(equipment.remover_apos), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2">
        {equipment.status === "disponivel" && (
          <>
            <Button onClick={() => onReserve(equipment.id)} className="flex-1" size="sm">
              Reservar
            </Button>
            {isAdmin && (
              <Button
                onClick={() => onMarkUsed(equipment.id)}
                variant="secondary"
                size="sm"
              >
                Marcar Utilizado
              </Button>
            )}
          </>
        )}
        
        {equipment.status === "reservado" && (
          <Button
            onClick={() => onRelease(equipment.id)}
            variant="outline"
            className="flex-1"
            size="sm"
          >
            Liberar
          </Button>
        )}

        {equipment.status === "utilizado" && isAdmin && (
          <Button
            onClick={() => onRelease(equipment.id)}
            variant="outline"
            className="flex-1"
            size="sm"
          >
            Marcar Disponível
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
