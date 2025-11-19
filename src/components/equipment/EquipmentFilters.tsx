import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";

interface EquipmentFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  empresaFilter: string;
  onEmpresaFilterChange: (value: string) => void;
  tecnicoFilter: string;
  onTecnicoFilterChange: (value: string) => void;
  technicians: Array<{ id: string; nome: string }>;
}

export function EquipmentFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  empresaFilter,
  onEmpresaFilterChange,
  tecnicoFilter,
  onTecnicoFilterChange,
  technicians,
}: EquipmentFiltersProps) {
  return (
    <Card className="p-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="search">Buscar (IMEI/ICCID)</Label>
          <Input
            id="search"
            placeholder="Digite IMEI ou ICCID..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger id="status">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="disponivel">Disponível</SelectItem>
              <SelectItem value="reservado">Reservado</SelectItem>
              <SelectItem value="utilizado">Utilizado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="empresa">Empresa</Label>
          <Select value={empresaFilter} onValueChange={onEmpresaFilterChange}>
            <SelectTrigger id="empresa">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="LOCK">LOCK</SelectItem>
              <SelectItem value="ALO">ALO</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tecnico">Técnico</Label>
          <Select value={tecnicoFilter} onValueChange={onTecnicoFilterChange}>
            <SelectTrigger id="tecnico">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {technicians.map((tech) => (
                <SelectItem key={tech.id} value={tech.id}>
                  {tech.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
}
