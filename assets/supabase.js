/**
 * ODIN GYM - Supabase Integration
 * Manejo de autenticación y sistema de reservas
 */

// Configuración de Supabase (reemplazar con tus credenciales)
const SUPABASE_URL = 'https://fdzhfflvmhwcbzzrqent.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkemhmZmx2bWh3Y2J6enJxZW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwMjE3MTMsImV4cCI6MjA4MTU5NzcxM30.1qCfEj_mOz0iPEu1_NlO06DvPuSsyjEKPkY1PNLmLXo';

/**
 * Configuración de horarios del gimnasio
 * Centralizado para mantener consistencia en todo el sistema
 */
const GYM_HOURS = {
    // Días: 0=Domingo, 1=Lunes, ..., 6=Sábado
    1: { open: 6, close: 22, name: 'Lunes' },      // Lunes: 06:00-22:00
    2: { open: 6, close: 22, name: 'Martes' },     // Martes: 06:00-22:00
    3: { open: 6, close: 22, name: 'Miércoles' },  // Miércoles: 06:00-22:00
    4: { open: 6, close: 22, name: 'Jueves' },     // Jueves: 06:00-22:00
    5: { open: 6, close: 22, name: 'Viernes' },    // Viernes: 06:00-22:00
    6: { open: 8, close: 14, name: 'Sábado' },     // Sábado: 08:00-14:00
    0: null  // Domingo: Cerrado
};

/**
 * Verifica si un horario está dentro del horario de operación del gym
 */
function isWithinGymHours(date) {
    const dayOfWeek = date.getDay();
    const hour = date.getHours();
    const dayConfig = GYM_HOURS[dayOfWeek];
    
    if (!dayConfig) return false; // Día cerrado (ej: domingo)
    return hour >= dayConfig.open && hour < dayConfig.close;
}

/**
 * Obtiene los horarios disponibles para un día específico
 */
function getHoursForDay(dayOfWeek) {
    return GYM_HOURS[dayOfWeek] || null;
}

// Inicializar cliente de Supabase
let supabaseClient = null;

/**
 * Inicializa Supabase
 */
async function initSupabase() {
    if (typeof supabase === 'undefined') {
        console.error('Supabase SDK no está cargado. Asegúrate de incluir el script de Supabase.');
        return null;
    }
    
    try {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // Manejar tokens de recuperación de contraseña en la URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');
        const error = hashParams.get('error');
        const errorDescription = hashParams.get('error_description');
        
        // Manejar errores en la URL (enlace expirado, inválido, etc.)
        if (error) {
            console.error('Error en URL de recuperación:', error, errorDescription);
            // Limpiar la URL
            window.history.replaceState(null, '', window.location.pathname + '#mi-cuenta');
            // Disparar evento para mostrar error de recuperación
            document.dispatchEvent(new CustomEvent('password-reset-error', {
                detail: {
                    error: error,
                    errorDescription: errorDescription || 'El enlace de recuperación es inválido o ha expirado'
                }
            }));
        } else if (type === 'recovery' && accessToken && refreshToken) {
            console.log('Token de recuperación de contraseña detectado');
            // Establecer la sesión con los tokens de recuperación
            const { data, error: sessionError } = await supabaseClient.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
            });
            
            if (sessionError) {
                console.error('Error estableciendo sesión de recuperación:', sessionError);
                // Limpiar la URL
                window.history.replaceState(null, '', window.location.pathname + '#mi-cuenta');
                // Disparar evento para mostrar error
                document.dispatchEvent(new CustomEvent('password-reset-error', {
                    detail: {
                        error: sessionError.message || 'Error al procesar el enlace de recuperación',
                        errorDescription: 'No se pudo establecer la sesión de recuperación'
                    }
                }));
            } else {
                console.log('Sesión de recuperación establecida');
                // Limpiar la URL
                window.history.replaceState(null, '', window.location.pathname + '#mi-cuenta');
                // Disparar evento para abrir modal de cambio de contraseña
                document.dispatchEvent(new CustomEvent('open-password-reset'));
            }
        }
        
        // Verificar sesión existente
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (session) {
            console.log('Sesión activa encontrada:', session.user.email);
            return session;
        }
        
        return null;
    } catch (error) {
        console.error('Error inicializando Supabase:', error);
        return null;
    }
}

/**
 * Registro de usuario con email y contraseña
 */
async function handleSignup(email, password) {
    try {
        if (!supabaseClient) {
            await initSupabase();
        }
        
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
        });
        
        if (error) {
            throw error;
        }
        
        return { success: true, data, message: 'Registro exitoso. Verifica tu email.' };
    } catch (error) {
        console.error('Error en registro:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Login con email y contraseña
 */
async function handleLogin(email, password) {
    try {
        if (!supabaseClient) {
            await initSupabase();
        }
        
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });
        
        if (error) {
            throw error;
        }
        
        return { success: true, data, message: 'Login exitoso' };
    } catch (error) {
        console.error('Error en login:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Login con magic link (email sin contraseña)
 */
async function handleMagicLink(email) {
    try {
        if (!supabaseClient) {
            await initSupabase();
        }
        
        // Usar la URL actual del proyecto (detecta automáticamente localhost:5500, localhost:3000, etc.)
        const redirectUrl = window.location.origin + window.location.pathname + '#mi-cuenta';
        console.log('URL de redirección para magic link:', redirectUrl);
        
        const { data, error } = await supabaseClient.auth.signInWithOtp({
            email: email,
            options: {
                emailRedirectTo: redirectUrl,
            }
        });
        
        if (error) {
            throw error;
        }
        
        return { success: true, data, message: 'Revisa tu email para el enlace de acceso' };
    } catch (error) {
        console.error('Error en magic link:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Enviar email de recuperación de contraseña
 */
async function resetPassword(email) {
    try {
        if (!supabaseClient) {
            await initSupabase();
        }
        
        // Usar la URL actual del proyecto (detecta automáticamente localhost:5500, localhost:3000, etc.)
        const redirectUrl = window.location.origin + window.location.pathname + '#mi-cuenta';
        console.log('URL de redirección para recuperación:', redirectUrl);
        
        const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: redirectUrl,
        });
        
        if (error) {
            throw error;
        }
        
        return { success: true, data, message: 'Revisa tu email para el enlace de recuperación de contraseña' };
    } catch (error) {
        console.error('Error al enviar email de recuperación:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Logout
 */
async function handleLogout() {
    try {
        if (!supabaseClient) {
            await initSupabase();
        }
        
        const { error } = await supabaseClient.auth.signOut();
        
        if (error) {
            throw error;
        }
        
        return { success: true, message: 'Sesión cerrada exitosamente' };
    } catch (error) {
        console.error('Error en logout:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Cambiar contraseña del usuario actual
 */
async function updatePassword(newPassword) {
    try {
        if (!supabaseClient) {
            await initSupabase();
        }
        
        // Verificar que el usuario esté autenticado
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (userError || !user) {
            throw new Error('Debes estar autenticado para cambiar tu contraseña');
        }
        
        // Actualizar la contraseña
        const { data, error } = await supabaseClient.auth.updateUser({
            password: newPassword
        });
        
        if (error) {
            throw error;
        }
        
        return { success: true, data, message: 'Contraseña actualizada exitosamente' };
    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Obtiene el usuario actual
 */
async function getCurrentUser() {
    try {
        if (!supabaseClient) {
            await initSupabase();
        }
        
        const { data: { user }, error } = await supabaseClient.auth.getUser();
        
        if (error) {
            throw error;
        }
        
        return user;
    } catch (error) {
        console.error('Error obteniendo usuario:', error);
        return null;
    }
}

/**
 * Obtiene la sesión actual
 */
async function getCurrentSession() {
    try {
        if (!supabaseClient) {
            await initSupabase();
        }
        
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (error) {
            throw error;
        }
        
        return session;
    } catch (error) {
        console.error('Error obteniendo sesión:', error);
        return null;
    }
}

/**
 * Obtiene todos los servicios disponibles
 * Usa fetch directo como fallback si el SDK falla
 */
async function getServices() {
    try {
        console.log('getServices() - iniciando...');
        
        // Usar fetch directo para mayor confiabilidad
        const response = await fetch(`${SUPABASE_URL}/rest/v1/services?select=*&order=name`, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('getServices() - response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('getServices() - error response:', errorText);
            throw new Error(`Error ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('getServices() - datos recibidos:', data?.length, 'servicios');
        
        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Error obteniendo servicios:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Obtiene slots disponibles para un servicio en un rango de fechas
 * Usa fetch directo y la configuración centralizada GYM_HOURS para filtrar
 */
async function getAvailableSlots(serviceId, startDate, endDate) {
    try {
        console.log('getAvailableSlots() - Buscando slots para servicio:', serviceId);
        
        // Construir URL con filtros
        const params = new URLSearchParams({
            'select': '*',
            'service_id': `eq.${serviceId}`,
            'available': 'eq.true',
            'date_time': `gte.${startDate.toISOString()}`,
            'order': 'date_time'
        });
        
        // Obtener slots disponibles usando fetch directo
        const slotsResponse = await fetch(`${SUPABASE_URL}/rest/v1/slots?${params}`, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('getAvailableSlots() - slots response status:', slotsResponse.status);
        
        if (!slotsResponse.ok) {
            const errorText = await slotsResponse.text();
            throw new Error(`Error obteniendo slots: ${errorText}`);
        }
        
        const slots = await slotsResponse.json();
        console.log('getAvailableSlots() - Slots encontrados:', slots?.length || 0);
        
        // Si no hay slots, retornar vacío
        if (!slots || slots.length === 0) {
            console.log('getAvailableSlots() - No hay slots en la base de datos');
            return { success: true, data: [] };
        }
        
        // Simplificado: saltamos la verificación de bookings por ahora
        console.log('getAvailableSlots() - Procesando slots...');
        
        // Filtrar por horarios del gimnasio
        const filteredSlots = slots.filter(slot => {
            const slotDate = new Date(slot.date_time);
            const dayOfWeek = slotDate.getDay();
            const hour = slotDate.getHours();
            const dayConfig = GYM_HOURS[dayOfWeek];
            
            if (!dayConfig) return false;
            return hour >= dayConfig.open && hour < dayConfig.close;
        });
        
        console.log('getAvailableSlots() - Slots después de filtrar:', filteredSlots.length);
        
        // Si todos fueron filtrados por horario, devolver sin filtrar para debug
        if (filteredSlots.length === 0 && slots.length > 0) {
            console.warn('getAvailableSlots() - Todos filtrados, devolviendo sin filtrar. Slot ejemplo:', slots[0]);
            return { success: true, data: slots };
        }
        
        return { success: true, data: filteredSlots };
    } catch (error) {
        console.error('Error obteniendo slots disponibles:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Crea una reserva
 * Incluye validación de límite de 1 clase de prueba por usuario
 */
async function createBooking(serviceId, slotId) {
    try {
        if (!supabaseClient) {
            await initSupabase();
        }
        
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: 'Debes iniciar sesión para realizar una reserva' };
        }
        
        // Verificar si es servicio de clase de prueba/regalo y si el usuario ya tiene una
        const { data: service } = await supabaseClient
            .from('services')
            .select('name')
            .eq('id', serviceId)
            .single();
        
        const isTrialClass = service?.name?.toLowerCase().includes('prueba') || 
                            service?.name?.toLowerCase().includes('regalo');
        
        if (isTrialClass) {
            // Verificar que el usuario no tenga reservas previas de clase de prueba
            const { data: existingUserBookings } = await supabaseClient
                .from('bookings')
                .select('id, services!inner(name)')
                .eq('user_id', user.id)
                .in('status', ['confirmed', 'completed']);
            
            const hasPreviousTrialClass = existingUserBookings?.some(b => {
                const serviceName = b.services?.name?.toLowerCase() || '';
                return serviceName.includes('prueba') || serviceName.includes('regalo');
            });
            
            if (hasPreviousTrialClass) {
                return { 
                    success: false, 
                    error: 'Ya has utilizado tu clase de prueba gratuita. ¡Contáctanos para conocer nuestros planes!' 
                };
            }
        }
        
        // Verificar que el slot esté disponible
        const { data: slot, error: slotError } = await supabaseClient
            .from('slots')
            .select('*')
            .eq('id', slotId)
            .eq('available', true)
            .single();
        
        if (slotError || !slot) {
            return { success: false, error: 'El slot seleccionado no está disponible' };
        }
        
        // Verificar que no haya otra reserva confirmada para este slot
        const { data: existingBooking, error: bookingCheckError } = await supabaseClient
            .from('bookings')
            .select('*')
            .eq('slot_id', slotId)
            .eq('status', 'confirmed')
            .single();
        
        if (existingBooking) {
            return { success: false, error: 'Este horario ya está reservado' };
        }
        
        // Crear la reserva
        const { data, error } = await supabaseClient
            .from('bookings')
            .insert({
                user_id: user.id,
                slot_id: slotId,
                service_id: serviceId,
                status: 'confirmed',
                created_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (error) {
            throw error;
        }
        
        return { success: true, data, message: 'Reserva confirmada exitosamente' };
    } catch (error) {
        console.error('Error creando reserva:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Obtiene las reservas del usuario actual
 */
async function getUserBookings() {
    try {
        if (!supabaseClient) {
            await initSupabase();
        }
        
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: 'Debes iniciar sesión' };
        }
        
        const { data, error } = await supabaseClient
            .from('bookings')
            .select(`
                *,
                slots (
                    id,
                    date_time,
                    service_id
                ),
                services (
                    id,
                    name,
                    duration
                )
            `)
            .eq('user_id', user.id)
            .eq('status', 'confirmed')
            .order('created_at', { ascending: false });
        
        if (error) {
            throw error;
        }
        
        return { success: true, data };
    } catch (error) {
        console.error('Error obteniendo reservas:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Cancela una reserva
 */
async function cancelBooking(bookingId) {
    try {
        if (!supabaseClient) {
            await initSupabase();
        }
        
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: 'Debes iniciar sesión' };
        }
        
        // Verificar que la reserva pertenezca al usuario
        const { data: booking, error: bookingError } = await supabaseClient
            .from('bookings')
            .select('*')
            .eq('id', bookingId)
            .eq('user_id', user.id)
            .single();
        
        if (bookingError || !booking) {
            return { success: false, error: 'Reserva no encontrada o no autorizada' };
        }
        
        // Actualizar estado a cancelado
        const { data, error } = await supabaseClient
            .from('bookings')
            .update({ status: 'cancelled' })
            .eq('id', bookingId)
            .select()
            .single();
        
        if (error) {
            throw error;
        }
        
        return { success: true, data, message: 'Reserva cancelada exitosamente' };
    } catch (error) {
        console.error('Error cancelando reserva:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Genera slots para un servicio en un rango de fechas
 * Usa la configuración centralizada de horarios GYM_HOURS
 */
async function generateSlots(serviceId, startDate, endDate, durationMinutes = 60) {
    try {
        if (!supabaseClient) {
            await initSupabase();
        }
        
        const slots = [];
        const currentDate = new Date(startDate);
        currentDate.setHours(0, 0, 0, 0);
        
        while (currentDate <= endDate) {
            const dayOfWeek = currentDate.getDay();
            const dayConfig = GYM_HOURS[dayOfWeek];
            
            // Solo generar slots si el día está configurado (no es null)
            if (dayConfig) {
                // Generar slots cada hora dentro del horario de operación
                for (let hour = dayConfig.open; hour < dayConfig.close; hour++) {
                    const slotDate = new Date(currentDate);
                    slotDate.setHours(hour, 0, 0, 0);
                    
                    slots.push({
                        service_id: serviceId,
                        date_time: slotDate.toISOString(),
                        available: true,
                        created_at: new Date().toISOString()
                    });
                }
            }
            
            // Siguiente día
            currentDate.setDate(currentDate.getDate() + 1);
            currentDate.setHours(0, 0, 0, 0);
        }
        
        if (slots.length === 0) {
            return { success: true, data: [], message: 'No hay slots para generar en el rango especificado' };
        }
        
        // Insertar slots en lote (usando upsert para evitar duplicados)
        const { data, error } = await supabaseClient
            .from('slots')
            .upsert(slots, { 
                onConflict: 'service_id,date_time',
                ignoreDuplicates: true 
            })
            .select();
        
        if (error) {
            throw error;
        }
        
        return { success: true, data, message: `${slots.length} slots generados exitosamente` };
    } catch (error) {
        console.error('Error generando slots:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Escucha cambios en la autenticación
 */
function onAuthStateChange(callback) {
    if (!supabaseClient) {
        initSupabase().then(() => {
            supabaseClient.auth.onAuthStateChange(callback);
        });
    } else {
        supabaseClient.auth.onAuthStateChange(callback);
    }
}

/**
 * Inicializa automáticamente el sistema de reservas
 * - Busca el servicio "Clase de Prueba" existente
 * NOTA: La creación de servicios y slots debe hacerse ejecutando setup-supabase.sql
 */
async function initBookingSystem() {
    try {
        if (!supabaseClient) {
            console.log('initBookingSystem() - Inicializando supabaseClient...');
            await initSupabase();
        }
        
        if (!supabaseClient) {
            console.error('initBookingSystem() - supabaseClient sigue siendo null');
            return { success: false, error: 'No se pudo conectar a Supabase' };
        }
        
        console.log('initBookingSystem() - supabaseClient OK, buscando servicios...');
        
        // Timeout de 10 segundos para la consulta
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout: La consulta tardó demasiado')), 10000)
        );
        
        const queryPromise = supabaseClient
            .from('services')
            .select('id, name')
            .limit(5);
        
        const { data: services, error: servicesError } = await Promise.race([queryPromise, timeoutPromise]);
        
        console.log('initBookingSystem() - Resultado:', { services, servicesError });
        
        if (servicesError) {
            console.error('Error buscando servicios:', servicesError);
            return { success: false, error: 'Error al buscar servicios: ' + servicesError.message };
        }
        
        if (!services || services.length === 0) {
            console.warn('initBookingSystem() - No hay servicios configurados');
            return { 
                success: false, 
                error: 'No hay servicios configurados. Contacta al administrador.',
                needsSetup: true
            };
        }
        
        // Buscar el servicio de clase de prueba o regalo, o usar el primero disponible
        let service = services.find(s => 
            s.name.toLowerCase().includes('prueba') || 
            s.name.toLowerCase().includes('regalo')
        ) || services[0];
        
        console.log('initBookingSystem() - Usando servicio:', service.name, service.id);
        
        return { success: true, serviceId: service.id, serviceName: service.name };
    } catch (error) {
        console.error('Error en initBookingSystem:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Obtiene la configuración de horarios del gym
 */
function getGymHours() {
    return GYM_HOURS;
}

// ============================================
// FUNCIONES DE ADMINISTRACIÓN
// ============================================

/**
 * Lista de emails de administradores
 * Los admins pueden ver todas las reservas del sistema
 */
const ADMIN_EMAILS = [
    'allewmella@gmail.com',
    'admin@odingym.cl'
    // Agregar más emails de admin aquí
];

/**
 * Verifica si el usuario actual es administrador
 */
async function isAdmin() {
    try {
        console.log('isAdmin() - Verificando...');
        const user = await getCurrentUser();
        console.log('isAdmin() - Usuario:', user?.email);
        if (!user) {
            console.log('isAdmin() - No hay usuario, retornando false');
            return false;
        }
        const userEmail = user.email?.toLowerCase();
        const isAdminUser = ADMIN_EMAILS.includes(userEmail);
        console.log('isAdmin() - Email:', userEmail, 'Es admin:', isAdminUser, 'Lista:', ADMIN_EMAILS);
        return isAdminUser;
    } catch (error) {
        console.error('Error verificando admin:', error);
        return false;
    }
}

/**
 * Obtiene todas las reservas del sistema (solo admin)
 * Incluye información del usuario y slot
 */
async function getAllBookings(filters = {}) {
    try {
        // Verificar que sea admin
        const adminCheck = await isAdmin();
        if (!adminCheck) {
            return { success: false, error: 'No autorizado' };
        }
        
        // Construir query params
        const params = new URLSearchParams({
            'select': '*,slots(id,date_time),services(id,name)'
        });
        
        // Filtros opcionales
        if (filters.status) {
            params.append('status', `eq.${filters.status}`);
        }
        if (filters.fromDate) {
            // Filtrar por fecha del slot
        }
        
        params.append('order', 'created_at.desc');
        
        // Obtener sesión para token de autorización
        const session = await getCurrentSession();
        if (!session) {
            return { success: false, error: 'No hay sesión activa' };
        }
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/bookings?${params}`, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error ${response.status}: ${errorText}`);
        }
        
        const bookings = await response.json();
        
        // Obtener información de usuarios para cada reserva
        const bookingsWithUsers = await Promise.all(bookings.map(async (booking) => {
            // Usar una función RPC o devolver solo el user_id
            return {
                ...booking,
                user_email: null // Se completará desde el frontend si es necesario
            };
        }));
        
        return { success: true, data: bookingsWithUsers };
    } catch (error) {
        console.error('Error obteniendo reservas (admin):', error);
        return { success: false, error: error.message };
    }
}

/**
 * Obtiene estadísticas de reservas (solo admin)
 */
async function getBookingStats() {
    try {
        const adminCheck = await isAdmin();
        if (!adminCheck) {
            return { success: false, error: 'No autorizado' };
        }
        
        const session = await getCurrentSession();
        if (!session) {
            return { success: false, error: 'No hay sesión activa' };
        }
        
        // Obtener todas las reservas para calcular estadísticas
        const response = await fetch(`${SUPABASE_URL}/rest/v1/bookings?select=id,status,created_at,slots(date_time)`, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Error obteniendo estadísticas');
        }
        
        const bookings = await response.json();
        
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const stats = {
            total: bookings.length,
            confirmed: bookings.filter(b => b.status === 'confirmed').length,
            cancelled: bookings.filter(b => b.status === 'cancelled').length,
            completed: bookings.filter(b => b.status === 'completed').length,
            thisWeek: bookings.filter(b => new Date(b.created_at) >= weekAgo).length,
            upcoming: bookings.filter(b => {
                const slotDate = b.slots?.date_time ? new Date(b.slots.date_time) : null;
                return slotDate && slotDate >= now && b.status === 'confirmed';
            }).length
        };
        
        return { success: true, data: stats };
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Actualiza el estado de una reserva (solo admin)
 */
async function updateBookingStatus(bookingId, newStatus) {
    try {
        const adminCheck = await isAdmin();
        if (!adminCheck) {
            return { success: false, error: 'No autorizado' };
        }
        
        if (!supabaseClient) {
            await initSupabase();
        }
        
        const { data, error } = await supabaseClient
            .from('bookings')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', bookingId)
            .select()
            .single();
        
        if (error) throw error;
        
        return { success: true, data, message: 'Estado actualizado' };
    } catch (error) {
        console.error('Error actualizando reserva:', error);
        return { success: false, error: error.message };
    }
}

// Exportar funciones para uso global
window.odinGymSupabase = {
    initSupabase,
    handleSignup,
    handleLogin,
    handleMagicLink,
    resetPassword,
    handleLogout,
    updatePassword,
    getCurrentUser,
    getCurrentSession,
    getServices,
    getAvailableSlots,
    createBooking,
    getUserBookings,
    cancelBooking,
    generateSlots,
    onAuthStateChange,
    initBookingSystem,
    getGymHours,
    // Admin functions
    isAdmin,
    getAllBookings,
    getBookingStats,
    updateBookingStatus
};

