import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { EquipmentCard } from "@/components/equipment/EquipmentCard";
import { EquipmentFilters } from "@/components/equipment/EquipmentFilters";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Equipamentos() {
  const [equipments, setEquipments] = useState<any[]>([]);
  const [filteredEquipments, setFilteredEquipments] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [empresaFilter, setEmpresaFilter] = useState("all");
  const [tecnicoFilter, setTecnicoFilter] = useState("all");
  const [reserveDialog, setReserveDialog] = useState<{ open: boolean; equipmentId: string | null }>({
    open: false,
    equipmentId: null,
  });
  const [reserveName, setReserveName] = useState("");
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterEquipments();
  }, [equipments, search, statusFilter, empresaFilter, tecnicoFilter]);

  const fetchData = async () => {
    try {
      // Fetch technicians
      const { data: techData } = await supabase
        .from("technicians")
        .select("*")
        .order("nome");

      setTechnicians(techData || []);

      // Fetch equipments with technician data
      const { data: equipData, error } = await supabase
        .from("equipments")
        .select(`
          *,
          technician:technicians(nome)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEquipments(equipData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar dados",
        description: "Tente novamente mais tarde",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterEquipments = () => {
    let filtered = equipments;

    if (search) {
      filtered = filtered.filter(
        (e) =>
          e.imei.toLowerCase().includes(search.toLowerCase()) ||
          e.iccid.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((e) => e.status === statusFilter);
    }

    if (empresaFilter !== "all") {
      filtered = filtered.filter((e) => e.empresa === empresaFilter);
    }

    if (tecnicoFilter !== "all") {
      filtered = filtered.filter((e) => e.tecnico_id === tecnicoFilter);
    }

    setFilteredEquipments(filtered);
  };

  const handleReserve = (equipmentId: string) => {
    setReserveDialog({ open: true, equipmentId });
    setReserveName("");
  };

  const confirmReserve = async () => {
    if (!reserveName.trim()) {
      toast({
        variant: "destructive",
        title: "Nome obrigatório",
        description: "Por favor, informe seu nome para reservar",
      });
      return;
    }

    if (!reserveDialog.equipmentId) return;

    try {
      const now = new Date().toISOString();
      const expirationTime = calculateExpirationTime(new Date());

      const { error } = await supabase
        .from("equipments")
        .update({
          status: "reservado",
          reservado_por: reserveName.trim(),
          data_reserva: now,
          remover_apos: expirationTime,
        })
        .eq("id", reserveDialog.equipmentId);

      if (error) throw error;

      toast({
        title: "Equipamento reservado",
        description: "A reserva expira automaticamente no horário indicado",
      });

      setReserveDialog({ open: false, equipmentId: null });
      setReserveName("");
      fetchData();
    } catch (error) {
      console.error("Error reserving equipment:", error);
      toast({
        variant: "destructive",
        title: "Erro ao reservar",
        description: "Tente novamente mais tarde",
      });
    }
  };

  const handleRelease = async (equipmentId: string) => {
    try {
      const { error } = await supabase
        .from("equipments")
        .update({
          status: "disponivel",
          reservado_por: null,
          data_reserva: null,
          remover_apos: null,
        })
        .eq("id", equipmentId);

      if (error) throw error;

      toast({
        title: "Equipamento liberado",
        description: "O equipamento está disponível novamente",
      });

      fetchData();
    } catch (error) {
      console.error("Error releasing equipment:", error);
      toast({
        variant: "destructive",
        title: "Erro ao liberar",
        description: "Tente novamente mais tarde",
      });
    }
  };

  const handleMarkUsed = async (equipmentId: string) => {
    try {
      const { error } = await supabase
        .from("equipments")
        .update({
          status: "utilizado",
          reservado_por: null,
          data_reserva: null,
          remover_apos: null,
        })
        .eq("id", equipmentId);

      if (error) throw error;

      toast({
        title: "Equipamento marcado como utilizado",
      });

      fetchData();
    } catch (error) {
      console.error("Error marking as used:", error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: "Tente novamente mais tarde",
      });
    }
  };

  const calculateExpirationTime = (reservationTime: Date): string => {
    const hour = reservationTime.getHours();
    const date = new Date(reservationTime);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);

    if (hour < 17) {
      date.setHours(17);
    } else {
      date.setDate(date.getDate() + 1);
      date.setHours(17);
    }

    return date.toISOString();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Equipamentos</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie o estoque de equipamentos
            </p>
          </div>
          {isAdmin && (
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Equipamento
            </Button>
          )}
        </div>

        <EquipmentFilters
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          empresaFilter={empresaFilter}
          onEmpresaFilterChange={setEmpresaFilter}
          tecnicoFilter={tecnicoFilter}
          onTecnicoFilterChange={setTecnicoFilter}
          technicians={technicians}
        />

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-muted animate-pulse rounded-lg"></div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredEquipments.map((equipment) => (
              <EquipmentCard
                key={equipment.id}
                equipment={equipment}
                onReserve={handleReserve}
                onRelease={handleRelease}
                onMarkUsed={handleMarkUsed}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        )}

        {!loading && filteredEquipments.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhum equipamento encontrado</p>
          </div>
        )}
      </div>

      <Dialog open={reserveDialog.open} onOpenChange={(open) => setReserveDialog({ open, equipmentId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reservar Equipamento</DialogTitle>
            <DialogDescription>
              Informe seu nome para reservar este equipamento. A reserva expirará automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reserve-name">Seu Nome</Label>
              <Input
                id="reserve-name"
                placeholder="Digite seu nome completo"
                value={reserveName}
                onChange={(e) => setReserveName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReserveDialog({ open: false, equipmentId: null })}>
              Cancelar
            </Button>
            <Button onClick={confirmReserve}>Confirmar Reserva</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
