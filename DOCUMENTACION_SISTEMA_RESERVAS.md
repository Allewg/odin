# 📚 Documentación Técnica: Sistema de Reservas para Gimnasio Multi-Sucursal

## 🎯 Visión General

Este documento describe la arquitectura, lógica y tecnología del sistema de reservas de clases para gimnasios, diseñado para escalar desde una sucursal hasta múltiples ubicaciones.

---

## 🏗️ Arquitectura del Sistema

### Stack Tecnológico

```
Frontend (Cliente)
├── HTML5 / CSS3 (Tailwind CSS)
├── JavaScript ES6+ (Vanilla)
├── Alpine.js (Reactividad UI)
├── FullCalendar.js (Visualización de calendario)
└── Supabase JS SDK (@supabase/supabase-js)

Backend (Supabase)
├── PostgreSQL (Base de datos relacional)
├── Supabase Auth (Autenticación)
├── Row Level Security (RLS) (Seguridad a nivel de fila)
├── REST API (PostgREST)
└── Realtime (Opcional, para actualizaciones en vivo)
```

### Patrón de Arquitectura

**JAMstack (JavaScript, APIs, Markup)**
- Frontend estático servido desde CDN/GitHub Pages
- Backend como servicio (BaaS) con Supabase
- Sin servidor propio, todo client-side con llamadas API

---

## 📊 Modelo de Datos

### Esquema de Base de Datos (Actual - Una Sucursal)

```sql
-- Tabla: services (Servicios disponibles)
CREATE TABLE services (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,              -- Ej: "Clase de Regalo", "Entrenamiento Personal"
    description TEXT,
    duration INTEGER DEFAULT 60,     -- Duración en minutos
    cost DECIMAL(10, 2) DEFAULT 0,   -- Costo (0 = gratis)
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Tabla: slots (Horarios disponibles)
CREATE TABLE slots (
    id UUID PRIMARY KEY,
    service_id UUID REFERENCES services(id),
    date_time TIMESTAMP NOT NULL,    -- Fecha y hora del slot
    available BOOLEAN DEFAULT true,  -- Si está disponible para reservar
    created_at TIMESTAMP,
    UNIQUE(service_id, date_time)    -- Un slot único por servicio y fecha/hora
);

-- Tabla: bookings (Reservas realizadas)
CREATE TABLE bookings (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    service_id UUID REFERENCES services(id),
    slot_id UUID REFERENCES slots(id),
    status TEXT DEFAULT 'confirmed', -- 'confirmed', 'cancelled', 'completed'
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Índice único parcial: Evita doble reserva del mismo slot
CREATE UNIQUE INDEX idx_bookings_unique_slot_confirmed 
ON bookings(slot_id) 
WHERE status = 'confirmed';
```

### Esquema Multi-Sucursal (Escalado)

```sql
-- Nueva tabla: locations (Sucursales)
CREATE TABLE locations (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,              -- Ej: "ODIN GYM Las Condes", "ODIN GYM Providencia"
    address TEXT,
    phone TEXT,
    email TEXT,
    timezone TEXT DEFAULT 'America/Santiago',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Modificar services para incluir location_id
ALTER TABLE services 
ADD COLUMN location_id UUID REFERENCES locations(id);

-- Modificar slots para incluir location_id (redundante pero útil para queries)
ALTER TABLE slots 
ADD COLUMN location_id UUID REFERENCES locations(id);

-- Modificar bookings para incluir location_id
ALTER TABLE bookings 
ADD COLUMN location_id UUID REFERENCES locations(id);

-- Tabla: location_hours (Horarios por sucursal)
CREATE TABLE location_hours (
    id UUID PRIMARY KEY,
    location_id UUID REFERENCES locations(id),
    day_of_week INTEGER NOT NULL,   -- 0=Domingo, 1=Lunes, ..., 6=Sábado
    open_hour INTEGER NOT NULL,      -- Hora de apertura (0-23)
    close_hour INTEGER NOT NULL,     -- Hora de cierre (0-23)
    is_closed BOOLEAN DEFAULT false, -- Si está cerrado ese día
    UNIQUE(location_id, day_of_week)
);

-- Tabla: instructors (Instructores por sucursal)
CREATE TABLE instructors (
    id UUID PRIMARY KEY,
    location_id UUID REFERENCES locations(id),
    user_id UUID REFERENCES auth.users(id), -- Puede ser null si no es usuario del sistema
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    specialties TEXT[],               -- Array de especialidades
    active BOOLEAN DEFAULT true
);

-- Modificar bookings para incluir instructor_id (opcional)
ALTER TABLE bookings 
ADD COLUMN instructor_id UUID REFERENCES instructors(id);
```

---

## 🔄 Flujo de Datos y Lógica de Negocio

### 1. Flujo de Autenticación

```
Usuario → Frontend (index.html)
    ↓
Click "Mi Cuenta" → Abre Modal
    ↓
Usuario ingresa email/password → handleLogin()
    ↓
Supabase Auth → Verifica credenciales
    ↓
Retorna JWT Token → Almacenado en localStorage
    ↓
Usuario autenticado → Puede ver "Mis Reservas"
```

**Código Clave:**
```javascript
// assets/supabase.js
async function handleLogin(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email, password
    });
    return { success: !error, data, error: error?.message };
}
```

### 2. Flujo de Consulta de Servicios

```
Frontend → getServices()
    ↓
Fetch API → GET /rest/v1/services
    ↓
PostgreSQL → SELECT * FROM services WHERE active = true
    ↓
RLS Policy → "Servicios son públicos para lectura"
    ↓
Retorna JSON → Frontend muestra servicios
```

**Código Clave:**
```javascript
async function getServices() {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/services?select=*&order=name`, {
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
    });
    return await response.json();
}
```

### 3. Flujo de Consulta de Slots Disponibles

```
Usuario selecciona servicio → getAvailableSlots(serviceId, startDate, endDate)
    ↓
Fetch API → GET /rest/v1/slots?service_id=eq.{id}&available=eq.true
    ↓
PostgreSQL → SELECT * FROM slots WHERE service_id = ? AND available = true
    ↓
RLS Policy → "Slots disponibles son públicos"
    ↓
Filtrado por horarios del gym (GYM_HOURS) → Cliente-side
    ↓
Retorna slots filtrados → FullCalendar.js muestra en calendario
```

**Lógica de Filtrado de Horarios:**
```javascript
// assets/supabase.js
const GYM_HOURS = {
    1: { open: 6, close: 22 },  // Lunes: 06:00-22:00
    2: { open: 6, close: 22 },   // Martes: 06:00-22:00
    // ... etc
    0: null  // Domingo: Cerrado
};

function isWithinGymHours(date) {
    const dayOfWeek = date.getDay();
    const hour = date.getHours();
    const dayConfig = GYM_HOURS[dayOfWeek];
    if (!dayConfig) return false;
    return hour >= dayConfig.open && hour < dayConfig.close;
}
```

### 4. Flujo de Creación de Reserva

```
Usuario selecciona slot → createBooking(serviceId, slotId)
    ↓
Verificar autenticación → getCurrentUser()
    ↓
Validar límite de clase de prueba (si aplica)
    ↓
Verificar que slot esté disponible → SELECT * FROM slots WHERE id = ?
    ↓
Verificar que no haya booking confirmado → SELECT * FROM bookings WHERE slot_id = ? AND status = 'confirmed'
    ↓
INSERT INTO bookings (user_id, service_id, slot_id, status)
    ↓
RLS Policy → "Usuarios pueden crear reservas" (WITH CHECK auth.uid() = user_id)
    ↓
Retorna booking creado → Frontend actualiza UI
```

**Código Clave:**
```javascript
async function createBooking(serviceId, slotId) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Debes iniciar sesión');
    
    // Verificar disponibilidad
    const { data: slot } = await supabaseClient
        .from('slots')
        .select('*')
        .eq('id', slotId)
        .single();
    
    if (!slot.available) {
        throw new Error('Slot no disponible');
    }
    
    // Crear reserva
    const { data, error } = await supabaseClient
        .from('bookings')
        .insert({
            user_id: user.id,
            service_id: serviceId,
            slot_id: slotId,
            status: 'confirmed'
        })
        .select()
        .single();
    
    return { success: !error, data, error: error?.message };
}
```

### 5. Flujo de Cancelación de Reserva

```
Usuario hace click "Cancelar" → cancelBooking(bookingId)
    ↓
Verificar que booking pertenezca al usuario → RLS Policy
    ↓
UPDATE bookings SET status = 'cancelled' WHERE id = ? AND user_id = auth.uid()
    ↓
RLS Policy → "Usuarios pueden actualizar sus reservas"
    ↓
Retorna booking actualizado → Frontend actualiza UI
```

---

## 🔒 Seguridad: Row Level Security (RLS)

### Políticas RLS Implementadas

```sql
-- 1. Servicios: Lectura pública
CREATE POLICY "Servicios son públicos para lectura"
ON services FOR SELECT
USING (true);

-- 2. Slots: Solo slots disponibles son públicos
CREATE POLICY "Slots disponibles son públicos"
ON slots FOR SELECT
USING (available = true);

-- 3. Bookings: Usuarios ven solo sus reservas
CREATE POLICY "Usuarios ven sus propias reservas"
ON bookings FOR SELECT
USING (auth.uid() = user_id);

-- 4. Bookings: Usuarios crean solo sus reservas
CREATE POLICY "Usuarios pueden crear reservas"
ON bookings FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 5. Bookings: Usuarios actualizan solo sus reservas
CREATE POLICY "Usuarios pueden actualizar reservas"
ON bookings FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### Cómo Funciona RLS

1. **auth.uid()**: Función de Supabase que retorna el UUID del usuario autenticado
2. **USING**: Condición para SELECT/UPDATE/DELETE
3. **WITH CHECK**: Condición para INSERT/UPDATE (valida datos nuevos)

**Ejemplo:**
```sql
-- Un usuario solo puede ver sus propias reservas
SELECT * FROM bookings;
-- Automáticamente filtra: WHERE user_id = auth.uid()
```

---

## 📅 Generación de Slots

### Función PostgreSQL para Generar Slots

```sql
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
        
        -- Configurar horarios según día
        IF day_of_week >= 1 AND day_of_week <= 5 THEN
            start_hour := 6;
            end_hour := 22;
        ELSIF day_of_week = 6 THEN
            start_hour := 8;
            end_hour := 14;
        END IF;
        
        -- Generar slots cada hora
        IF start_hour IS NOT NULL THEN
            FOR hour IN start_hour..(end_hour - 1) LOOP
                slot_datetime := (current_day + (hour || ' hours')::INTERVAL)::TIMESTAMP;
                
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
```

### Llamada desde JavaScript

```javascript
async function generateSlots(serviceId, startDate, endDate) {
    const { data, error } = await supabaseClient.rpc('generate_slots_for_service', {
        p_service_id: serviceId,
        p_start_date: startDate.toISOString().split('T')[0],
        p_end_date: endDate.toISOString().split('T')[0]
    });
    return { success: !error, slotsGenerated: data };
}
```

---

## 🏢 Escalado Multi-Sucursal

### Cambios Necesarios en el Frontend

#### 1. Selección de Sucursal

```javascript
// assets/supabase.js

// Nueva función: Obtener sucursales
async function getLocations() {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/locations?select=*&active=eq.true&order=name`, {
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
    });
    return await response.json();
}

// Modificar getServices para filtrar por sucursal
async function getServices(locationId = null) {
    let url = `${SUPABASE_URL}/rest/v1/services?select=*&order=name`;
    if (locationId) {
        url += `&location_id=eq.${locationId}`;
    }
    const response = await fetch(url, {
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
    });
    return await response.json();
}

// Modificar getAvailableSlots para incluir location_id
async function getAvailableSlots(serviceId, locationId, startDate, endDate) {
    const params = new URLSearchParams({
        'select': '*',
        'service_id': `eq.${serviceId}`,
        'location_id': `eq.${locationId}`,
        'available': 'eq.true',
        'date_time': `gte.${startDate.toISOString()}`,
        'order': 'date_time'
    });
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/slots?${params}`, {
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
    });
    return await response.json();
}
```

#### 2. Configuración de Horarios por Sucursal

```javascript
// Reemplazar GYM_HOURS estático con función dinámica
async function getLocationHours(locationId) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/location_hours?select=*&location_id=eq.${locationId}`, {
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
    });
    const hours = await response.json();
    
    // Convertir a formato GYM_HOURS
    const hoursMap = {};
    hours.forEach(h => {
        if (!h.is_closed) {
            hoursMap[h.day_of_week] = {
                open: h.open_hour,
                close: h.close_hour,
                name: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][h.day_of_week]
            };
        }
    });
    return hoursMap;
}
```

#### 3. Modificar createBooking para incluir location_id

```javascript
async function createBooking(serviceId, slotId, locationId) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Debes iniciar sesión');
    
    const { data, error } = await supabaseClient
        .from('bookings')
        .insert({
            user_id: user.id,
            service_id: serviceId,
            slot_id: slotId,
            location_id: locationId,  // ← Nuevo campo
            status: 'confirmed'
        })
        .select()
        .single();
    
    return { success: !error, data, error: error?.message };
}
```

### Cambios Necesarios en el Backend (SQL)

#### 1. Crear Tablas Multi-Sucursal

```sql
-- Ejecutar en Supabase SQL Editor

-- Tabla de sucursales
CREATE TABLE IF NOT EXISTS locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    timezone TEXT DEFAULT 'America/Santiago',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agregar location_id a services
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);

-- Agregar location_id a slots
ALTER TABLE slots 
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);

-- Agregar location_id a bookings
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);

-- Tabla de horarios por sucursal
CREATE TABLE IF NOT EXISTS location_hours (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    open_hour INTEGER NOT NULL CHECK (open_hour >= 0 AND open_hour <= 23),
    close_hour INTEGER NOT NULL CHECK (close_hour >= 0 AND close_hour <= 23),
    is_closed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(location_id, day_of_week)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_services_location ON services(location_id);
CREATE INDEX IF NOT EXISTS idx_slots_location ON slots(location_id);
CREATE INDEX IF NOT EXISTS idx_bookings_location ON bookings(location_id);
CREATE INDEX IF NOT EXISTS idx_location_hours_location ON location_hours(location_id);
```

#### 2. Actualizar Función de Generación de Slots

```sql
CREATE OR REPLACE FUNCTION generate_slots_for_service(
    p_service_id UUID,
    p_location_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS INTEGER AS $$
DECLARE
    current_day DATE;
    slot_datetime TIMESTAMP WITH TIME ZONE;
    slots_count INTEGER := 0;
    day_of_week INTEGER;
    day_hours RECORD;
BEGIN
    current_day := p_start_date;
    
    WHILE current_day <= p_end_date LOOP
        day_of_week := EXTRACT(DOW FROM current_day);
        
        -- Obtener horarios de la sucursal para este día
        SELECT open_hour, close_hour, is_closed INTO day_hours
        FROM location_hours
        WHERE location_id = p_location_id AND day_of_week = EXTRACT(DOW FROM current_day);
        
        -- Si no hay configuración, usar horarios por defecto
        IF day_hours IS NULL THEN
            IF day_of_week >= 1 AND day_of_week <= 5 THEN
                day_hours.open_hour := 6;
                day_hours.close_hour := 22;
                day_hours.is_closed := false;
            ELSIF day_of_week = 6 THEN
                day_hours.open_hour := 8;
                day_hours.close_hour := 14;
                day_hours.is_closed := false;
            ELSE
                day_hours.is_closed := true;
            END IF;
        END IF;
        
        -- Generar slots si el día no está cerrado
        IF NOT day_hours.is_closed THEN
            FOR hour IN day_hours.open_hour..(day_hours.close_hour - 1) LOOP
                slot_datetime := (current_day + (hour || ' hours')::INTERVAL)::TIMESTAMP WITH TIME ZONE;
                
                INSERT INTO slots (service_id, location_id, date_time, available)
                VALUES (p_service_id, p_location_id, slot_datetime, true)
                ON CONFLICT (service_id, date_time) DO NOTHING;
                
                slots_count := slots_count + 1;
            END LOOP;
        END IF;
        
        current_day := current_day + INTERVAL '1 day';
    END LOOP;
    
    RETURN slots_count;
END;
$$ LANGUAGE plpgsql;
```

#### 3. Actualizar Políticas RLS para Multi-Sucursal

```sql
-- Las políticas existentes siguen funcionando
-- Pero podemos agregar políticas adicionales para admins de sucursal

-- Política: Admins de sucursal pueden ver todas las reservas de su sucursal
CREATE POLICY "Admins de sucursal ven reservas de su ubicación"
ON bookings FOR SELECT
USING (
    -- Si es admin (verificar en tabla de admins o por email)
    auth.jwt() ->> 'email' IN (
        SELECT email FROM location_admins WHERE location_id = bookings.location_id
    )
    OR auth.uid() = user_id  -- O si es su propia reserva
);
```

---

## 🎨 Integración Frontend: Alpine.js

### Estructura del Componente de Reservas

```javascript
// En index.html, dentro de <script>
function cuentaData() {
    return {
        // Estado
        modalOpen: false,
        currentView: 'login', // 'login', 'register', 'bookings', 'booking-form'
        user: null,
        services: [],
        selectedService: null,
        availableSlots: [],
        bookings: [],
        selectedSlot: null,
        
        // Inicialización
        async init() {
            await this.checkAuth();
            await this.loadServices();
        },
        
        // Autenticación
        async checkAuth() {
            const user = await window.odinGymSupabase.getCurrentUser();
            if (user) {
                this.user = user;
                this.currentView = 'bookings';
                await this.loadBookings();
            }
        },
        
        // Cargar servicios
        async loadServices() {
            const result = await window.odinGymSupabase.getServices();
            if (result.success) {
                this.services = result.data;
            }
        },
        
        // Cargar slots disponibles
        async loadAvailableSlots(serviceId) {
            const startDate = new Date();
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + 2);
            
            const result = await window.odinGymSupabase.getAvailableSlots(
                serviceId, 
                startDate, 
                endDate
            );
            
            if (result.success) {
                this.availableSlots = result.data;
                // Convertir a formato FullCalendar
                this.calendarEvents = this.formatSlotsForCalendar(result.data);
            }
        },
        
        // Formatear slots para FullCalendar
        formatSlotsForCalendar(slots) {
            return slots.map(slot => ({
                id: slot.id,
                title: 'Disponible',
                start: slot.date_time,
                end: new Date(new Date(slot.date_time).getTime() + 60 * 60 * 1000), // +1 hora
                backgroundColor: '#10b981',
                borderColor: '#059669'
            }));
        },
        
        // Crear reserva
        async createBooking() {
            if (!this.selectedSlot || !this.selectedService) return;
            
            const result = await window.odinGymSupabase.createBooking(
                this.selectedService.id,
                this.selectedSlot.id
            );
            
            if (result.success) {
                alert('Reserva creada exitosamente');
                await this.loadBookings();
                this.currentView = 'bookings';
            } else {
                alert('Error: ' + result.error);
            }
        }
    };
}
```

---

## 🔧 Instrucciones para Desarrolladores IA

### Contexto para IA

**Eres un desarrollador trabajando en un sistema de reservas de clases para gimnasios. El sistema actualmente soporta una sucursal y necesita escalarse a múltiples ubicaciones.**

### Tareas Comunes

#### 1. Agregar un Nuevo Servicio

```sql
-- En Supabase SQL Editor
INSERT INTO services (name, description, duration, cost, location_id)
VALUES (
    'Entrenamiento Personal',
    'Sesión individual con instructor certificado',
    60,
    25000,
    'uuid-de-la-sucursal'  -- O null si es para todas las sucursales
);

-- Generar slots para el nuevo servicio
SELECT generate_slots_for_service(
    (SELECT id FROM services WHERE name = 'Entrenamiento Personal'),
    'uuid-de-la-sucursal',
    CURRENT_DATE,
    (CURRENT_DATE + INTERVAL '2 months')::DATE
);
```

#### 2. Modificar Horarios de una Sucursal

```sql
-- Actualizar horarios de una sucursal
UPDATE location_hours
SET open_hour = 7, close_hour = 21
WHERE location_id = 'uuid-sucursal' AND day_of_week = 1;  -- Lunes

-- O insertar si no existe
INSERT INTO location_hours (location_id, day_of_week, open_hour, close_hour, is_closed)
VALUES ('uuid-sucursal', 1, 7, 21, false)
ON CONFLICT (location_id, day_of_week) 
DO UPDATE SET open_hour = EXCLUDED.open_hour, close_hour = EXCLUDED.close_hour;
```

#### 3. Agregar Validación de Límite de Reservas por Usuario

```javascript
// En assets/supabase.js, modificar createBooking()
async function createBooking(serviceId, slotId, maxBookingsPerUser = null) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Debes iniciar sesión');
    
    // Si hay límite, verificar reservas existentes
    if (maxBookingsPerUser !== null) {
        const { data: userBookings } = await supabaseClient
            .from('bookings')
            .select('id')
            .eq('user_id', user.id)
            .eq('status', 'confirmed');
        
        if (userBookings.length >= maxBookingsPerUser) {
            throw new Error(`Límite de ${maxBookingsPerUser} reservas alcanzado`);
        }
    }
    
    // ... resto del código
}
```

#### 4. Implementar Notificaciones por Email

```sql
-- Crear función trigger en PostgreSQL
CREATE OR REPLACE FUNCTION notify_booking_created()
RETURNS TRIGGER AS $$
BEGIN
    -- Enviar email usando Supabase Edge Functions o servicio externo
    PERFORM pg_notify('booking_created', json_build_object(
        'booking_id', NEW.id,
        'user_id', NEW.user_id,
        'slot_id', NEW.slot_id
    )::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_created_trigger
AFTER INSERT ON bookings
FOR EACH ROW
EXECUTE FUNCTION notify_booking_created();
```

---

## 📈 Optimizaciones y Mejores Prácticas

### 1. Caché de Servicios

```javascript
// Cachear servicios en localStorage
let servicesCache = null;
let cacheExpiry = null;

async function getServices(useCache = true) {
    if (useCache && servicesCache && cacheExpiry > Date.now()) {
        return { success: true, data: servicesCache };
    }
    
    const result = await fetchServicesFromAPI();
    if (result.success) {
        servicesCache = result.data;
        cacheExpiry = Date.now() + (5 * 60 * 1000); // 5 minutos
    }
    return result;
}
```

### 2. Paginación de Slots

```javascript
// Para evitar cargar miles de slots, usar paginación
async function getAvailableSlots(serviceId, startDate, endDate, page = 1, pageSize = 50) {
    const params = new URLSearchParams({
        'select': '*',
        'service_id': `eq.${serviceId}`,
        'available': 'eq.true',
        'date_time': `gte.${startDate.toISOString()}`,
        'order': 'date_time',
        'limit': pageSize.toString(),
        'offset': ((page - 1) * pageSize).toString()
    });
    
    // ... resto del código
}
```

### 3. Validación de Concurrencia

```javascript
// Usar transacciones para evitar race conditions
async function createBooking(serviceId, slotId) {
    // Verificar y reservar en una sola operación
    const { data, error } = await supabaseClient.rpc('create_booking_safe', {
        p_service_id: serviceId,
        p_slot_id: slotId,
        p_user_id: (await getCurrentUser()).id
    });
    
    return { success: !error, data, error: error?.message };
}
```

```sql
-- Función SQL para crear reserva de forma segura
CREATE OR REPLACE FUNCTION create_booking_safe(
    p_service_id UUID,
    p_slot_id UUID,
    p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_booking_id UUID;
BEGIN
    -- Verificar que el slot esté disponible
    IF NOT EXISTS (
        SELECT 1 FROM slots 
        WHERE id = p_slot_id AND available = true
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Slot no disponible');
    END IF;
    
    -- Verificar que no haya booking confirmado
    IF EXISTS (
        SELECT 1 FROM bookings 
        WHERE slot_id = p_slot_id AND status = 'confirmed'
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Slot ya reservado');
    END IF;
    
    -- Crear booking
    INSERT INTO bookings (user_id, service_id, slot_id, status)
    VALUES (p_user_id, p_service_id, p_slot_id, 'confirmed')
    RETURNING id INTO v_booking_id;
    
    RETURN json_build_object('success', true, 'booking_id', v_booking_id);
END;
$$ LANGUAGE plpgsql;
```

---

## 🐛 Debugging y Troubleshooting

### Problemas Comunes

1. **Slots no aparecen en el calendario**
   - Verificar que `generate_slots_for_service()` se ejecutó
   - Verificar que los slots tienen `available = true`
   - Verificar que los horarios están dentro de `GYM_HOURS`

2. **Error "Slot no disponible" al reservar**
   - Verificar que no hay otro booking confirmado para ese slot
   - Verificar que el slot tiene `available = true`
   - Verificar políticas RLS

3. **Usuario no puede ver sus reservas**
   - Verificar que `auth.uid() = user_id` en la política RLS
   - Verificar que el usuario está autenticado
   - Verificar que la sesión no expiró

### Logs Útiles

```javascript
// Agregar logging detallado
console.log('createBooking() - Parámetros:', { serviceId, slotId });
console.log('createBooking() - Usuario:', user?.id);
console.log('createBooking() - Slot:', slot);
console.log('createBooking() - Resultado:', { data, error });
```

---

## 📚 Recursos Adicionales

- [Documentación Supabase](https://supabase.com/docs)
- [PostgreSQL Row Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [FullCalendar.js Documentation](https://fullcalendar.io/docs)
- [Alpine.js Documentation](https://alpinejs.dev/)

---

## ✅ Checklist de Implementación Multi-Sucursal

- [ ] Crear tabla `locations` en Supabase
- [ ] Crear tabla `location_hours` en Supabase
- [ ] Agregar `location_id` a `services`, `slots`, `bookings`
- [ ] Actualizar función `generate_slots_for_service()` para incluir `location_id`
- [ ] Crear función `getLocations()` en `supabase.js`
- [ ] Modificar `getServices()` para filtrar por `location_id`
- [ ] Modificar `getAvailableSlots()` para filtrar por `location_id`
- [ ] Modificar `createBooking()` para incluir `location_id`
- [ ] Agregar selector de sucursal en el frontend
- [ ] Actualizar políticas RLS si es necesario
- [ ] Probar flujo completo con múltiples sucursales
- [ ] Documentar horarios por sucursal
- [ ] Configurar timezone por sucursal si aplica

---

**Última actualización:** 2024-01-XX
**Versión del documento:** 1.0
**Autor:** Sistema ODIN GYM

