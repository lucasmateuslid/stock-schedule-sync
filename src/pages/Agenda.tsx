import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Clock } from "lucide-react";

interface ReservationInfo {
  name: string;
  placa: string;
  associado: string;
  data: string;
  hora: string;
}

export default function Agendamento() {
  const location = useLocation();
  const reservation = location.state?.reservation as ReservationInfo | undefined;
  const [agendaItems, setAgendaItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgenda();
  }, []);

  const fetchAgenda = async () => {
    try {
      const { data, error } = await supabase
        .from("agenda")
        .select(`*, technician:technicians(nome)`)
        .order("inicio", { ascending: true });

      if (error) throw error;
      setAgendaItems(data || []);
    } catch (error) {
      console.error("Error fetching agenda:", error);
    } finally {
      setLoading(false);
    }
  };

  const isEventActive = (inicio: string, fim: string) => {
    const now = new Date();
    const start = new Date(inicio);
    const end = new Date(fim);
    return now >= start && now <= end;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agendamento</h1>
          <p className="text-muted-foreground mt-1">
            Visualize os equipamentos reservados e a disponibilidade dos técnicos
          </p>
        </div>

        {/* Se houver reserva de equipamento enviada */}
        {reservation && (
          <Card className="border-yellow-400 bg-yellow-100">
            <CardHeader>
              <CardTitle>Equipamento Reservado</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
              <p><strong>Nome:</strong> {reservation.name}</p>
              <p><strong>Placa:</strong> {reservation.placa}</p>
              <p><strong>Associado:</strong> {reservation.associado}</p>
              <p><strong>Data:</strong> {reservation.data}</p>
              <p><strong>Hora:</strong> {reservation.hora}</p>
            </CardContent>
          </Card>
        )}

        {/* Lista de agenda do Supabase */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-lg"></div>
            ))}
          </div>
        ) : agendaItems.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Nenhum agendamento encontrado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {agendaItems.map((item) => (
              <Card
                key={item.id}
                className={`hover:shadow-lg transition-shadow duration-base ${
                  isEventActive(item.inicio, item.fim) ? "border-primary" : ""
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">
                        {item.technician?.nome || "Técnico não encontrado"}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">{item.motivo}</p>
                    </div>
                    {isEventActive(item.inicio, item.fim) ? (
                      <Badge className="bg-destructive">Em Andamento</Badge>
                    ) : new Date(item.fim) < new Date() ? (
                      <Badge variant="secondary">Concluído</Badge>
                    ) : (
                      <Badge variant="outline">Agendado</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format(new Date(item.inicio), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>
                        {format(new Date(item.inicio), "HH:mm", { locale: ptBR })} -{" "}
                        {format(new Date(item.fim), "HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
