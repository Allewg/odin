/**
 * Script Node.js para actualizar servicios dinámicamente
 * Uso: node update-services.js
 */

const fs = require('fs');
const path = require('path');

// Configuración de servicios
const servicios = [
  {
    id: 'entrenamiento-personalizado',
    nombre: 'Entrenamiento Personalizado',
    descripcion: 'Sesiones one-on-one con entrenadores certificados. Planes adaptados a tus objetivos específicos.',
    icono: 'fa-dumbbell',
    color: 'from-primary-gold to-secondary-mustard',
    textoIcono: 'text-bg-dark'
  },
  {
    id: 'planes-gimnasio',
    nombre: 'Planes de Gimnasio',
    descripcion: 'Acceso ilimitado a nuestras instalaciones. Incluye plan estudiante con descuento especial.',
    icono: 'fa-calendar-alt',
    color: 'from-secondary-red to-secondary-red-bright',
    textoIcono: 'text-white'
  },
  {
    id: 'clases-grupales',
    nombre: 'Clases Grupales',
    descripcion: 'Strong Vikings, Power Jump, CrossFit. Ambiente motivador y comunitario.',
    icono: 'fa-users',
    color: 'from-primary-gold to-secondary-mustard',
    textoIcono: 'text-bg-dark'
  },
  {
    id: 'nutricionista',
    nombre: 'Nutricionista',
    descripcion: 'Asesoría nutricional personalizada para complementar tu entrenamiento y alcanzar tus metas.',
    icono: 'fa-apple-alt',
    color: 'from-secondary-red to-secondary-red-bright',
    textoIcono: 'text-white'
  },
  {
    id: 'kinesiologia',
    nombre: 'Kinesiología',
    descripcion: 'Rehabilitación y prevención de lesiones. Recupera y fortalece tu cuerpo.',
    icono: 'fa-heartbeat',
    color: 'from-primary-gold to-secondary-mustard',
    textoIcono: 'text-bg-dark'
  },
  {
    id: 'sistema-dj',
    nombre: 'Sistema DJ Personalizado',
    descripcion: 'Entrena con la mejor música. Ambiente energético único en la zona.',
    icono: 'fa-music',
    color: 'from-secondary-red to-secondary-red-bright',
    textoIcono: 'text-white'
  }
];

// Configuración de planes
const planes = [
  {
    id: 'plan-estudiante',
    nombre: 'Plan Estudiante',
    precio: 16000,
    periodo: 'mes',
    destacado: true,
    etiqueta: 'POPULAR',
    icono: 'fa-graduation-cap',
    color: 'primary-gold',
    beneficios: [
      'Acceso ilimitado al gimnasio',
      'Horario extendido',
      'Descuento especial para estudiantes',
      'Sin permanencia'
    ]
  },
  {
    id: 'plan-anual-pac',
    nombre: 'Plan Anual PAC',
    precio: 120000,
    periodo: 'año',
    destacado: true,
    etiqueta: 'MEJOR VALOR',
    icono: 'fa-calendar-check',
    color: 'secondary-red',
    ahorro: 72000,
    beneficios: [
      'Acceso ilimitado 12 meses',
      'Sin cuota de inscripción',
      'Descuento del 37%',
      'Pago único o cuotas'
    ]
  },
  {
    id: 'clases-grupales',
    nombre: 'Clases Grupales',
    precio: 30000,
    periodo: '8 clases',
    destacado: false,
    icono: 'fa-users',
    color: 'primary-gold',
    beneficios: [
      'Strong Vikings',
      'Power Jump',
      'CrossFit',
      'Válido por 2 meses'
    ]
  }
];

/**
 * Genera el HTML de servicios
 */
function generarHTMLServicios() {
  return servicios.map(servicio => `
    <div class="bg-white rounded-lg shadow-xl overflow-hidden hover:shadow-2xl transition-shadow">
      <div class="h-48 bg-gradient-to-br ${servicio.color} flex items-center justify-center">
        <i class="fas ${servicio.icono} text-6xl ${servicio.textoIcono}"></i>
      </div>
      <div class="p-6">
        <h3 class="font-bold text-2xl mb-3">${servicio.nombre}</h3>
        <p class="text-gray-700 mb-4">${servicio.descripcion}</p>
        <a href="#contacto" class="text-secondary-red font-bold hover:underline">
          Más información <i class="fas fa-arrow-right ml-1"></i>
        </a>
      </div>
    </div>
  `).join('\n');
}

/**
 * Genera el HTML de planes
 */
function generarHTMLPlanes() {
  return planes.map(plan => {
    const destacadoClass = plan.destacado ? `border-2 border-${plan.color} relative` : `border-2 border-${plan.color}`;
    const etiquetaHTML = plan.etiqueta ? `
      <div class="absolute top-0 right-0 bg-${plan.color} ${plan.color === 'primary-gold' ? 'text-bg-dark' : 'text-white'} px-4 py-1 rounded-bl-lg font-bold">
        ${plan.etiqueta}
      </div>
    ` : '';
    
    const ahorroHTML = plan.ahorro ? `
      <p class="text-sm text-gray-600">Ahorra $${plan.ahorro.toLocaleString('es-CL')} al año</p>
    ` : '';
    
    return `
      <div class="bg-white rounded-lg shadow-xl p-8 ${destacadoClass}">
        ${etiquetaHTML}
        <div class="text-center mb-6">
          <i class="fas ${plan.icono} text-5xl text-${plan.color} mb-4"></i>
          <h3 class="font-syncopate text-2xl font-bold mb-2">${plan.nombre}</h3>
          <div class="text-4xl font-bold text-bg-dark mb-2">
            $${plan.precio.toLocaleString('es-CL')}<span class="text-lg text-gray-600">/${plan.periodo}</span>
          </div>
          ${ahorroHTML}
        </div>
        <ul class="space-y-3 mb-6">
          ${plan.beneficios.map(beneficio => `
            <li class="flex items-start">
              <i class="fas fa-check text-${plan.color} mr-2 mt-1"></i>
              <span>${beneficio}</span>
            </li>
          `).join('\n')}
        </ul>
        <a href="#contacto" class="btn-${plan.color === 'primary-gold' ? 'primary' : 'secondary-red'} w-full text-center block">
          Contratar Plan
        </a>
      </div>
    `;
  }).join('\n');
}

/**
 * Función principal
 */
function main() {
  console.log('🚀 Actualizando servicios y planes...');
  
  // Leer el archivo HTML
  const htmlPath = path.join(__dirname, 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  
  // Aquí podrías actualizar secciones específicas del HTML
  // Por ejemplo, reemplazar secciones de servicios o planes
  
  console.log('✅ Servicios y planes actualizados');
  console.log(`📊 Total de servicios: ${servicios.length}`);
  console.log(`💰 Total de planes: ${planes.length}`);
  
  // Exportar datos como JSON para uso futuro
  const data = {
    servicios,
    planes,
    actualizado: new Date().toISOString()
  };
  
  fs.writeFileSync(
    path.join(__dirname, 'assets', 'data.json'),
    JSON.stringify(data, null, 2),
    'utf8'
  );
  
  console.log('💾 Datos exportados a assets/data.json');
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = { servicios, planes, generarHTMLServicios, generarHTMLPlanes };

