-- ============================================
-- Script de Configuración Supabase - ODIN GYM
-- Ejecuta este script en el SQL Editor de Supabase
-- ============================================

-- 1. Verificar/Crear tabla de servicios
CREATE TABLE IF NOT EXISTS services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    duration INTEGER NOT NULL DEFAULT 60,
    cost DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Verificar/Crear tabla de slots
CREATE TABLE IF NOT EXISTS slots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    date_time TIMESTAMP WITH TIME ZONE NOT NULL,
    available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(service_id, date_time)
);

-- 3. Verificar/Crear tabla de bookings
CREATE TABLE IF NOT EXISTS bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    slot_id UUID NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_slots_service_date ON slots(service_id, date_time);
CREATE INDEX IF NOT EXISTS idx_slots_available ON slots(available) WHERE available = true;
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_slot ON bookings(slot_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status) WHERE status = 'confirmed';

-- 4.1. Crear índice único parcial para evitar doble reserva del mismo slot
-- Esto reemplaza la restricción UNIQUE con WHERE que no es válida en CREATE TABLE
DROP INDEX IF EXISTS idx_bookings_unique_slot_confirmed;
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_unique_slot_confirmed 
ON bookings(slot_id) 
WHERE status = 'confirmed';

-- 5. Habilitar RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- 6. Eliminar políticas existentes (si las hay) para recrearlas
DROP POLICY IF EXISTS "Servicios son públicos para lectura" ON services;
DROP POLICY IF EXISTS "Slots disponibles son públicos" ON slots;
DROP POLICY IF EXISTS "Usuarios ven sus propias reservas" ON bookings;
DROP POLICY IF EXISTS "Usuarios pueden crear reservas" ON bookings;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus reservas" ON bookings;

-- 7. Crear políticas RLS para services (lectura pública)
CREATE POLICY "Servicios son públicos para lectura"
ON services FOR SELECT
USING (true);

-- 8. Crear políticas RLS para slots (lectura pública de disponibles)
CREATE POLICY "Slots disponibles son públicos"
ON slots FOR SELECT
USING (available = true);

-- 9. Crear políticas RLS para bookings
-- Usuarios pueden ver sus propias reservas
CREATE POLICY "Usuarios ven sus propias reservas"
ON bookings FOR SELECT
USING (auth.uid() = user_id);

-- Usuarios pueden crear sus propias reservas
CREATE POLICY "Usuarios pueden crear reservas"
ON bookings FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Usuarios pueden actualizar sus propias reservas (para cancelar)
CREATE POLICY "Usuarios pueden actualizar sus reservas"
ON bookings FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 10. Insertar o actualizar servicio "Clase de Regalo"
INSERT INTO services (name, description, duration, cost)
VALUES (
    'Clase de Regalo',
    'Clase de prueba gratuita de 1 hora. Sin compromiso, sin tarjeta de crédito.',
    60,
    0
)
ON CONFLICT DO NOTHING;

-- Si el servicio ya existe con otro nombre, actualizarlo
UPDATE services 
SET name = 'Clase de Regalo',
    description = 'Clase de prueba gratuita de 1 hora. Sin compromiso, sin tarjeta de crédito.',
    duration = 60,
    cost = 0
WHERE name ILIKE '%regalo%' OR name ILIKE '%prueba%' OR name ILIKE '%gratis%';

-- 11. Función para generar slots (si no existe)
CREATE OR REPLACE FUNCTION generate_slots_for_service(
    p_service_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS INTEGER AS $$
DECLARE
    current_day DATE;
    slot_datetime TIMESTAMP WITH TIME ZONE;
    slots_count INTEGER := 0;
    day_of_week INTEGER;
    start_hour INTEGER;
    end_hour INTEGER;
BEGIN
    current_day := p_start_date;
    
    WHILE current_day <= p_end_date LOOP
        day_of_week := EXTRACT(DOW FROM current_day);
        
        -- Solo días laborables (1=Lunes, 5=Viernes)
        IF day_of_week >= 1 AND day_of_week <= 5 THEN
            -- Lunes a Jueves: 06:00-23:00
            IF day_of_week >= 1 AND day_of_week <= 4 THEN
                start_hour := 6;
                end_hour := 23;
            -- Viernes: 06:00-22:00
            ELSIF day_of_week = 5 THEN
                start_hour := 6;
                end_hour := 22;
            END IF;
            
            -- Generar slots cada hora
            FOR hour IN start_hour..(end_hour - 1) LOOP
                slot_datetime := (current_day + (hour || ' hours')::INTERVAL)::TIMESTAMP WITH TIME ZONE;
                
                INSERT INTO slots (service_id, date_time, available)
                VALUES (p_service_id, slot_datetime, true)
                ON CONFLICT (service_id, date_time) DO NOTHING;
                
                slots_count := slots_count + 1;
            END LOOP;
        END IF;
        
        current_day := current_day + INTERVAL '1 day';
    END LOOP;
    
    RETURN slots_count;
END;
$$ LANGUAGE plpgsql;

-- 12. Generar slots para "Clase de Regalo" (próximos 2 meses)
DO $$
DECLARE
    servicio_id UUID;
    slots_generados INTEGER;
BEGIN
    -- Obtener ID del servicio "Clase de Regalo"
    SELECT id INTO servicio_id 
    FROM services 
    WHERE name = 'Clase de Regalo' 
    LIMIT 1;
    
    IF servicio_id IS NOT NULL THEN
        -- Generar slots para los próximos 2 meses
        SELECT generate_slots_for_service(
            servicio_id,
            CURRENT_DATE,
            (CURRENT_DATE + INTERVAL '2 months')::DATE
        ) INTO slots_generados;
        
        RAISE NOTICE 'Se generaron % slots para Clase de Regalo', slots_generados;
    ELSE
        RAISE NOTICE 'No se encontró el servicio "Clase de Regalo"';
    END IF;
END $$;

-- ============================================
-- Verificación final
-- ============================================
SELECT 
    'Servicios creados: ' || COUNT(*)::TEXT as info
FROM services;

SELECT 
    'Slots generados: ' || COUNT(*)::TEXT as info
FROM slots;

SELECT 
    'Configuración completada exitosamente!' as mensaje;

