import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Bem-vindo ao Sistema</h1>

        <p className="mt-3 text-lg text-muted-foreground max-w-xl">
          Gerencie equipamentos, rastreamento, clientes e auditoria em um único lugar.
        </p>

        <Link to="/dashboard" className="mt-6">
          <Button className="gap-2">
            Acessar Dashboard
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </AppLayout>
  );
};

export default Index;
