/**
 * ODIN GYM - Supabase Integration
 * Manejo de autenticación y sistema de reservas
 */

// Configuración de Supabase (reemplazar con tus credenciales)
const SUPABASE_URL = 'https://fdzhfflvmhwcbzzrqent.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkemhmZmx2bWh3Y2J6enJxZW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwMjE3MTMsImV4cCI6MjA4MTU5NzcxM30.1qCfEj_mOz0iPEu1_NlO06DvPuSsyjEKPkY1PNLmLXo';

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
        
        const { data, error } = await supabaseClient.auth.signInWithOtp({
            email: email,
            options: {
                emailRedirectTo: window.location.origin + window.location.pathname + '#mi-cuenta',
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
 */
async function getServices() {
    try {
        console.log('getServices() - iniciando, supabaseClient:', !!supabaseClient);
        
        if (!supabaseClient) {
            console.log('getServices() - supabaseClient es null, inicializando...');
            await initSupabase();
        }
        
        if (!supabaseClient) {
            console.error('getServices() - No se pudo inicializar supabaseClient');
            return { success: false, error: 'No se pudo conectar a Supabase' };
        }
        
        console.log('getServices() - haciendo query a services...');
        
        // Consulta directa sin timeout (Supabase maneja sus propios timeouts)
        // Si hay problemas de RLS o conexión, el error será más descriptivo
        const { data, error } = await supabaseClient
            .from('services')
            .select('*')
            .order('name');
        
        console.log('getServices() - resultado:', { 
            data, 
            error, 
            dataLength: data?.length,
            hasError: !!error,
            errorCode: error?.code,
            errorMessage: error?.message
        });
        
        if (error) {
            // Mejorar mensaje de error según el tipo
            if (error.code === 'PGRST116') {
                throw new Error('La tabla "services" no existe. Ejecuta el script SQL de configuración en Supabase.');
            } else if (error.message?.includes('permission denied') || error.message?.includes('RLS') || error.code === '42501') {
                throw new Error('Error de permisos RLS: Las políticas no permiten leer servicios. Verifica las políticas en Supabase.');
            } else if (error.message?.includes('timeout') || error.message?.includes('network')) {
                throw new Error('Error de conexión: Verifica tu conexión a internet y que Supabase esté disponible.');
            }
            throw error;
        }
        
        // Si no hay datos, retornar array vacío en lugar de error
        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Error obteniendo servicios:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Obtiene slots disponibles para un servicio en un rango de fechas
 * Horarios: Lunes-Jueves 06:00-23:00, Viernes 06:00-22:00, Fines de semana cerrado
 */
async function getAvailableSlots(serviceId, startDate, endDate) {
    try {
        if (!supabaseClient) {
            await initSupabase();
        }
        
        // Obtener slots disponibles
        const { data: slots, error: slotsError } = await supabaseClient
            .from('slots')
            .select('*')
            .eq('service_id', serviceId)
            .eq('available', true)
            .gte('date_time', startDate.toISOString())
            .lte('date_time', endDate.toISOString())
            .order('date_time');
        
        if (slotsError) {
            throw slotsError;
        }
        
        // Obtener slots ya reservados
        const { data: bookings, error: bookingsError } = await supabaseClient
            .from('bookings')
            .select('slot_id')
            .eq('status', 'confirmed')
            .in('slot_id', slots.map(s => s.id));
        
        if (bookingsError) {
            throw bookingsError;
        }
        
        // Filtrar slots ocupados
        const bookedSlotIds = new Set(bookings.map(b => b.slot_id));
        const availableSlots = slots.filter(slot => !bookedSlotIds.has(slot.id));
        
        // Filtrar por horarios del gimnasio
        const filteredSlots = availableSlots.filter(slot => {
            const slotDate = new Date(slot.date_time);
            const dayOfWeek = slotDate.getDay(); // 0 = Domingo, 1 = Lunes, etc.
            const hour = slotDate.getHours();
            
            // Fines de semana cerrado
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                return false;
            }
            
            // Lunes a Jueves: 06:00-23:00
            if (dayOfWeek >= 1 && dayOfWeek <= 4) {
                return hour >= 6 && hour < 23;
            }
            
            // Viernes: 06:00-22:00
            if (dayOfWeek === 5) {
                return hour >= 6 && hour < 22;
            }
            
            return false;
        });
        
        return { success: true, data: filteredSlots };
    } catch (error) {
        console.error('Error obteniendo slots disponibles:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Crea una reserva
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
 * Útil para inicializar la base de datos
 */
async function generateSlots(serviceId, startDate, endDate, durationMinutes = 60) {
    try {
        if (!supabaseClient) {
            await initSupabase();
        }
        
        const slots = [];
        const currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
            const dayOfWeek = currentDate.getDay();
            
            // Solo generar slots para días laborables
            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                let startHour, endHour;
                
                // Lunes a Jueves: 06:00-23:00
                if (dayOfWeek >= 1 && dayOfWeek <= 4) {
                    startHour = 6;
                    endHour = 23;
                }
                // Viernes: 06:00-22:00
                else if (dayOfWeek === 5) {
                    startHour = 6;
                    endHour = 22;
                }
                
                // Generar slots cada hora
                for (let hour = startHour; hour < endHour; hour++) {
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
        
        // Insertar slots en lote
        const { data, error } = await supabaseClient
            .from('slots')
            .insert(slots)
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

// Exportar funciones para uso global
window.odinGymSupabase = {
    initSupabase,
    handleSignup,
    handleLogin,
    handleMagicLink,
    handleLogout,
    getCurrentUser,
    getCurrentSession,
    getServices,
    getAvailableSlots,
    createBooking,
    getUserBookings,
    cancelBooking,
    generateSlots,
    onAuthStateChange
};

