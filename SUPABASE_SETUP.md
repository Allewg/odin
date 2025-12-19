# Configuración de Supabase para ODIN GYM

Esta guía te ayudará a configurar Supabase como backend para el sistema de autenticación y reservas de ODIN GYM.

## 📋 Requisitos Previos

1. Cuenta en [Supabase](https://supabase.com) (gratuita)
2. Navegador web moderno
3. Conocimientos básicos de SQL (opcional, pero recomendado)

## 🚀 Paso 1: Crear Proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Haz clic en "Start your project" o "Sign in"
3. Crea una cuenta o inicia sesión
4. Haz clic en "New Project"
5. Completa el formulario:
   - **Name:** odin-gym (o el nombre que prefieras)
   - **Database Password:** Crea una contraseña segura (guárdala)
   - **Region:** Elige la región más cercana (ej: South America)
   - **Pricing Plan:** Free (gratis)
6. Haz clic en "Create new project"
7. Espera 2-3 minutos mientras se crea el proyecto

## 🔑 Paso 2: Obtener Credenciales

1. En el dashboard de tu proyecto, ve a **Settings** (⚙️) > **API**
2. Copia los siguientes valores:
   - **Project URL** (ej: `https://xxxxx.supabase.co`)
   - **anon public** key (la clave pública)

3. Abre el archivo `assets/supabase.js` en tu proyecto
4. Reemplaza las siguientes líneas:

```javascript
const SUPABASE_URL = 'TU_SUPABASE_URL_AQUI';
const SUPABASE_ANON_KEY = 'TU_SUPABASE_ANON_KEY_AQUI';
```

Con tus credenciales reales:

```javascript
const SUPABASE_URL = 'https://xxxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

## 🗄️ Paso 3: Crear Tablas en la Base de Datos

1. En el dashboard de Supabase, ve a **SQL Editor** (en el menú lateral)
2. Haz clic en "New query"
3. Copia y pega el siguiente SQL:

```sql
-- Tabla de Servicios
CREATE TABLE IF NOT EXISTS services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    duration INTEGER NOT NULL DEFAULT 60, -- en minutos
    cost DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Slots (horarios disponibles)
CREATE TABLE IF NOT EXISTS slots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    date_time TIMESTAMP WITH TIME ZONE NOT NULL,
    available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(service_id, date_time)
);

-- Tabla de Reservas
CREATE TABLE IF NOT EXISTS bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    slot_id UUID NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(slot_id, status) WHERE status = 'confirmed' -- Evita doble reserva
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_slots_service_date ON slots(service_id, date_time);
CREATE INDEX IF NOT EXISTS idx_slots_available ON slots(available) WHERE available = true;
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_slot ON bookings(slot_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status) WHERE status = 'confirmed';
```

4. Haz clic en "Run" o presiona `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
5. Deberías ver un mensaje de éxito

## 🔒 Paso 4: Configurar Row Level Security (RLS)

### Habilitar RLS en las tablas

```sql
-- Habilitar RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
```

### Políticas para Services (todos pueden leer)

```sql
-- Todos pueden ver servicios
CREATE POLICY "Servicios son públicos para lectura"
ON services FOR SELECT
USING (true);
```

### Políticas para Slots (todos pueden leer slots disponibles)

```sql
-- Todos pueden ver slots disponibles
CREATE POLICY "Slots disponibles son públicos"
ON slots FOR SELECT
USING (available = true);
```

### Políticas para Bookings (usuarios solo ven sus propias reservas)

```sql
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
```

## 📝 Paso 5: Insertar Datos Iniciales

### Insertar un servicio de ejemplo

```sql
-- Insertar servicio "Clases particulares"
INSERT INTO services (name, description, duration, cost)
VALUES (
    'Clases particulares',
    'Entrenamiento personalizado de 1 hora con profesor certificado',
    60,
    0
);
```

### Generar slots para el próximo mes

Puedes usar la función `generateSlots` desde el navegador después de cargar la página, o ejecutar este SQL:

```sql
-- Función para generar slots (ejecutar una vez)
CREATE OR REPLACE FUNCTION generate_slots_for_service(
    p_service_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS INTEGER AS $$
DECLARE
    current_date DATE;
    slot_datetime TIMESTAMP WITH TIME ZONE;
    slots_count INTEGER := 0;
    day_of_week INTEGER;
    start_hour INTEGER;
    end_hour INTEGER;
BEGIN
    current_date := p_start_date;
    
    WHILE current_date <= p_end_date LOOP
        day_of_week := EXTRACT(DOW FROM current_date);
        
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
                slot_datetime := (current_date + (hour || ' hours')::INTERVAL)::TIMESTAMP WITH TIME ZONE;
                
                INSERT INTO slots (service_id, date_time, available)
                VALUES (p_service_id, slot_datetime, true)
                ON CONFLICT (service_id, date_time) DO NOTHING;
                
                slots_count := slots_count + 1;
            END LOOP;
        END IF;
        
        current_date := current_date + INTERVAL '1 day';
    END LOOP;
    
    RETURN slots_count;
END;
$$ LANGUAGE plpgsql;

-- Generar slots para el próximo mes (ejemplo)
-- Primero obtén el ID del servicio:
-- SELECT id FROM services WHERE name = 'Clases particulares';

-- Luego ejecuta (reemplaza 'SERVICE_ID' con el ID real):
-- SELECT generate_slots_for_service(
--     'SERVICE_ID'::UUID,
--     CURRENT_DATE,
--     CURRENT_DATE + INTERVAL '2 months'
-- );
```

## 🧪 Paso 6: Probar la Configuración

1. Abre `index.html` en tu navegador
2. Ve a la sección "Mi Cuenta"
3. Intenta registrarte con un email de prueba
4. Verifica tu email (Supabase enviará un enlace de confirmación)
5. Inicia sesión
6. Ve a "Explora y Reserva Nuestros Servicios"
7. Selecciona un servicio y verifica que aparezcan slots en el calendario

## 🔧 Configuración Adicional (Opcional)

### Configurar Email Templates

1. Ve a **Settings** > **Auth** > **Email Templates**
2. Personaliza los templates de email según tu marca

### Configurar Redirect URLs

1. Ve a **Settings** > **Auth** > **URL Configuration**
2. Agrega tu dominio a "Site URL" (ej: `https://odingym.cl`)
3. Agrega URLs de redirección permitidas

### Habilitar Magic Links

Los magic links ya están habilitados por defecto. Los usuarios pueden usar "O usa un enlace mágico" en el formulario de login.

## 📊 Monitoreo

- **Dashboard:** Ve a **Database** > **Tables** para ver tus datos
- **Logs:** Ve a **Logs** para ver errores y actividad
- **Auth:** Ve a **Authentication** > **Users** para ver usuarios registrados

## 🐛 Solución de Problemas

### Error: "Invalid API key"
- Verifica que copiaste correctamente la URL y la clave anon
- Asegúrate de que no hay espacios extra

### Error: "relation does not exist"
- Verifica que ejecutaste todos los scripts SQL en orden
- Revisa que las tablas se crearon correctamente en **Database** > **Tables**

### No aparecen slots en el calendario
- Verifica que insertaste un servicio
- Verifica que generaste slots para ese servicio
- Revisa la consola del navegador (F12) para ver errores

### RLS bloquea las consultas
- Verifica que ejecutaste todas las políticas RLS
- Revisa que las políticas están habilitadas en **Authentication** > **Policies**

## 📚 Recursos Adicionales

- [Documentación de Supabase](https://supabase.com/docs)
- [Guía de RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)

## ✅ Checklist Final

- [ ] Proyecto creado en Supabase
- [ ] Credenciales configuradas en `assets/supabase.js`
- [ ] Tablas creadas (services, slots, bookings)
- [ ] RLS habilitado y políticas configuradas
- [ ] Servicio de ejemplo insertado
- [ ] Slots generados para el próximo mes
- [ ] Registro de usuario funciona
- [ ] Login funciona
- [ ] Calendario muestra slots disponibles
- [ ] Reserva funciona
- [ ] Cancelación de reserva funciona

---

**¡Listo!** Tu sistema de reservas está configurado y funcionando. 🎉


