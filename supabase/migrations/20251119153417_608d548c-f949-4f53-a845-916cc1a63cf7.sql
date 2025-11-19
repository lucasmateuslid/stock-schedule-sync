-- Corrigir search_path nas functions

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION calculate_expiration_time(reservation_time TIMESTAMPTZ)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  expiration_time TIMESTAMPTZ;
  reservation_hour INTEGER;
  reservation_date DATE;
BEGIN
  reservation_hour := EXTRACT(HOUR FROM reservation_time);
  reservation_date := reservation_time::DATE;
  
  IF reservation_hour < 17 THEN
    expiration_time := (reservation_date + TIME '17:00:00')::TIMESTAMPTZ;
  ELSE
    expiration_time := ((reservation_date + INTERVAL '1 day') + TIME '17:00:00')::TIMESTAMPTZ;
  END IF;
  
  RETURN expiration_time;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;