import { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { EquipmentCard } from "@/components/equipment/EquipmentCard";
import { EquipmentFilters } from "@/components/equipment/EquipmentFilters";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
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

interface ReservationInfo {
  name: string;
  placa: string;
  associado: string;
  data: string;
  hora: string;
}

interface Equipment {
  id: string;
  imei?: string;
  iccid?: string;
  status?: string;
  empresa?: string;
  tecnico_id?: string | null;
  [key: string]: any;
}

interface Technician {
  id: string;
  nome: string;
  [key: string]: any;
}

export default function Equipamentos() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [empresaFilter, setEmpresaFilter] = useState("all");
  const [tecnicoFilter, setTecnicoFilter] = useState<string | "all">("all");
  const [reserveDialog, setReserveDialog] = useState<{
    open: boolean;
    equipmentId: string | null;
  }>({ open: false, equipmentId: null });
  const [reservationInfo, setReservationInfo] = useState<ReservationInfo>({
    name: "",
    placa: "",
    associado: "",
    data: "",
    hora: "",
  });
  const [removeDialog, setRemoveDialog] = useState<{
    open: boolean;
    equipmentIds: string[];
  }>({ open: false, equipmentIds: [] });

  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const queryClient = useQueryClient();

  // Fetch technicians
  const {
    data: technicians = [],
    isLoading: techLoading,
    isError: techError,
  } = useQuery<Technician[]>({
    queryKey: ["technicians"],
    queryFn: async () => {
      const q = query(collection(db, "technicians"), orderBy("nome"));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    },
  });

  // Fetch equipments
  const {
    data: equipments = [],
    isLoading: eqLoading,
    isError: eqError,
  } = useQuery<Equipment[]>({
    queryKey: ["equipments"],
    queryFn: async () => {
      const q = query(collection(db, "equipments"), orderBy("created_at", "desc"));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    },
  });

  const loading = techLoading || eqLoading;

  // Mutations
  const reserveMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<Equipment> }) =>
      updateDoc(doc(db, "equipments", id), payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["equipments"] }),
    onError: (err) => console.error("reserveMutation error:", err),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteDoc(doc(db, "equipments", id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["equipments"] }),
    onError: (err) => console.error("deleteMutation error:", err),
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      const snap = await getDocs(collection(db, "equipments"));
      const promises = snap.docs.map((d) =>
        updateDoc(d.ref, {
          status: "disponivel",
          reservado_por: null,
          placa: null,
          associado: null,
          data_reserva: null,
        })
      );
      await Promise.all(promises);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["equipments"] }),
    onError: (err) => console.error("clearAllMutation error:", err),
  });

  // Memoized filtered list
  const filteredEquipments = useMemo(() => {
    const s = (search || "").trim().toLowerCase();
    return (equipments || []).filter((e) => {
      if (s) {
        const inImei = !!e.imei && e.imei.toLowerCase().includes(s);
        const inIccid = !!e.iccid && e.iccid.toLowerCase().includes(s);
        if (!inImei && !inIccid) return false;
      }
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (empresaFilter !== "all" && e.empresa !== empresaFilter) return false;
      if (tecnicoFilter !== "all" && e.tecnico_id !== tecnicoFilter) return false;
      return true;
    });
  }, [equipments, search, statusFilter, empresaFilter, tecnicoFilter]);

  const handleReserve = useCallback((equipmentId: string) => {
    setReserveDialog({ open: true, equipmentId });
    setReservationInfo({ name: "", placa: "", associado: "", data: "", hora: "" });
  }, []);

  const confirmReserve = useCallback(async () => {
    const { name, placa, associado, data, hora } = reservationInfo;
    if (!reserveDialog.equipmentId) return;
    if (!name || !placa || !associado || !data || !hora) {
      toast({ variant: "destructive", title: "Campos obrigatórios", description: "Preencha todos os campos para reservar" });
      return;
    }

    try {
      await reserveMutation.mutateAsync({
        id: reserveDialog.equipmentId,
        payload: {
          status: "reservado",
          reservado_por: name.trim(),
          placa,
          associado,
          data_reserva: `${data}T${hora}:00`,
        },
      });

      toast({ title: "Equipamento reservado", description: "A reserva foi registrada com sucesso" });
      setReserveDialog({ open: false, equipmentId: null });
      setReservationInfo({ name: "", placa: "", associado: "", data: "", hora: "" });

      navigate("/agendamento", { state: { equipmentId: reserveDialog.equipmentId, reservation: reservationInfo } });
    } catch (error) {
      console.error("Error reserving equipment:", error);
      toast({ variant: "destructive", title: "Erro ao reservar", description: "Tente novamente mais tarde" });
    }
  }, [reserveDialog, reservationInfo, reserveMutation, navigate, toast]);

  const handleRelease = useCallback(async (equipmentId: string) => {
    try {
      await reserveMutation.mutateAsync({ id: equipmentId, payload: { status: "disponivel", reservado_por: null, placa: null, associado: null, data_reserva: null } });
      toast({ title: "Equipamento liberado" });
    } catch (error) {
      console.error("Error releasing equipment:", error);
      toast({ variant: "destructive", title: "Erro ao liberar", description: "Tente novamente mais tarde" });
    }
  }, [reserveMutation, toast]);

  const handleMarkUsed = useCallback(async (equipmentId: string) => {
    try {
      await reserveMutation.mutateAsync({ id: equipmentId, payload: { status: "utilizado" } });
      toast({ title: "Equipamento marcado como utilizado" });
    } catch (error) {
      console.error("Error marking equipment used:", error);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível marcar como utilizado" });
    }
  }, [reserveMutation, toast]);

  const handleClearSelection = useCallback(async () => {
    try {
      await clearAllMutation.mutateAsync();
      toast({ title: "Todas as reservas foram removidas" });
    } catch (error) {
      console.error("Error clearing selection:", error);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível limpar reservas" });
    }
  }, [clearAllMutation, toast]);

  const handleRemoveEquipments = useCallback(async () => {
    try {
      if (removeDialog.equipmentIds.length === 0) return;
      await Promise.all(removeDialog.equipmentIds.map((id) => deleteMutation.mutateAsync(id)));
      toast({ title: "Equipamentos removidos com sucesso" });
      setRemoveDialog({ open: false, equipmentIds: [] });
    } catch (error) {
      console.error("Error removing equipments:", error);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível remover equipamentos" });
    }
  }, [removeDialog, deleteMutation, toast]);

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
            <div className="flex gap-2">
              <Button onClick={() => navigate("/NovoEquipamento")}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Equipamento
              </Button>
              <Button variant="destructive" onClick={handleClearSelection}>
                Limpar Seleção
              </Button>
              <Button
                variant="outline"
                onClick={() => setRemoveDialog({ open: true, equipmentIds: [] })}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remover Equipamentos
              </Button>
            </div>
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
                equipment={equipment as any}
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

      {/* Reserva Dialog */}
      <Dialog
        open={reserveDialog.open}
        onOpenChange={(open) =>
          setReserveDialog({ open, equipmentId: null })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reservar Equipamento</DialogTitle>
            <DialogDescription>
              Preencha todas as informações para reservar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={reservationInfo.name}
                onChange={(e) =>
                  setReservationInfo({
                    ...reservationInfo,
                    name: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="placa">Placa</Label>
              <Input
                id="placa"
                value={reservationInfo.placa}
                onChange={(e) =>
                  setReservationInfo({
                    ...reservationInfo,
                    placa: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="associado">Nome Associado</Label>
              <Input
                id="associado"
                value={reservationInfo.associado}
                onChange={(e) =>
                  setReservationInfo({
                    ...reservationInfo,
                    associado: e.target.value,
                  })
                }
              />
            </div>
            <div className="flex gap-2">
              <div className="space-y-2 flex-1">
                <Label htmlFor="data">Data</Label>
                <Input
                  type="date"
                  id="data"
                  value={reservationInfo.data}
                  onChange={(e) =>
                    setReservationInfo({
                      ...reservationInfo,
                      data: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2 flex-1">
                <Label htmlFor="hora">Hora</Label>
                <Input
                  type="time"
                  id="hora"
                  value={reservationInfo.hora}
                  onChange={(e) =>
                    setReservationInfo({
                      ...reservationInfo,
                      hora: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setReserveDialog({ open: false, equipmentId: null })
              }
            >
              Cancelar
            </Button>
            <Button onClick={confirmReserve}>Confirmar Reserva</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remover Equipamentos Dialog */}
      <Dialog
        open={removeDialog.open}
        onOpenChange={(open) =>
          setRemoveDialog({ open, equipmentIds: [] })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover Equipamentos</DialogTitle>
            <DialogDescription>
              Informe os IDs dos equipamentos que deseja remover, separados
              por vírgula.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Ex: id1,id2,id3"
              value={removeDialog.equipmentIds.join(",")}
              onChange={(e) =>
                setRemoveDialog({
                  ...removeDialog,
                  equipmentIds: e.target.value.split(","),
                })
              }
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setRemoveDialog({ open: false, equipmentIds: [] })
              }
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleRemoveEquipments}>
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
