# 🔐 Instrucciones para Cambiar Contraseña de Usuario

## Método 1: Usando el Script HTML (Recomendado)

### Paso 1: Obtener el Service Role Key

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Settings** → **API**
4. En la sección **Project API keys**, copia el **`service_role`** key (⚠️ NO el `anon` key)
5. ⚠️ **IMPORTANTE**: Este key tiene permisos de administrador. NUNCA lo compartas públicamente.

### Paso 2: Usar el Script

1. Abre el archivo `assets/change-password-admin.html` en tu navegador
2. Ingresa:
   - **Supabase URL**: Ya está prellenado con tu URL
   - **Service Role Key**: Pega el key que copiaste en el Paso 1
   - **Email del Usuario**: `allewmella@gmail.com` (ya está prellenado)
   - **Nueva Contraseña**: `150599Odin` (ya está prellenado)
3. Haz clic en **"Cambiar Contraseña"**
4. Espera la confirmación de éxito
5. **Elimina el archivo `change-password-admin.html` después de usarlo** por seguridad

---

## Método 2: Usando Supabase Dashboard

### Opción A: Reset Password (Requiere que el usuario haga clic en el enlace)

1. Ve a **Authentication** → **Users** en Supabase Dashboard
2. Busca el usuario `allewmella@gmail.com`
3. Haz clic en los tres puntos (⋯) → **Send password reset email**
4. El usuario recibirá un email con un enlace para cambiar su contraseña

### Opción B: Usando SQL Editor (Solo si tienes acceso a funciones de admin)

```sql
-- NOTA: Esto requiere crear una función personalizada o usar el Admin API
-- La forma más segura es usar el script HTML o el Dashboard
```

---

## Método 3: Usando Supabase CLI (Para desarrolladores avanzados)

```bash
# Instalar Supabase CLI si no lo tienes
npm install -g supabase

# Login
supabase login

# Link tu proyecto
supabase link --project-ref fdzhfflvmhwcbzzrqent

# Usar la función de admin para cambiar contraseña
# (Requiere crear una función Edge Function personalizada)
```

---

## ⚠️ Seguridad

- **NUNCA** compartas el `service_role` key públicamente
- **NUNCA** commits el `service_role` key a Git
- **Elimina** el archivo `change-password-admin.html` después de usarlo
- Usa este método solo en un entorno seguro (tu computadora local)

---

## ✅ Verificación

Después de cambiar la contraseña:

1. Ve a tu sitio web
2. Intenta iniciar sesión con:
   - Email: `allewmella@gmail.com`
   - Contraseña: `150599Odin`
3. Si el login es exitoso, la contraseña se cambió correctamente

---

## 🆘 Solución de Problemas

### Error: "User not found"
- Verifica que el email sea exactamente `allewmella@gmail.com`
- Verifica que el usuario exista en Supabase Dashboard → Authentication → Users

### Error: "Invalid API key"
- Verifica que estés usando el `service_role` key, NO el `anon` key
- Verifica que el key esté completo (no cortado)

### Error: "Permission denied"
- Verifica que estés usando el `service_role` key correcto
- Verifica que tu proyecto de Supabase esté activo

---

**Última actualización:** 2024-01-XX

