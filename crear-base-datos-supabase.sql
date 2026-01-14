-- ============================================
-- Script Completo de Creación de Base de Datos
-- ODIN GYM - Sistema de Reservas
-- ============================================
-- 
-- INSTRUCCIONES:
-- 1. Ve a tu proyecto en Supabase
-- 2. Abre el SQL Editor
-- 3. Copia y pega TODO este script
-- 4. Ejecuta el script (Ctrl+Enter o Cmd+Enter)
-- 5. Verifica que no haya errores
--
-- Este script crea:
-- - Tablas: services, slots, bookings
-- - Índices para optimización
-- - Políticas RLS (Row Level Security)
-- - Función para generar slots automáticamente
-- - Datos iniciales (servicio "Clase de Regalo")
-- ============================================

-- ============================================
-- PASO 1: ELIMINAR TABLAS EXISTENTES (si existen)
-- ============================================
-- Descomenta las siguientes líneas si necesitas eliminar todo y empezar de cero
-- CUIDADO: Esto eliminará todos los datos existentes

-- DROP TABLE IF EXISTS bookings CASCADE;
-- DROP TABLE IF EXISTS slots CASCADE;
-- DROP TABLE IF EXISTS services CASCADE;
-- DROP FUNCTION IF EXISTS generate_slots_for_service CASCADE;

-- ============================================
-- PASO 2: CREAR TABLAS
-- ============================================

-- Tabla: services (Servicios disponibles)
CREATE TABLE IF NOT EXISTS services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    duration INTEGER NOT NULL DEFAULT 60, -- Duración en minutos
    cost DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: slots (Horarios disponibles para cada servicio)
CREATE TABLE IF NOT EXISTS slots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    date_time TIMESTAMP WITH TIME ZONE NOT NULL,
    available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(service_id, date_time) -- Un slot único por servicio y fecha/hora
);

-- Tabla: bookings (Reservas realizadas por usuarios)
CREATE TABLE IF NOT EXISTS bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    slot_id UUID NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PASO 3: CREAR ÍNDICES PARA OPTIMIZACIÓN
-- ============================================

-- Índices para slots
CREATE INDEX IF NOT EXISTS idx_slots_service_date ON slots(service_id, date_time);
CREATE INDEX IF NOT EXISTS idx_slots_available ON slots(available) WHERE available = true;
CREATE INDEX IF NOT EXISTS idx_slots_date_time ON slots(date_time);

-- Índices para bookings
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_slot ON bookings(slot_id);
CREATE INDEX IF NOT EXISTS idx_bookings_service ON bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status) WHERE status = 'confirmed';
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);

-- Índice único parcial: Evita doble reserva del mismo slot
-- Solo permite una reserva confirmada por slot
DROP INDEX IF EXISTS idx_bookings_unique_slot_confirmed;
CREATE UNIQUE INDEX idx_bookings_unique_slot_confirmed 
ON bookings(slot_id) 
WHERE status = 'confirmed';

-- ============================================
-- PASO 4: HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PASO 5: ELIMINAR POLÍTICAS EXISTENTES (si las hay)
-- ============================================

-- Políticas para services
DROP POLICY IF EXISTS "Servicios son públicos para lectura" ON services;

-- Políticas para slots
DROP POLICY IF EXISTS "Slots disponibles son públicos" ON slots;

-- Políticas para bookings
DROP POLICY IF EXISTS "Usuarios ven sus propias reservas" ON bookings;
DROP POLICY IF EXISTS "Usuarios pueden crear reservas" ON bookings;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus reservas" ON bookings;
DROP POLICY IF EXISTS "Admins ven todas las reservas" ON bookings;
DROP POLICY IF EXISTS "Admins pueden actualizar reservas" ON bookings;

-- ============================================
-- PASO 6: CREAR POLÍTICAS RLS
-- ============================================

-- Política para services: Todos pueden leer servicios (público)
CREATE POLICY "Servicios son públicos para lectura"
ON services FOR SELECT
USING (true);

-- Política para slots: Todos pueden ver slots disponibles
CREATE POLICY "Slots disponibles son públicos"
ON slots FOR SELECT
USING (available = true);

-- Políticas para bookings: Usuarios solo ven y gestionan sus propias reservas
CREATE POLICY "Usuarios ven sus propias reservas"
ON bookings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden crear reservas"
ON bookings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden actualizar sus reservas"
ON bookings FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Políticas para administradores
-- NOTA: Los emails de admin se configuran aquí. Actualiza según tus necesidades.
CREATE POLICY "Admins ven todas las reservas"
ON bookings FOR SELECT
USING (
    -- Verificar si el email del usuario está en la lista de admins
    auth.jwt() ->> 'email' IN ('allewmella@gmail.com', 'admin@odingym.cl')
    OR auth.uid() = user_id -- O si es su propia reserva
);

CREATE POLICY "Admins pueden actualizar reservas"
ON bookings FOR UPDATE
USING (
    auth.jwt() ->> 'email' IN ('allewmella@gmail.com', 'admin@odingym.cl')
);

-- ============================================
-- PASO 7: CREAR FUNCIÓN PARA GENERAR SLOTS
-- ============================================

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
        
        -- Configuración de horarios según día de la semana
        -- 0 = Domingo (cerrado)
        -- 1-5 = Lunes a Viernes (06:00-22:00)
        -- 6 = Sábado (08:00-14:00)
        start_hour := NULL;
        end_hour := NULL;
        
        -- Lunes a Viernes: 06:00-22:00
        IF day_of_week >= 1 AND day_of_week <= 5 THEN
            start_hour := 6;
            end_hour := 22;
        -- Sábado: 08:00-14:00
        ELSIF day_of_week = 6 THEN
            start_hour := 8;
            end_hour := 14;
        END IF;
        -- Domingo: cerrado (no se generan slots)
        
        -- Generar slots cada hora si el día está configurado
        IF start_hour IS NOT NULL AND end_hour IS NOT NULL THEN
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

-- ============================================
-- PASO 8: INSERTAR DATOS INICIALES
-- ============================================

-- Insertar servicio "Clase de Regalo" (si no existe)
INSERT INTO services (name, description, duration, cost)
VALUES (
    'Clase de Regalo',
    'Clase de prueba gratuita de 1 hora. Sin compromiso, sin tarjeta de crédito.',
    60,
    0
)
ON CONFLICT DO NOTHING;

-- Si el servicio ya existe con otro nombre similar, actualizarlo
UPDATE services 
SET name = 'Clase de Regalo',
    description = 'Clase de prueba gratuita de 1 hora. Sin compromiso, sin tarjeta de crédito.',
    duration = 60,
    cost = 0,
    updated_at = NOW()
WHERE name ILIKE '%regalo%' 
   OR name ILIKE '%prueba%' 
   OR name ILIKE '%gratis%'
   OR name ILIKE '%trial%';

-- ============================================
-- PASO 9: GENERAR SLOTS INICIALES
-- ============================================

-- Generar slots para "Clase de Regalo" (próximos 2 meses)
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
        
        RAISE NOTICE '✓ Se generaron % slots para "Clase de Regalo"', slots_generados;
    ELSE
        RAISE NOTICE '⚠ No se encontró el servicio "Clase de Regalo"';
    END IF;
END $$;

-- ============================================
-- PASO 10: VERIFICACIÓN FINAL
-- ============================================

-- Mostrar resumen de lo creado
SELECT 
    '✓ Tablas creadas exitosamente' as estado,
    (SELECT COUNT(*) FROM services) as servicios,
    (SELECT COUNT(*) FROM slots) as slots,
    (SELECT COUNT(*) FROM bookings) as reservas;

-- Verificar políticas RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('services', 'slots', 'bookings')
ORDER BY tablename, policyname;

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
-- 
-- Si todo salió bien, deberías ver:
-- - Mensaje de éxito
-- - Conteo de servicios, slots y reservas
-- - Lista de políticas RLS creadas
--
-- PRÓXIMOS PASOS:
-- 1. Verifica que las credenciales en assets/supabase.js sean correctas
-- 2. Prueba crear un usuario desde la aplicación
-- 3. Verifica que los slots aparezcan en el calendario
-- 4. Prueba hacer una reserva
--
-- ============================================
