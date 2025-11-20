import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, CheckCircle, Clock, AlertCircle } from "lucide-react";

import { collection, getDocs } from "firebase/firestore";
// 🔥 Firebase (corrigido)
import { db } from "/src/lib/firebase";

export default function Dashboard() {
  const [stats, setStats] = useState({
    total: 0,
    disponivel: 0,
    reservado: 0,
    utilizado: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Busca os documentos da coleção `equipments` no Firestore
      const querySnapshot = await getDocs(collection(db, "equipments"));

      const equipamentos = querySnapshot.docs.map((doc) => doc.data());

      const computedStats = {
        total: equipamentos.length || 0,
        disponivel:
          equipamentos.filter((e) => e.status === "disponivel").length || 0,
        reservado:
          equipamentos.filter((e) => e.status === "reservado").length || 0,
        utilizado:
          equipamentos.filter((e) => e.status === "utilizado").length || 0,
      };

      setStats(computedStats);
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total de Equipamentos",
      value: stats.total,
      icon: Package,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Disponíveis",
      value: stats.disponivel,
      icon: CheckCircle,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Reservados",
      value: stats.reservado,
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Utilizados",
      value: stats.utilizado,
      icon: AlertCircle,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Visão geral do sistema de gestão
          </p>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-3">
                  <div className="h-4 w-32 bg-muted rounded"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-10 w-16 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card
                  key={stat.title}
                  className="hover:shadow-lg transition-shadow duration-base"
                >
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <div className={`rounded-full p-2 ${stat.bgColor}`}>
                      <Icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stat.value}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
