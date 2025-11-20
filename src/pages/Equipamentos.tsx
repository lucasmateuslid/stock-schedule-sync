import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { firebaseDb } from "@/integrations/firebaseClient"; // Firestore client
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc } from "firebase/firestore";
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

export default function Equipamentos() {
  const [equipments, setEquipments] = useState<any[]>([]);
  const [filteredEquipments, setFilteredEquipments] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [empresaFilter, setEmpresaFilter] = useState("all");
  const [tecnicoFilter, setTecnicoFilter] = useState("all");
  const [reserveDialog, setReserveDialog] = useState<{ open: boolean; equipmentId: string | null }>({ open: false, equipmentId: null });
  const [reservationInfo, setReservationInfo] = useState<ReservationInfo>({ name: "", placa: "", associado: "", data: "", hora: "" });
  const [removeDialog, setRemoveDialog] = useState<{ open: boolean; equipmentIds: string[] }>({ open: false, equipmentIds: [] });

  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterEquipments();
  }, [equipments, search, statusFilter, empresaFilter, tecnicoFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Buscar técnicos
      const techSnapshot = await getDocs(query(collection(firebaseDb, "technicians"), orderBy("nome")));
      const techData = techSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setTechnicians(techData);

      // Buscar equipamentos
      const equipSnapshot = await getDocs(query(collection(firebaseDb, "equipments"), orderBy("created_at", "desc")));
      const equipData = equipSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setEquipments(equipData);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ variant: "destructive", title: "Erro ao carregar dados", description: "Tente novamente mais tarde" });
    } finally {
      setLoading(false);
    }
  };

  const filterEquipments = () => {
    let filtered = equipments;
    if (search)
      filtered = filtered.filter(
        (e) =>
          e.imei?.toLowerCase().includes(search.toLowerCase()) ||
          e.iccid?.toLowerCase().includes(search.toLowerCase())
      );
    if (statusFilter !== "all") filtered = filtered.filter((e) => e.status === statusFilter);
    if (empresaFilter !== "all") filtered = filtered.filter((e) => e.empresa === empresaFilter);
    if (tecnicoFilter !== "all") filtered = filtered.filter((e) => e.tecnico_id === tecnicoFilter);

    setFilteredEquipments(filtered);
  };

  const handleReserve = (equipmentId: string) => {
    setReserveDialog({ open: true, equipmentId });
    setReservationInfo({ name: "", placa: "", associado: "", data: "", hora: "" });
  };

  const confirmReserve = async () => {
    const { name, placa, associado, data, hora } = reservationInfo;
    if (!reserveDialog.equipmentId) return;
    if (!name || !placa || !associado || !data || !hora) {
      toast({ variant: "destructive", title: "Campos obrigatórios", description: "Preencha todos os campos para reservar" });
      return;
    }

    try {
      const equipmentRef = doc(firebaseDb, "equipments", reserveDialog.equipmentId);
      await updateDoc(equipmentRef, {
        status: "reservado",
        reservado_por: name.trim(),
        placa,
        associado,
        data_reserva: `${data}T${hora}:00`,
      });

      toast({ title: "Equipamento reservado", description: "A reserva foi registrada com sucesso" });
      setReserveDialog({ open: false, equipmentId: null });
      setReservationInfo({ name: "", placa: "", associado: "", data: "", hora: "" });
      fetchData();

      navigate("/agendamento", { state: { equipmentId: reserveDialog.equipmentId, reservation: reservationInfo } });
    } catch (error) {
      console.error("Error reserving equipment:", error);
      toast({ variant: "destructive", title: "Erro ao reservar", description: "Tente novamente mais tarde" });
    }
  };

  const handleRelease = async (equipmentId: string) => {
    try {
      const equipmentRef = doc(firebaseDb, "equipments", equipmentId);
      await updateDoc(equipmentRef, {
        status: "disponivel",
        reservado_por: null,
        placa: null,
        associado: null,
        data_reserva: null,
      });
      toast({ title: "Equipamento liberado" });
      fetchData();
    } catch (error) {
      console.error("Error releasing equipment:", error);
      toast({ variant: "destructive", title: "Erro ao liberar", description: "Tente novamente mais tarde" });
    }
  };

  const handleClearSelection = async () => {
    try {
      const equipSnapshot = await getDocs(collection(firebaseDb, "equipments"));
      const batchPromises = equipSnapshot.docs.map((d) => updateDoc(d.ref, { status: "disponivel", reservado_por: null, placa: null, associado: null, data_reserva: null }));
      await Promise.all(batchPromises);
      toast({ title: "Todas as reservas foram removidas" });
      fetchData();
    } catch (error) {
      console.error("Error clearing selection:", error);
    }
  };

  const handleRemoveEquipments = async () => {
    try {
      if (removeDialog.equipmentIds.length === 0) return;
      const batchPromises = removeDialog.equipmentIds.map((id) => deleteDoc(doc(firebaseDb, "equipments", id)));
      await Promise.all(batchPromises);
      toast({ title: "Equipamentos removidos com sucesso" });
      setRemoveDialog({ open: false, equipmentIds: [] });
      fetchData();
    } catch (error) {
      console.error("Error removing equipments:", error);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Equipamentos</h1>
            <p className="text-muted-foreground mt-1">Gerencie o estoque de equipamentos</p>
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
              <Button variant="outline" onClick={() => setRemoveDialog({ open: true, equipmentIds: [] })}>
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
                equipment={equipment}
                onReserve={handleReserve}
                onRelease={handleRelease}
                isAdmin={isAdmin}
                cardStatusColor={
                  equipment.status === "reservado"
                    ? "bg-yellow-300"
                    : equipment.empresa === "ALO"
                    ? "bg-green-900 text-white"
                    : undefined
                }
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
      <Dialog open={reserveDialog.open} onOpenChange={(open) => setReserveDialog({ open, equipmentId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reservar Equipamento</DialogTitle>
            <DialogDescription>Preencha todas as informações para reservar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" value={reservationInfo.name} onChange={(e) => setReservationInfo({ ...reservationInfo, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="placa">Placa</Label>
              <Input id="placa" value={reservationInfo.placa} onChange={(e) => setReservationInfo({ ...reservationInfo, placa: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="associado">Nome Associado</Label>
              <Input id="associado" value={reservationInfo.associado} onChange={(e) => setReservationInfo({ ...reservationInfo, associado: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <div className="space-y-2 flex-1">
                <Label htmlFor="data">Data</Label>
                <Input type="date" id="data" value={reservationInfo.data} onChange={(e) => setReservationInfo({ ...reservationInfo, data: e.target.value })} />
              </div>
              <div className="space-y-2 flex-1">
                <Label htmlFor="hora">Hora</Label>
                <Input type="time" id="hora" value={reservationInfo.hora} onChange={(e) => setReservationInfo({ ...reservationInfo, hora: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReserveDialog({ open: false, equipmentId: null })}>Cancelar</Button>
            <Button onClick={confirmReserve}>Confirmar Reserva</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remover Equipamentos Dialog */}
      <Dialog open={removeDialog.open} onOpenChange={(open) => setRemoveDialog({ open, equipmentIds: [] })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover Equipamentos</DialogTitle>
            <DialogDescription>Informe os IDs dos equipamentos que deseja remover, separados por vírgula.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Ex: id1,id2,id3"
              value={removeDialog.equipmentIds.join(",")}
              onChange={(e) => setRemoveDialog({ ...removeDialog, equipmentIds: e.target.value.split(",") })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveDialog({ open: false, equipmentIds: [] })}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRemoveEquipments}>Remover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
