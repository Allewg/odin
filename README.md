# ODIN GYM - Sitio Web

Sitio web moderno y profesional para ODIN GYM, un gimnasio privado en San Bernardo y Talagante, Chile.

## 🏋️ Características

- **Single Page Application (SPA)** con navegación por anclas
- **Diseño Responsive** (mobile-first)
- **Temática Nórdica** inspirada en la mitología vikinga
- **Optimizado para SEO local** (San Bernardo, Talagante)
- **Integración con WhatsApp Business**
- **Sistema de autenticación y reservas con Supabase**
  - Registro y login de usuarios
  - Magic links (login sin contraseña)
  - Sistema de reservas con calendario interactivo
  - Gestión de reservas del usuario
  - Cancelación de reservas
- **Galería de instalaciones**
- **Formulario de contacto**

## 🛠️ Stack Tecnológico

### Frontend Core
- **HTML5** (semántico, single-page)
- **CSS3** (custom styles + Tailwind)
- **JavaScript** (vanilla, sin frameworks)

### Frameworks y Librerías
- **Tailwind CSS** (vía CDN) — utility-first CSS
- **Alpine.js 3.x** (vía CDN) — reactividad ligera
- **Font Awesome 6.5.1** (vía CDN) — iconografía

### Tipografía
- **Google Fonts:**
  - Syncopate (700) — títulos
  - Inter (300, 400, 700, 900) — body

### Integraciones
- **Supabase** — Backend para autenticación y base de datos
- **FullCalendar.js** — Calendario interactivo para reservas
- **WhatsApp Business API** (links directos)
- **Google Maps Embed API** (ubicaciones)
- **Vimeo Player API** (opcional para videos)

## 📁 Estructura del Proyecto

```
odingym.cl/
├── index.html          # Single Page Application
├── assets/
│   ├── images/        # Imágenes (logo, hero, servicios, instalaciones)
│   ├── styles.css     # CSS adicional y variables
│   └── supabase.js    # Lógica de Supabase (auth y reservas)
├── update-services.js  # Script Node.js para build (opcional)
├── SUPABASE_SETUP.md  # Guía de configuración de Supabase
└── README.md          # Documentación
```

## 🎨 Paleta de Colores

### Primarios
- **Negro:** `#1A1A1A`
- **Dorado:** `#F2C94C`
- **Blanco:** `#FFFFFF`

### Secundarios
- **Mostaza:** `#E6B821`
- **Rojo Granate:** `#721D25`
- **Rojo Brillante:** `#C81E1E`

### Backgrounds
- **Oscuro:** `#000000`
- **Gris Oscuro:** `#1A1A1A`
- **Claro:** `#F0F0F0`

## 🔐 Sistema de Autenticación y Reservas

El sitio incluye un sistema completo de autenticación y reservas usando Supabase:

- **Autenticación:**
  - Registro con email y contraseña
  - Login con email y contraseña
  - Magic links (login sin contraseña)
  - Gestión de sesión

- **Sistema de Reservas:**
  - Listado de servicios disponibles
  - Calendario interactivo con slots disponibles
  - Reserva de clases (sin costo)
  - Visualización de reservas del usuario
  - Cancelación de reservas

**⚠️ IMPORTANTE:** Antes de usar el sistema de reservas, debes configurar Supabase siguiendo las instrucciones en `SUPABASE_SETUP.md`.

## 📄 Secciones del Sitio

1. **HOME**
   - Hero section con CTA "Clase de Regalo"
   - Propuesta de valor
   - Ubicaciones (San Bernardo y Talagante)
   - Testimonios/comunidad

2. **SERVICIOS**
   - Entrenamiento Personalizado
   - Planes de Gimnasio (incluye plan estudiante)
   - Clases Grupales (Strong Vikings, Power Jump, CrossFit)
   - Nutricionista
   - Kinesiología
   - Sistema DJ personalizado

3. **INSTALACIONES**
   - Galería de fotos del gimnasio
   - Equipamiento disponible
   - Feature único: Sistema DJ

4. **PLANES Y PRECIOS**
   - Plan Estudiante: $16,000/mes
   - Plan Anual PAC: $120,000
   - Clases grupales: $30,000 (8 clases)
   - CTA: "Clase de Regalo"

5. **NOSOTROS**
   - Historia del gimnasio
   - Equipo de entrenadores
   - Embajadora: Tiare Allende
   - Valores: comunidad, superación, ambiente familiar

6. **EXPLORA Y RESERVA** (Nueva)
   - Listado de servicios disponibles
   - Calendario interactivo con FullCalendar.js
   - Selección de fecha/hora disponible
   - Confirmación de reserva
   - Requiere login para reservar

7. **MI CUENTA** (Nueva)
   - Registro de nuevos usuarios
   - Login con email/contraseña o magic link
   - Perfil del usuario
   - Listado de reservas activas
   - Cancelación de reservas
   - Logout

8. **CONTACTO**
   - WhatsApp: +56935100120 / +56981326755
   - Formulario de contacto
   - Mapa con ubicaciones
   - Redes sociales (Instagram @odingym.cl)

## 🚀 Instalación y Uso

### Requisitos
- Navegador web moderno
- Cuenta en Supabase (gratuita) - para sistema de reservas
- Servidor web local (opcional, para desarrollo)

### Instalación Local

1. Clona o descarga el proyecto
2. Abre `index.html` en tu navegador
3. O usa un servidor local:
   ```bash
   # Con Python
   python -m http.server 8000
   
   # Con Node.js (http-server)
   npx http-server
   ```

### Producción

1. Sube todos los archivos a tu servidor web
2. Asegúrate de que las rutas de imágenes estén correctas
3. Actualiza las URLs de Google Maps con las coordenadas reales
4. Configura el dominio (odingym.cl)

## 📝 Configuración

### Configurar Supabase (Requerido para Reservas)

**⚠️ IMPORTANTE:** El sistema de reservas requiere configuración de Supabase.

1. Lee la guía completa en `SUPABASE_SETUP.md`
2. Crea un proyecto en Supabase
3. Configura las tablas y políticas RLS
4. Actualiza las credenciales en `assets/supabase.js`:
   ```javascript
   const SUPABASE_URL = 'TU_SUPABASE_URL';
   const SUPABASE_ANON_KEY = 'TU_SUPABASE_ANON_KEY';
   ```

### Actualizar Información de Contacto

Edita las siguientes secciones en `index.html`:

- **WhatsApp:** Busca `wa.me/56935100120` y reemplaza con tu número
- **Instagram:** Busca `@odingym.cl` y actualiza si es necesario
- **Direcciones:** Actualiza las direcciones de San Bernardo y Talagante
- **Mapas:** Reemplaza los iframes de Google Maps con las coordenadas reales

### Agregar Imágenes

1. Coloca las imágenes en `assets/images/`
2. Actualiza las rutas en el HTML:
   - Logo: `assets/images/logo.png`
   - Hero: `assets/images/hero.jpg`
   - Galería: `assets/images/gallery-*.jpg`

### Personalizar Colores

Edita las variables CSS en `assets/styles.css`:

```css
:root {
  --primary-gold: #F2C94C;
  --secondary-red: #721D25;
  /* ... más variables */
}
```

## 🔧 Scripts

### update-services.js

Script opcional para actualizar servicios dinámicamente (requiere Node.js):

```bash
node update-services.js
```

## 📱 Responsive Design

El sitio está optimizado para:
- **Mobile:** 320px - 768px
- **Tablet:** 768px - 1024px
- **Desktop:** 1024px+

## ⚡ Optimizaciones

- **Lazy loading** en iframes
- **Autoplay muted** para videos
- **Backdrop blur** (glassmorphism)
- **Intersection Observer** para animaciones on-scroll
- **Smooth scroll** para navegación
- **CDN** para librerías externas

## 🎯 SEO Local

El sitio incluye:
- Meta tags optimizados
- Keywords locales (San Bernardo, Talagante)
- Estructura semántica HTML5
- Schema markup (opcional, agregar)

## 📞 Contacto

- **WhatsApp:** +56 9 3510 0120 / +56 9 8132 6755
- **Instagram:** @odingym.cl
- **Ubicaciones:** San Bernardo y Talagante, Chile

## 📄 Licencia

© 2024 ODIN GYM. Todos los derechos reservados.

## 🆘 Soporte

Para problemas o preguntas sobre el sitio web, contacta al equipo de desarrollo o revisa la documentación de las tecnologías utilizadas:

- [Tailwind CSS](https://tailwindcss.com/docs)
- [Alpine.js](https://alpinejs.dev/)
- [Font Awesome](https://fontawesome.com/docs)

---

**Desarrollado con ❤️ para ODIN GYM - Supera tus límites**

"# odin" 
