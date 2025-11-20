import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

export default function NovoEquipamento() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const [technicians, setTechnicians] = useState<any[]>([]);
  const [empresa, setEmpresa] = useState<"LOCK" | "ALO">("LOCK");
  const [tecnico, setTecnico] = useState<string>("");
  const [bulkText, setBulkText] = useState("");
  const [loading, setLoading] = useState(false);
  const [invalidLines, setInvalidLines] = useState<number[]>([]);

  useEffect(() => {
    if (!isAdmin) {
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Você não tem permissão para acessar esta página",
      });
      navigate("/equipamentos");
    } else {
      fetchTechnicians();
    }
  }, [isAdmin]);

  // 🔥 Buscar técnicos do Firestore
  const fetchTechnicians = async () => {
    try {
      const q = query(collection(db, "technicians"), orderBy("nome"));
      const snapshot = await getDocs(q);

      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setTechnicians(list);
    } catch (error) {
      console.error("Erro ao buscar técnicos:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os técnicos",
      });
    }
  };

  const handleSubmit = async () => {
    if (!bulkText.trim()) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Informe ao menos um equipamento",
      });
      return;
    }

    setLoading(true);
    setInvalidLines([]);

    try {
      const lines = bulkText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line);

      const duplicateCheck: Record<string, number> = {};
      const invalid: number[] = [];

      const equipmentsToInsert: any[] = [];

      // 🔥 Buscar IMEIs + ICCIDs existentes
      const snapshot = await getDocs(collection(db, "equipments"));

      const existingImei = new Set(
        snapshot.docs.map((d) => d.data().imei).filter(Boolean)
      );

      const existingIccid = new Set(
        snapshot.docs.map((d) => d.data().iccid).filter(Boolean)
      );

      lines.forEach((line, index) => {
        const [imei, iccid] = line.split(",").map((v) => v.trim());

        if (!imei || !iccid) {
          invalid.push(index + 1);
          return;
        }

        // IMEI ou ICCID já cadastrados
        if (existingImei.has(imei) || existingIccid.has(iccid)) {
          invalid.push(index + 1);
          return;
        }

        // Duplicado no próprio batch
        if (duplicateCheck[imei] || duplicateCheck[iccid]) {
          invalid.push(index + 1);
          return;
        }

        duplicateCheck[imei] = 1;
        duplicateCheck[iccid] = 1;

        equipmentsToInsert.push({
          imei,
          iccid,
          empresa,
          tecnico_id: tecnico || null,
          created_at: new Date(),
        });
      });

      if (invalid.length > 0) {
        setInvalidLines(invalid);
        toast({
          variant: "destructive",
          title: "Linhas inválidas",
          description: `Linhas com problemas: ${invalid.join(", ")}`,
        });
        setLoading(false);
        return;
      }

      // 🔥 Inserção em massa
      for (const eq of equipmentsToInsert) {
        await addDoc(collection(db, "equipments"), eq);
      }

      toast({
        title: "Equipamentos cadastrados",
        description: `${equipmentsToInsert.length} equipamento(s) adicionados`,
      });

      navigate("/equipamentos");
    } catch (error: any) {
      console.error("Erro ao cadastrar equipamentos:", error);
      toast({
        variant: "destructive",
        title: "Erro ao cadastrar",
        description: error.message || "Tente novamente mais tarde",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto py-10 space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Novo Equipamento</h1>
        <p className="text-muted-foreground">
          Cadastre equipamentos individualmente ou em massa.
          Cada linha deve conter: <strong>IMEI, ICCID</strong>
        </p>

        <div className="space-y-4">
          {/* EMPRESA */}
          <div className="space-y-2">
            <Label>Empresa</Label>
            <Select value={empresa} onValueChange={(v) => setEmpresa(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOCK">LOCK</SelectItem>
                <SelectItem value="ALO">ALO</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* TÉCNICO */}
          <div className="space-y-2">
            <Label>Técnico (opcional)</Label>
            <Select value={tecnico} onValueChange={(v) => setTecnico(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o técnico" />
              </SelectTrigger>
              <SelectContent>
                {technicians.map((tech) => (
                  <SelectItem key={tech.id} value={tech.id}>
                    {tech.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* TEXTO EM MASSA */}
          <div className="space-y-2">
            <Label>IMEI, ICCID (uma linha por equipamento)</Label>
            <Textarea
              className={invalidLines.length > 0 ? "border-red-500" : ""}
              placeholder={`Exemplo:\n863238076524042,8955680000000657525\n860828080191391,8955680000000657526`}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={10}
            />
            {invalidLines.length > 0 && (
              <p className="text-red-500 text-sm">
                Linhas com problemas: {invalidLines.join(", ")}
              </p>
            )}
          </div>

          {/* BOTÕES */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => navigate("/equipamentos")}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Salvando..." : "Cadastrar"}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
