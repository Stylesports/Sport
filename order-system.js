// Configuración de backend
const BACKEND_URL = 'http://localhost:3000';
let USE_BACKEND = true; // Se ajustará automáticamente según disponibilidad

async function detectBackendAvailability() {
    try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`${BACKEND_URL}/api/health`, { signal: controller.signal });
        clearTimeout(id);
        USE_BACKEND = !!(res && res.ok);
    } catch (e) {
        USE_BACKEND = false;
    }
}

async function apiFetch(path, options = {}) {
    if (!USE_BACKEND) return null;
    try {
        const res = await fetch(`${BACKEND_URL}${path}`, {
            headers: { 'Content-Type': 'application/json' },
            ...options,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        return null; // Fallback a localStorage si falla
    }
}

// Sistema de gestión de pedidos
class OrderSystem {
    constructor(apiUrl = 'http://localhost:3000') {
        this.apiUrl = apiUrl;
        this.users = [];
        this.orders = [];
        this.loadUsers();
        this.loadOrders();
    }
    
    loadUsers() {
        try {
            const savedUsers = localStorage.getItem('users');
            if (savedUsers) {
                this.users = JSON.parse(savedUsers);
            }
        } catch (error) {
            console.error('Error al cargar usuarios:', error);
            this.users = [];
        }
    }
    
    loadOrders() {
        try {
            const savedOrders = localStorage.getItem('orders');
            if (savedOrders) {
                this.orders = JSON.parse(savedOrders);
            }
        } catch (error) {
            console.error('Error al cargar pedidos:', error);
            this.orders = [];
        }
    }

    // Registrar un nuevo usuario
    async registerUser(userData) {
        if (USE_BACKEND) {
            const data = await apiFetch('/api/users', { method: 'POST', body: JSON.stringify(userData) });
            if (data && data.success) {
                const user = data.user;
                return { success: true, userId: user.id, user };
            }
        }
        // Fallback local
        const userId = `user_${Date.now()}`;
        const newUser = {
            id: userId,
            ...userData,
            createdAt: new Date().toISOString()
        };
        this.users.push(newUser);
        this._saveUsers();
        return { success: true, userId, user: newUser };
    }

    // Buscar usuario por email
    async getUserByEmail(email) {
        if (USE_BACKEND) {
            const data = await apiFetch('/api/users');
            if (data && Array.isArray(data.users)) {
                return data.users.find(u => u.email === email) || null;
            }
        }
        return this.users.find(user => user.email === email) || null;
    }

    // Crear un nuevo pedido
    async createOrder(orderData) {
        if (USE_BACKEND) {
            const data = await apiFetch('/api/orders', { method: 'POST', body: JSON.stringify(orderData) });
            if (data && data.success) {
                // Guardar también en localStorage como respaldo
                const newOrder = data.order;
                this.orders.push(newOrder);
                this._saveOrders();
                return { success: true, orderId: data.order.id, order: data.order };
            }
        }
        // Fallback local
        const orderId = `order_${Date.now()}`;
        const newOrder = {
            id: orderId,
            ...orderData,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        this.orders.push(newOrder);
        this._saveOrders();
        return { success: true, orderId, order: newOrder };
    }

    // Obtener pedidos de un usuario
    async getOrdersByUserId(userId) {
        if (USE_BACKEND) {
            const data = await apiFetch(`/api/orders?userId=${encodeURIComponent(userId)}`);
            if (data && Array.isArray(data.orders)) return data.orders;
        }
        return this.orders.filter(order => order.userId === userId);
    }

    // Guardar usuarios en localStorage
    _saveUsers() {
        localStorage.setItem('users', JSON.stringify(this.users));
    }

    // Guardar pedidos en localStorage
    _saveOrders() {
        localStorage.setItem('orders', JSON.stringify(this.orders));
    }
}

// Instancia global del sistema de pedidos
const orderSystem = new OrderSystem();

// Función para configurar eventos del formulario de reserva
function setupReservationEvents() {
    const reservationForm = document.getElementById('reservation-form');
    if (reservationForm) {
        // Eliminar eventos anteriores para evitar duplicados
        reservationForm.removeEventListener('submit', processReservation);
        // Añadir nuevo evento
        reservationForm.addEventListener('submit', processReservation);
    }
}

// Procesar un nuevo pedido
async function processReservation(event) {
    event.preventDefault();
    console.log("Procesando pedido...");
    
    try {
        // Verificar si la función showNotification existe
        if (typeof showNotification !== 'function') {
            // Definir una función de respaldo si no existe
            window.showNotification = function(message) {
                alert(message);
            };
        }
        
        const form = document.getElementById('reservation-form');
        if (!form) {
            showNotification('Error: No se encontró el formulario de reserva');
            return;
        }
        
        const name = form.querySelector('#reservation-name')?.value || '';
        const phone = form.querySelector('#reservation-phone')?.value || '';
        let email = form.querySelector('#reservation-email')?.value || '';
        const address = form.querySelector('#reservation-address')?.value || '';
        const notes = form.querySelector('#reservation-notes')?.value || '';
        
        if (!/^[A-Za-zÁáÉéÍíÓóÚúÑñ\s]+$/.test(name)) {
            alert('El nombre solo debe contener letras y espacios');
            return;
        }
        
        const addressMustContain = /(?=.*\b(calle|carrera)\b\s*\d+)(?=.*#\s*\d+)(?=.*-\s*\d+)/i;
        if (!addressMustContain.test(address)) {
            showNotification('La dirección debe contener: Calle/Carrera con número, "#" número y "-" número. Ej: Calle 10 # 12 - 34');
            return;
        }

        email = email.trim().toLowerCase();
        const emailInput = form.querySelector('#reservation-email');
        if (emailInput) emailInput.value = email;
        const allowedDomains = /@(gmail\.com|udi\.edu\.co|hotmail\.com)$/;
        const basicEmail = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
        if (!basicEmail.test(email) || !allowedDomains.test(email)) {
            showNotification('El correo debe ser válido y terminar en @gmail.com, @udi.edu.co o @hotmail.com (en minúsculas)');
            return;
        }
        
        if (!name || !phone || !email || !address) {
            showNotification('Por favor completa todos los campos obligatorios');
            return;
        }
        
        // Buscar si el usuario ya existe
        let user = await orderSystem.getUserByEmail(email);
        let userId;
        
        if (!user) {
            // Registrar nuevo usuario
            const result = await orderSystem.registerUser({
                name,
                email,
                phone,
                address
            });
            
            if (result && result.success) {
                userId = result.userId;
                user = result.user;
            } else {
                showNotification('Error al registrar usuario');
                return;
            }
        } else {
            userId = user.id;
        }
    
    // Obtener productos del carrito
        function getCartItems() {
            if (Array.isArray(window.cart) && window.cart.length >= 0) return window.cart;
            try { if (typeof cart !== 'undefined' && Array.isArray(cart)) return cart; } catch (_) {}
            return [];
        }
        
        let cartItems = getCartItems();
        if (!cartItems || cartItems.length === 0) {
            closeReservationModal();
            return;
        }

        // Calcular subtotal, descuentos y envío
        const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        let discount = 0;
        if (subtotal >= 500000) {
            discount = subtotal * 0.1; // 10% de descuento
        } else if (subtotal >= 300000) {
            discount = subtotal * 0.05; // 5% de descuento
        }

        let shippingCost = 0;
        if (subtotal > 0 && subtotal < 150000) {
            shippingCost = 25000; // Envío cuando no se cumple la condición
        }

        const total = subtotal - discount + shippingCost;
        
        // Crear pedido
        const orderResult = await orderSystem.createOrder({
            userId,
            items: cartItems,
            subtotal,
            discount,
            shippingCost,
            total,
            shippingAddress: address,
            notes,
            paymentStatus: 'pending'
        });
        
        if (orderResult && orderResult.success) {
            // Mostrar confirmación
            showOrderConfirmation(orderResult.order);
            
            // Limpiar carrito
            if (typeof clearCart === 'function') {
                clearCart();
            }
            if (typeof updateCartCount === 'function') {
                updateCartCount();
            }
            
            // Cerrar modal
            closeReservationModal();
            
            // Mostrar mensaje de éxito
            alert('¡Pedido realizado con éxito! Gracias por tu compra.');
            
            // Reiniciar el formulario para permitir nuevas reservas
            if (form) {
                form.reset();
            }
            
            // No re-vincular eventos aquí para evitar duplicados/errores

            // Redirigir a WhatsApp con el resumen del pedido
            try {
                const itemsText = cartItems.map(i => `${i.name} x ${i.quantity} = $${(i.price * i.quantity).toLocaleString()} COP`).join('%0A');
                const msg = `Hola, quiero confirmar mi pedido.%0A%0A` +
                            `Nombre: ${encodeURIComponent(name)}%0A` +
                            `Teléfono: ${encodeURIComponent(phone)}%0A` +
                            `Email: ${encodeURIComponent(email)}%0A` +
                            `Dirección: ${encodeURIComponent(address)}%0A` +
                            (notes ? `Notas: ${encodeURIComponent(notes)}%0A` : '') +
                            `%0AProductos:%0A${itemsText}%0A%0A` +
                            `Subtotal: $${subtotal.toLocaleString()} COP%0A` +
                            `Descuento: $${discount.toLocaleString()} COP%0A` +
                            `Envío: $${shippingCost.toLocaleString()} COP%0A` +
                            `Total: $${total.toLocaleString()} COP`;
                const waNumber = '573116039256';
                const waUrl = `https://wa.me/${waNumber}?text=${msg}`;
                window.location.href = waUrl;
            } catch (e) {
                console.error('Error al abrir WhatsApp:', e);
            }
        } else {
            showNotification('Error al procesar el pedido');
        }
    } catch (error) {
        console.error('Error al procesar el pedido:', error);
        showNotification('Ocurrió un error al procesar tu pedido. Por favor, intenta nuevamente.');
    }
}

// Mostrar confirmación de pedido
function showOrderConfirmation(order) {
    // Verificar si la función showNotification existe
    if (typeof showNotification !== 'function') {
        // Definir una función de respaldo si no existe
        window.showNotification = function(message) {
            alert(message);
        };
    }
    
    try {
        const orderId = order && order.id ? order.id.substring(0, 6) : 'TEMP-' + Math.floor(Math.random() * 10000);
        showNotification('El pedido ha sido realizado. Número de pedido: ' + orderId);
        
        // Mostrar alerta adicional para confirmar al usuario
        alert('¡Pedido realizado con éxito!\nNúmero de pedido: ' + orderId + 
              '\n\nTu información ha sido guardada correctamente.');
    } catch (error) {
        console.error('Error al mostrar confirmación:', error);
        alert('¡Pedido realizado con éxito! Tu información ha sido guardada correctamente.');
    }
}

// Función para cerrar el modal de reserva
function closeReservationModal() {
    const modal = document.getElementById('reservation-modal');
    const overlay = document.getElementById('modal-overlay');
    if (modal) {
        modal.classList.remove('show');
        // limpiar estilos inline para que .modal.show controle la visibilidad
        if (modal.style && modal.style.display) modal.style.display = '';
    }
    if (overlay) {
        overlay.classList.remove('show');
    }
    // asegurar que el body no quede bloqueado
    document.body && document.body.classList && document.body.classList.remove('modal-open');
}

// Inicialización básica
document.addEventListener('DOMContentLoaded', () => {
    detectBackendAvailability().finally(() => {
        setupReservationEvents();
    });
});