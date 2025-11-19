-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum para empresas
CREATE TYPE empresa_type AS ENUM ('LOCK', 'ALO');

-- Enum para status de equipamentos
CREATE TYPE equipment_status AS ENUM ('disponivel', 'reservado', 'utilizado');

-- Enum para perfis de usuário
CREATE TYPE user_role AS ENUM ('admin', 'consultor');

-- Tabela de perfis de usuário
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'consultor',
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de técnicos
CREATE TABLE public.technicians (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inserir técnicos iniciais
INSERT INTO public.technicians (nome) VALUES
  ('Josué'),
  ('Dyego'),
  ('Eduardo'),
  ('Ciro'),
  ('Otavio');

-- Tabela de equipamentos
CREATE TABLE public.equipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  imei TEXT NOT NULL UNIQUE,
  iccid TEXT NOT NULL UNIQUE,
  empresa empresa_type NOT NULL,
  status equipment_status NOT NULL DEFAULT 'disponivel',
  reservado_por TEXT,
  data_reserva TIMESTAMPTZ,
  remover_apos TIMESTAMPTZ,
  tecnico_id UUID REFERENCES public.technicians(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de agenda
CREATE TABLE public.agenda (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tecnico_id UUID NOT NULL REFERENCES public.technicians(id) ON DELETE CASCADE,
  inicio TIMESTAMPTZ NOT NULL,
  fim TIMESTAMPTZ NOT NULL,
  motivo TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de logs de auditoria
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  equipment_id UUID REFERENCES public.equipments(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Function para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at em equipments
CREATE TRIGGER update_equipments_updated_at
  BEFORE UPDATE ON public.equipments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para updated_at em profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function para criar perfil automaticamente ao criar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    'consultor'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para criar perfil ao criar usuário
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function para calcular data de expiração de reserva
CREATE OR REPLACE FUNCTION calculate_expiration_time(reservation_time TIMESTAMPTZ)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  expiration_time TIMESTAMPTZ;
  reservation_hour INTEGER;
  reservation_date DATE;
BEGIN
  reservation_hour := EXTRACT(HOUR FROM reservation_time);
  reservation_date := reservation_time::DATE;
  
  -- Se reserva antes das 17h, expira às 17h do mesmo dia
  IF reservation_hour < 17 THEN
    expiration_time := (reservation_date + TIME '17:00:00')::TIMESTAMPTZ;
  ELSE
    -- Se reserva após 17h, expira às 17h do próximo dia útil
    -- Simplificação: próximo dia (pode ser melhorado para pular fins de semana)
    expiration_time := ((reservation_date + INTERVAL '1 day') + TIME '17:00:00')::TIMESTAMPTZ;
  END IF;
  
  RETURN expiration_time;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function para expirar reservas automáticas
CREATE OR REPLACE FUNCTION expire_reservations()
RETURNS void AS $$
BEGIN
  UPDATE public.equipments
  SET 
    status = 'disponivel',
    reservado_por = NULL,
    data_reserva = NULL,
    remover_apos = NULL
  WHERE 
    status = 'reservado' 
    AND remover_apos IS NOT NULL 
    AND remover_apos < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function para audit log em equipments
CREATE OR REPLACE FUNCTION log_equipment_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.audit_logs (user_id, equipment_id, action_type, details)
    VALUES (
      auth.uid(),
      NEW.id,
      'UPDATE_EQUIPMENT',
      jsonb_build_object(
        'old', row_to_json(OLD),
        'new', row_to_json(NEW)
      )
    );
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO public.audit_logs (user_id, equipment_id, action_type, details)
    VALUES (
      auth.uid(),
      NEW.id,
      'CREATE_EQUIPMENT',
      row_to_json(NEW)::jsonb
    );
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.audit_logs (user_id, equipment_id, action_type, details)
    VALUES (
      auth.uid(),
      OLD.id,
      'DELETE_EQUIPMENT',
      row_to_json(OLD)::jsonb
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para audit em equipments
CREATE TRIGGER audit_equipment_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.equipments
  FOR EACH ROW
  EXECUTE FUNCTION log_equipment_changes();

-- RLS Policies

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies para profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policies para technicians (read-only para todos)
CREATE POLICY "Everyone can view technicians"
  ON public.technicians FOR SELECT
  TO authenticated
  USING (true);

-- Policies para equipments
CREATE POLICY "Everyone can view equipments"
  ON public.equipments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Consultores can update equipments"
  ON public.equipments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can insert equipments"
  ON public.equipments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete equipments"
  ON public.equipments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policies para agenda
CREATE POLICY "Everyone can view agenda"
  ON public.agenda FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage agenda"
  ON public.agenda FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policies para audit_logs (somente admins)
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Índices para performance
CREATE INDEX idx_equipments_status ON public.equipments(status);
CREATE INDEX idx_equipments_empresa ON public.equipments(empresa);
CREATE INDEX idx_equipments_tecnico ON public.equipments(tecnico_id);
CREATE INDEX idx_agenda_tecnico ON public.agenda(tecnico_id);
CREATE INDEX idx_agenda_dates ON public.agenda(inicio, fim);
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_equipment ON public.audit_logs(equipment_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);