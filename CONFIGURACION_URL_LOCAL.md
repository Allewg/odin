# Configuración de URL Local para Recuperación de Contraseña

## Problema
Cuando el proyecto está corriendo localmente (por ejemplo, en `http://localhost:5500` o `http://localhost:3000`), Supabase necesita saber qué URL usar para redirigir después de hacer clic en el enlace de recuperación de contraseña.

## Solución

### 1. Configurar URLs de Redirección en Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Navega a **Authentication** → **URL Configuration**
3. En la sección **Redirect URLs**, agrega las siguientes URLs (una por línea):

```
http://localhost:5500
http://localhost:3000
http://localhost:8080
http://127.0.0.1:5500
http://127.0.0.1:3000
http://127.0.0.1:8080
```

**Nota:** Agrega todas las URLs donde podrías estar corriendo tu proyecto localmente.

### 2. Configurar Site URL

En la misma sección, asegúrate de que **Site URL** esté configurada. Puedes usar:
- `http://localhost:5500` (o el puerto que uses)
- O dejar la URL de producción si ya la tienes

### 3. Verificar que el Código Use la URL Correcta

El código ya está configurado para detectar automáticamente la URL local usando `window.location.origin`. Esto significa que:
- Si estás en `http://localhost:5500`, usará esa URL
- Si estás en `http://localhost:3000`, usará esa URL
- Funciona automáticamente sin necesidad de cambiar código

### 4. Probar la Funcionalidad

1. Abre tu proyecto local (por ejemplo, `http://localhost:5500`)
2. Haz clic en "¿Olvidaste tu contraseña?"
3. Ingresa tu email
4. Revisa tu email y haz clic en el enlace de recuperación
5. Deberías ser redirigido a tu proyecto local con el formulario de cambio de contraseña

## Solución de Problemas

### Error: "Email link is invalid or has expired"

**Causa:** El enlace ha expirado (los enlaces de Supabase expiran después de cierto tiempo, generalmente 1 hora).

**Solución:**
1. Solicita un nuevo enlace de recuperación
2. Haz clic en el enlace dentro de 1 hora después de recibirlo

### Error: "access_denied" o "otp_expired"

**Causa:** El enlace ya fue usado o expiró.

**Solución:**
- El código ahora detecta estos errores automáticamente
- Se mostrará un mensaje en el modal pidiendo que solicites un nuevo enlace
- Haz clic en "¿Olvidaste tu contraseña?" nuevamente y solicita un nuevo enlace

### El enlace no redirige correctamente

**Causa:** La URL de redirección no está en la lista de URLs permitidas en Supabase.

**Solución:**
1. Verifica que agregaste tu URL local en **Authentication** → **URL Configuration** → **Redirect URLs**
2. Asegúrate de incluir el puerto correcto (5500, 3000, etc.)
3. No incluyas rutas adicionales, solo la URL base (ej: `http://localhost:5500`, no `http://localhost:5500/index.html`)

## Notas Importantes

- Los enlaces de recuperación expiran después de 1 hora por defecto
- Cada enlace solo puede usarse una vez
- Si el enlace expira, simplemente solicita uno nuevo
- El código ahora maneja automáticamente los errores y muestra mensajes apropiados al usuario



