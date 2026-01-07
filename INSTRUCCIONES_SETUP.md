# 🚀 Instrucciones para Completar la Configuración de ODIN GYM

## ⚠️ Problema Detectado

Si ves errores de timeout en la consola del navegador, significa que:
1. La tabla `services` no existe o está vacía
2. Las políticas RLS (Row Level Security) no están configuradas correctamente
3. El servicio "Clase de Regalo" no ha sido creado

## ✅ Solución Rápida

### Opción 1: Script SQL Automático (Recomendado)

1. **Abre Supabase Dashboard:**
   - Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Selecciona tu proyecto

2. **Abre el SQL Editor:**
   - En el menú lateral, haz clic en **SQL Editor**
   - Haz clic en **New query**

3. **Ejecuta el script:**
   - Abre el archivo `assets/setup-supabase.sql` en tu editor
   - Copia TODO el contenido
   - Pégalo en el SQL Editor de Supabase
   - Haz clic en **Run** o presiona `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

4. **Verifica el resultado:**
   - Deberías ver mensajes de éxito
   - Al final verás: "Configuración completada exitosamente!"

### Opción 2: Script HTML Interactivo

1. **Abre en tu navegador:**
   ```
   assets/setup-clase-regalo.html
   ```

2. **Haz clic en el botón:**
   - "Configurar Clase de Regalo"
   - El script verificará y creará todo automáticamente

3. **Revisa el log:**
   - Verás el progreso de cada operación
   - Si hay errores, aparecerán en rojo

## 🔍 Verificación Manual

Si prefieres verificar manualmente:

### 1. Verificar que las tablas existen

En Supabase SQL Editor, ejecuta:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('services', 'slots', 'bookings');
```

Deberías ver las 3 tablas listadas.

### 2. Verificar políticas RLS

```sql
SELECT tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('services', 'slots', 'bookings');
```

Deberías ver al menos 5 políticas:
- 1 para `services` (SELECT)
- 1 para `slots` (SELECT)
- 3 para `bookings` (SELECT, INSERT, UPDATE)

### 3. Verificar que el servicio existe

```sql
SELECT * FROM services WHERE name ILIKE '%regalo%' OR name ILIKE '%prueba%';
```

Deberías ver al menos un servicio.

### 4. Verificar que hay slots

```sql
SELECT COUNT(*) as total_slots 
FROM slots 
WHERE available = true 
AND date_time >= CURRENT_DATE;
```

Deberías ver un número mayor a 0.

## 🐛 Solución de Problemas

### Error: "relation does not exist"
- **Solución:** Ejecuta el script SQL completo (`assets/setup-supabase.sql`)

### Error: "permission denied" o "RLS"
- **Solución:** Verifica que las políticas RLS estén creadas (ver sección de verificación manual)

### Error: "Timeout: La consulta tardó más de 30 segundos"
- **Posibles causas:**
  1. Conexión lenta a Supabase
  2. Tabla muy grande sin índices
  3. Políticas RLS mal configuradas
- **Solución:** 
  1. Verifica tu conexión a internet
  2. Ejecuta el script SQL que crea los índices
  3. Verifica las políticas RLS

### No aparecen slots en el calendario
- **Causa:** No se generaron slots o el servicio no existe
- **Solución:** 
  1. Ejecuta el script SQL completo
  2. O usa `assets/setup-clase-regalo.html` para generar slots

## 📝 Checklist Final

Después de ejecutar el script, verifica:

- [ ] Las 3 tablas existen (`services`, `slots`, `bookings`)
- [ ] Las políticas RLS están configuradas (5 políticas mínimo)
- [ ] El servicio "Clase de Regalo" existe
- [ ] Hay slots generados para los próximos 2 meses
- [ ] No hay errores en la consola del navegador
- [ ] El calendario muestra slots disponibles
- [ ] Puedes hacer una reserva de prueba

## 🎉 Una vez completado

1. Recarga la página `index.html`
2. Haz clic en "Reservar Clase de Prueba"
3. Inicia sesión o regístrate
4. Deberías ver el calendario con slots disponibles
5. Selecciona un slot y confirma tu reserva

---

**¿Necesitas ayuda?** Revisa los logs en la consola del navegador (F12) para ver mensajes de error específicos.




