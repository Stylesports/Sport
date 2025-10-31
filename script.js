// Variables globales
let cart = [];
let currentCustomization = null;
let cartTotal = 0;

// Abrir WhatsApp desde el carrito con el resumen actual
function goToWhatsAppFromCart() {
    try {
        const items = Array.isArray(cart) ? cart : (window.cart || []);
        if (!items.length) {
            if (typeof showNotification === 'function') showNotification('Tu carrito está vacío');
            return;
        }
        const subtotal = items.reduce((s, it) => s + (it.price * it.quantity), 0);
        let discount = 0;
        if (subtotal >= 500000) discount = subtotal * 0.1; else if (subtotal >= 300000) discount = subtotal * 0.05;
        const shipping = subtotal > 0 && subtotal < 150000 ? 25000 : 0;
        const total = subtotal - discount + shipping;
        const itemsText = items.map(i => `${i.name} x ${i.quantity} = $${(i.price * i.quantity).toLocaleString()} COP`).join('%0A');
        const header = 'Hola, quiero hacer la reserva de los siguientes productos.%0A%0A';
        const footer = `%0A%0ASubtotal: $${subtotal.toLocaleString()} COP%0ADescuento: $${discount.toLocaleString()} COP%0AEnvío: $${shipping.toLocaleString()} COP%0ATotal: $${total.toLocaleString()} COP%0A%0A¿Me confirmas disponibilidad?`;
        const msg = header + 'Productos:%0A' + itemsText + footer;
        const waNumber = '573116039256';
        const waUrl = `https://wa.me/${waNumber}?text=${msg}`;
        window.location.href = waUrl;
    } catch (e) {
        console.error('Error al abrir WhatsApp desde carrito:', e);
    }
}

// Sistema de autenticación
window.authSystem = {
    isAuthenticated: false,
    currentUser: null,
    database: null,
    
    // Inicializar sistema de autenticación
    async init() {
        try {
            // Esperar a que la base de datos se inicialice
            this.database = await database;
            console.log('Sistema de autenticación inicializado con base de datos');
        } catch (error) {
            console.error('Error al inicializar la base de datos:', error);
            // Fallback a localStorage si IndexedDB no está disponible
            this.users = JSON.parse(localStorage.getItem('users')) || [];
        }
        
        this.checkExistingAuth();
        this.setupEventListeners();
    },
    
    // Verificar si hay una sesión existente
    async checkExistingAuth() {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            try {
                const userData = JSON.parse(savedUser);
                // Verificar si el usuario aún existe en la base de datos
                if (this.database) {
                    const dbUser = await this.database.getUserById(userData.id);
                    if (dbUser) {
                        this.currentUser = dbUser;
                        this.isAuthenticated = true;
                        this.updateAuthUI();
                    } else {
                        // Usuario no existe en la base de datos, limpiar sesión
                        localStorage.removeItem('currentUser');
                    }
                } else {
                    // Fallback a localStorage
                    this.currentUser = userData;
                    this.isAuthenticated = true;
                    this.updateAuthUI();
                }
            } catch (error) {
                console.error('Error al verificar sesión existente:', error);
                localStorage.removeItem('currentUser');
            }
        }
    },
    
    // Configurar event listeners
    setupEventListeners() {
        // Botones de Google
        document.addEventListener('click', (e) => {
            if (e.target.matches('.google-login-btn') || e.target.closest('.google-login-btn')) {
                this.handleGoogleAuth('login');
            }
            if (e.target.matches('.google-register-btn') || e.target.closest('.google-register-btn')) {
                this.handleGoogleAuth('register');
            }
            
            // Botones de Facebook
            if (e.target.matches('.facebook-login-btn') || e.target.closest('.facebook-login-btn')) {
                this.handleFacebookAuth('login');
            }
            if (e.target.matches('.facebook-register-btn') || e.target.closest('.facebook-register-btn')) {
                this.handleFacebookAuth('register');
            }
        });
    },
    
    // Manejar autenticación con Google
    handleGoogleAuth(action) {
        this.showLoadingMessage('Abriendo Google...');
        
        // Simular detección de app de Google
        setTimeout(() => {
            if (this.isGoogleAppInstalled()) {
                this.openGoogleAuth(action);
            } else {
                this.showNotification('No tienes la aplicación de Google instalada. Por favor, instálala desde la Play Store.');
            }
        }, 1000);
    },
    
    // Manejar autenticación con Facebook
    handleFacebookAuth(action) {
        this.showLoadingMessage('Abriendo Facebook...');
        
        // Simular detección de app de Facebook
        setTimeout(() => {
            if (this.isFacebookAppInstalled()) {
                this.openFacebookAuth(action);
            } else {
                this.showNotification('No tienes la aplicación de Facebook instalada, por lo tanto no puedes continuar con este método de registro.');
            }
        }, 1000);
    },
    
    // Simular detección de app de Google (en un entorno real, esto se haría con deep links)
    isGoogleAppInstalled() {
        // En un entorno real, esto verificaría si la app está instalada
        // Por ahora, simulamos que está instalada
        return true;
    },
    
    // Simular detección de app de Facebook
    isFacebookAppInstalled() {
        // En un entorno real, esto verificaría si la app está instalada
        // Por ahora, simulamos que está instalada
        return true;
    },
    
    // Abrir autenticación de Google
    openGoogleAuth(action) {
        // Simular proceso de autenticación con Google
        setTimeout(() => {
            const userData = this.simulateGoogleAuth();
            this.processAuthResult(userData, action, 'Google');
        }, 2000);
    },
    
    // Abrir autenticación de Facebook
    openFacebookAuth(action) {
        // Simular proceso de autenticación con Facebook
        setTimeout(() => {
            const userData = this.simulateFacebookAuth();
            this.processAuthResult(userData, action, 'Facebook');
        }, 2000);
    },
    
    // Simular datos de Google
    simulateGoogleAuth() {
        return {
            id: 'google_' + Date.now(),
            name: 'Usuario Google',
            email: 'usuario@gmail.com',
            photo: 'https://via.placeholder.com/100x100?text=G',
            provider: 'Google'
        };
    },
    
    // Simular datos de Facebook
    simulateFacebookAuth() {
        return {
            id: 'facebook_' + Date.now(),
            name: 'Usuario Facebook',
            email: 'usuario@facebook.com',
            photo: 'https://via.placeholder.com/100x100?text=F',
            provider: 'Facebook'
        };
    },
    
    // Procesar resultado de autenticación
    async processAuthResult(userData, action, provider) {
        try {
            let user;
            
            // Intentar usar el servidor primero
            try {
                const response = await fetch(`/api/users/email/${userData.email}`);
                const result = await response.json();
                
                if (result.success && result.user) {
                    // Usuario existente - actualizar último login
                    const updateResponse = await fetch(`/api/users/${result.user.user_id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            lastLogin: new Date().toISOString()
                        })
                    });
                    
                    if (updateResponse.ok) {
                        user = result.user;
                        this.showNotification(`¡Bienvenido de nuevo, ${user.name}!`);
                    }
                } else {
                    // Nuevo usuario - crear cuenta en el servidor
                    const createResponse = await fetch('/api/users', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(userData)
                    });
                    
                    const createResult = await createResponse.json();
                    
                    if (createResult.success) {
                        user = createResult.user;
                        this.showNotification(`¡Cuenta creada exitosamente con ${provider}!`);
                    } else {
                        throw new Error(createResult.message);
                    }
                }
            } catch (serverError) {
                console.log('Servidor no disponible, usando base de datos local');
                
                // Fallback a base de datos local
                if (this.database) {
                    const existingUser = await this.database.getUserByEmail(userData.email);
                    
                    if (existingUser) {
                        user = await this.database.updateUser(existingUser.id, {
                            lastLogin: new Date().toISOString()
                        });
                        this.showNotification(`¡Bienvenido de nuevo, ${user.name}!`);
                    } else {
                        user = await this.database.addUser(userData);
                        this.showNotification(`¡Cuenta creada exitosamente con ${provider}!`);
                    }
                } else {
                    // Fallback a localStorage
                    const existingUser = this.users.find(user => user.email === userData.email);
                    
                    if (existingUser) {
                        user = existingUser;
                        this.showNotification(`¡Bienvenido de nuevo, ${existingUser.name}!`);
                    } else {
                        user = {
                            ...userData,
                            id: userData.id,
                            createdAt: new Date().toISOString(),
                            orders: []
                        };
                        
                        this.users.push(user);
                        localStorage.setItem('users', JSON.stringify(this.users));
                        this.showNotification(`¡Cuenta creada exitosamente con ${provider}!`);
                    }
                }
            }
            
            // Establecer usuario actual
            this.currentUser = user;
            this.isAuthenticated = true;
            
            // Guardar sesión actual
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            
            // Actualizar UI
            this.updateAuthUI();
            this.closeAuthModals();
            
        } catch (error) {
            console.error('Error al procesar autenticación:', error);
            this.showNotification('Error al procesar la autenticación. Por favor, intenta de nuevo.');
        }
    },
    
    // Actualizar interfaz de autenticación
    updateAuthUI() {
        const loginBtn = document.getElementById('login-btn');
        const userInfo = document.getElementById('user-info');
        const myProductsBtn = document.getElementById('my-products-btn');
        const logoutBtn = document.getElementById('logout-btn');
        
        if (this.isAuthenticated) {
            if (loginBtn) loginBtn.style.display = 'none';
            if (userInfo) {
                userInfo.style.display = 'flex';
                const userAvatar = document.getElementById('user-avatar');
                const userName = document.getElementById('user-name');
                if (userAvatar) userAvatar.src = this.currentUser.photo;
                if (userName) userName.textContent = this.currentUser.name;
            }
            if (myProductsBtn) myProductsBtn.style.display = 'block';
            if (logoutBtn) logoutBtn.style.display = 'block';
        } else {
            if (loginBtn) loginBtn.style.display = 'block';
            if (userInfo) userInfo.style.display = 'none';
            if (myProductsBtn) myProductsBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'none';
        }
    },
    
    // Cerrar sesión
    logout() {
        this.isAuthenticated = false;
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        this.updateAuthUI();
        this.showNotification('Sesión cerrada exitosamente');
    },

    // Guardar orden del usuario
    async saveUserOrder(orderData) {
        if (!this.isAuthenticated || !this.currentUser) {
            throw new Error('Usuario no autenticado');
        }

        try {
            // Intentar guardar en el servidor primero
            try {
                const response = await fetch('/api/orders', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        userId: this.currentUser.id,
                        orderData: orderData
                    })
                });

                const result = await response.json();
                
                if (result.success) {
                    this.showNotification('Orden guardada exitosamente en el servidor');
                    return;
                } else {
                    throw new Error(result.message);
                }
            } catch (serverError) {
                console.log('Servidor no disponible, usando base de datos local');
                
                // Fallback a base de datos local
                if (this.database) {
                    await this.database.addOrder(this.currentUser.id, orderData);
                    this.showNotification('Orden guardada exitosamente');
                } else {
                    // Fallback a localStorage
                    if (!this.currentUser.orders) {
                        this.currentUser.orders = [];
                    }
                    this.currentUser.orders.push(orderData);
                    localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                    this.showNotification('Orden guardada exitosamente');
                }
            }
        } catch (error) {
            console.error('Error al guardar orden:', error);
            this.showNotification('Error al guardar la orden');
        }
    },

    // Obtener órdenes del usuario
    async getUserOrders() {
        if (!this.isAuthenticated || !this.currentUser) {
            return [];
        }

        try {
            // Intentar obtener del servidor primero
            try {
                const response = await fetch(`/api/users/${this.currentUser.id}/orders`);
                const result = await response.json();
                
                if (result.success) {
                    return result.orders;
                } else {
                    throw new Error(result.message);
                }
            } catch (serverError) {
                console.log('Servidor no disponible, usando base de datos local');
                
                // Fallback a base de datos local
                if (this.database) {
                    return await this.database.getUserOrders(this.currentUser.id);
                } else {
                    // Fallback a localStorage
                    return this.currentUser.orders || [];
                }
            }
        } catch (error) {
            console.error('Error al obtener órdenes:', error);
            return [];
        }
    },

    // Exportar datos de usuarios (para administrador)
    async exportUsersData() {
        try {
            if (this.database) {
                return await this.database.exportUsers();
            } else {
                // Fallback a localStorage
                const users = JSON.parse(localStorage.getItem('users')) || [];
                const dataStr = JSON.stringify(users, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                
                const link = document.createElement('a');
                link.href = URL.createObjectURL(dataBlob);
                link.download = `usuarios_estilo_activo_${new Date().toISOString().split('T')[0]}.json`;
                link.click();
                
                return users;
            }
        } catch (error) {
            console.error('Error al exportar datos:', error);
            this.showNotification('Error al exportar datos');
        }
    },
    
    // Cerrar modales de autenticación
    closeAuthModals() {
        const loginModal = document.getElementById('login-modal');
        const registerModal = document.getElementById('register-modal');
        const overlay = document.getElementById('modal-overlay');
        
        if (loginModal) loginModal.classList.remove('show');
        if (registerModal) registerModal.classList.remove('show');
        if (overlay) overlay.classList.remove('show');
    },
    
    // Mostrar modal de login
    showLoginModal() {
        const modal = document.getElementById('login-modal');
        const overlay = document.getElementById('modal-overlay');
        
        if (modal && overlay) {
            modal.classList.add('show');
            overlay.classList.add('show');
        }
    },
    
    // Mostrar modal de registro
    showRegisterModal() {
        const modal = document.getElementById('register-modal');
        const overlay = document.getElementById('modal-overlay');
        
        if (modal && overlay) {
            modal.classList.add('show');
            overlay.classList.add('show');
        }
    },
    
    // Mostrar mensaje de carga
    showLoadingMessage(message) {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'auth-loading';
        loadingDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 20px 40px;
            border-radius: 10px;
            z-index: 10000;
            font-size: 16px;
            font-weight: 600;
        `;
        loadingDiv.textContent = message;
        document.body.appendChild(loadingDiv);
        
        setTimeout(() => {
            if (loadingDiv.parentNode) {
                loadingDiv.parentNode.removeChild(loadingDiv);
            }
        }, 2000);
    }
};

// Funcionalidad de navegación móvil
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar sistema de autenticación
    // authSystem.init(); // Comentado para evitar errores
    
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
        });
    }
    
    // Smooth scrolling para enlaces de navegación
    const navLinks = document.querySelectorAll('.nav-menu a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const offsetTop = targetSection.offsetTop - 80;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Animaciones de entrada
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('loaded');
            }
        });
    }, observerOptions);
    
    // Observar elementos para animaciones
    const animatedElements = document.querySelectorAll('.product-card, .section-header, .sports-banner');
    animatedElements.forEach(el => {
        el.classList.add('loading');
        observer.observe(el);
    });
    
    // Inicializar carrito
    updateCartIcon();
});

// Funcionalidad de carruseles
function moveCarousel(sectionId, direction) {
    const container = document.getElementById(sectionId + '-container');
    if (!container) return;
    
    const cardWidth = 300;
    const scrollAmount = cardWidth * direction;
    
    container.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
    });
    
    // Ocultar indicadores después de la primera interacción
    hideScrollIndicators(container);
}

// Función para ocultar indicadores de scroll
function hideScrollIndicators(container) {
    const carousel = container.closest('.products-carousel');
    const section = carousel.closest('section');
    
    if (carousel) {
        carousel.classList.add('user-interacted');
    }
    
    if (section) {
        section.classList.add('user-interacted');
    }
}

// Agregar event listeners para detectar scroll manual
document.addEventListener('DOMContentLoaded', function() {
    const productContainers = document.querySelectorAll('.products-container');
    
    productContainers.forEach(container => {
        let hasScrolled = false;
        
        container.addEventListener('scroll', function() {
            if (!hasScrolled) {
                hasScrolled = true;
                hideScrollIndicators(container);
            }
        });
        
        // También detectar touch/swipe
        container.addEventListener('touchstart', function() {
            if (!hasScrolled) {
                hasScrolled = true;
                hideScrollIndicators(container);
            }
        });
    });
});

// Sistema de carrito de compras
function addToCart(productId, productName, price, image = null) {
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: productId,
            name: productName,
            price: price,
            quantity: 1,
            image: image || getProductImage(productId)
        });
    }
    
    updateCartDisplay();
    updateCartIcon();
    showNotification(`${productName} agregado al carrito!`);
    
    // Verificar si aplica regalo
    checkGiftEligibility();
}

// Función especial para agregar regalos al carrito
function addGiftToCart(productId, productName, normalPrice, image = null) {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const isEligibleForGift = subtotal >= 500000;
    
    // Verificar si ya hay un regalo en el carrito
    const existingGift = cart.find(item => item.isGift === true);
    
    if (existingGift && isEligibleForGift) {
        showNotification('Solo se permite un regalo por pedido. Si deseas este producto, se agregará a precio normal.');
        // Agregar como producto normal
        addToCart(productId, productName, normalPrice, image);
        return;
    }
    
    // Si ya hay un regalo y el usuario intenta agregar otro de la sección de regalos
    if (existingGift && !isEligibleForGift) {
        showNotification('Ya tienes un regalo en tu carrito. Este producto se agregará a precio normal.');
        addToCart(productId, productName, normalPrice, image);
        return;
    }
    
    // Si es elegible para regalo, el precio es 0, sino es el precio normal
    const finalPrice = isEligibleForGift ? 0 : normalPrice;
    const finalName = isEligibleForGift ? `${productName} (REGALO)` : productName;
    
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: productId,
            name: finalName,
            price: finalPrice,
            quantity: 1,
            image: image || getProductImage(productId),
            originalPrice: normalPrice,
            isGift: isEligibleForGift
        });
    }
    
    updateCartDisplay();
    updateCartIcon();
    
    if (isEligibleForGift) {
        showNotification(`¡${productName} agregado como REGALO!`);
        // Deshabilitar otros regalos
        disableOtherGifts();
    } else {
        showNotification(`${productName} agregado al carrito por $${normalPrice.toLocaleString()} COP`);
    }
    
    // Verificar si aplica regalo
    checkGiftEligibility();
}

function removeFromCart(productId) {
    const removedItem = cart.find(item => item.id === productId);
    cart = cart.filter(item => item.id !== productId);
    updateCartDisplay();
    updateCartIcon();
    
    // Si se removió un regalo, habilitar otros regalos
    if (removedItem && removedItem.isGift) {
        enableAllGifts();
    }
    
    checkGiftEligibility();
}

function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            // Si es un regalo, verificar si sigue siendo elegible
            if (item.isGift && item.originalPrice) {
                const subtotal = cart.reduce((sum, item) => {
                    if (item.id === productId) return sum; // Excluir el item actual del cálculo
                    return sum + (item.price * item.quantity);
                }, 0);
                
                const isEligibleForGift = subtotal >= 500000;
                if (isEligibleForGift) {
                    item.price = 0;
                    item.name = item.name.replace(' (REGALO)', '') + ' (REGALO)';
                } else {
                    item.price = item.originalPrice;
                    item.name = item.name.replace(' (REGALO)', '');
                }
                item.isGift = isEligibleForGift;
            }
            
            updateCartDisplay();
            updateCartIcon();
            checkGiftEligibility();
        }
    }
}

function updateCartDisplay() {
    const cartItems = document.getElementById('cart-items');
    const cartSubtotal = document.getElementById('cart-subtotal');
    const cartTotalElement = document.getElementById('cart-total');
    const discountInfo = document.getElementById('discount-info');
    const discountAmount = document.getElementById('discount-amount');
    const giftInfo = document.getElementById('gift-info');
    
    if (!cartItems) return;
    
    cartItems.innerHTML = '';

    // Si no hay productos en el carrito, asegurar totales y envío en 0
    if (cart.length === 0) {
        const shippingInfo = document.getElementById('shipping-info');
        const shippingAmount = document.getElementById('shipping-amount');
        if (shippingInfo && shippingAmount) {
            shippingInfo.style.display = 'block';
            shippingAmount.textContent = `$0 (¡Gratis!)`;
        }

        if (discountInfo) discountInfo.style.display = 'none';
        if (giftInfo) giftInfo.style.display = 'none';

        cartSubtotal.textContent = `$0 COP`;
        cartTotalElement.textContent = `$0 COP`;
        cartTotal = 0;

        const cartItemsContainer = document.getElementById('cart-items');
        if (cartItemsContainer) {
            cartItemsContainer.classList.remove('has-many-items');
            removeScrollIndicator();
        }
        return;
    }
    
    let subtotal = 0;
    cart.forEach(item => {
        subtotal += item.price * item.quantity;
        
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        
        let priceDisplay = `$${item.price.toLocaleString()} COP`;
        if (item.isGift && item.originalPrice) {
            priceDisplay = `<span style="text-decoration: line-through; color: #999;">$${item.originalPrice.toLocaleString()} COP</span> <span style="color: #4ecdc4; font-weight: bold;">¡GRATIS!</span>`;
        }
        
        cartItem.innerHTML = `
            <img src="${item.image}" alt="${item.name}">
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <p>${priceDisplay}</p>
            </div>
            <div class="cart-item-controls">
                <button class="quantity-btn" onclick="updateQuantity('${item.id}', -1)">-</button>
                <span>${item.quantity}</span>
                <button class="quantity-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
                <button class="remove-item" onclick="removeFromCart('${item.id}')">Eliminar</button>
            </div>
        `;
        cartItems.appendChild(cartItem);
    });
    
    // Calcular descuentos
    let discount = 0;
    let hasGift = false;
    
    if (subtotal >= 500000) {
        discount = subtotal * 0.1; // 10% de descuento
        hasGift = true;
    } else if (subtotal >= 300000) {
        discount = subtotal * 0.05; // 5% de descuento
    }
    
    // Calcular costo de envío
    let shippingCost = 0;
    const shippingInfo = document.getElementById('shipping-info');
    const shippingAmount = document.getElementById('shipping-amount');
    
    // Envío gratis si el subtotal cumple la condición o si el carrito está vacío
    if (subtotal > 0 && subtotal < 150000) {
        shippingCost = 25000; // Costo de envío cuando no se cumple la condición
    }
    
    const total = subtotal - discount + shippingCost;
    
    cartSubtotal.textContent = `$${subtotal.toLocaleString()} COP`;
    cartTotalElement.textContent = `$${total.toLocaleString()} COP`;
    
    // Mostrar información de envío
    if (shippingInfo && shippingAmount) {
        shippingInfo.style.display = 'block';
        if (shippingCost > 0) {
            shippingAmount.textContent = `$${shippingCost.toLocaleString()} COP`;
        } else {
            shippingAmount.textContent = `$0 (¡Gratis!)`;
        }
    }
    
    if (discount > 0) {
        discountInfo.style.display = 'block';
        discountAmount.textContent = `$${discount.toLocaleString()} COP`;
    } else {
        discountInfo.style.display = 'none';
    }
    
    if (hasGift) {
        giftInfo.style.display = 'block';
    } else {
        giftInfo.style.display = 'none';
    }
    
    cartTotal = total;
    
    // Detectar si hay muchos productos y aplicar clase correspondiente
    const cartItemsContainer = document.getElementById('cart-items');
    if (cartItemsContainer) {
        if (cart.length > 3) {
            cartItemsContainer.classList.add('has-many-items');
            // Agregar indicador visual adicional
            addScrollIndicator();
        } else {
            cartItemsContainer.classList.remove('has-many-items');
            removeScrollIndicator();
        }
    }
}

function removeScrollIndicator() {
    const indicator = document.querySelector('.scroll-indicator');
    if (indicator) {
        indicator.remove();
    }
}

function updateCartIcon() {
    let cartIcon = document.querySelector('.cart-icon');
    if (!cartIcon) {
        cartIcon = document.createElement('div');
        cartIcon.className = 'cart-icon';
        cartIcon.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #000000;
            color: white;
            width: 60px;
            height: 60px;
            border-radius: 15px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 1000;
            box-shadow: 0 5px 15px rgba(255, 107, 107, 0.3);
            transition: all 0.3s ease;
            border: 2px solid rgba(255, 255, 255, 0.2);
        `;
        cartIcon.onclick = toggleCart;
        document.body.appendChild(cartIcon);
    }
    
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    // Crear el ícono del carrito
    cartIcon.innerHTML = `
        <div style="font-size: 20px; margin-bottom: 2px;">🛒</div>
        <div style="font-size: 12px; font-weight: bold; background: #000000; border-radius: 10px; padding: 2px 6px; min-width: 18px; text-align: center;">${totalItems}</div>
    `;
    
    if (totalItems > 0) {
        cartIcon.style.transform = 'scale(1.1)';
        cartIcon.style.boxShadow = '0 8px 25px rgba(255, 107, 107, 0.4)';
        setTimeout(() => {
            cartIcon.style.transform = 'scale(1)';
            cartIcon.style.boxShadow = '0 5px 15px rgba(255, 107, 107, 0.3)';
        }, 200);
    } else {
        cartIcon.style.transform = 'scale(1)';
        cartIcon.style.boxShadow = '0 5px 15px rgba(255, 107, 107, 0.3)';
    }
}

function toggleCart() {
    const cartSidebar = document.getElementById('cart-sidebar');
    if (cartSidebar) {
        cartSidebar.classList.toggle('open');
    }
}

function checkGiftEligibility() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const giftSection = document.getElementById('regalos');
    const giftCards = document.querySelectorAll('.gift-card');
    const alreadyHasGift = cart.some(item => item.isGift === true);
    
    if (subtotal >= 500000) {
        if (giftSection) {
            giftSection.style.display = 'block';
        }
        
        if (alreadyHasGift) {
            // Si ya hay un regalo, deshabilitar otros
            disableOtherGifts();
        } else {
            // Marcar los regalos como elegibles
            giftCards.forEach(card => {
                card.classList.add('gift-eligible');
                const button = card.querySelector('.add-to-cart-btn');
                if (button) {
                    button.disabled = false;
                    button.textContent = 'Agregar Regalo';
                    button.style.background = 'linear-gradient(45deg, #FF0066, #00CCFF);';
                    button.style.cursor = 'pointer';
                }
            });

            // Si el usuario es elegible y no ha elegido un regalo manualmente, añadir uno aleatorio
            try {
                const regalo = getRandomGiftProduct();
                if (regalo) {
                    // Añadir como regalo automático (precio 0) y marcar
                    cart.push({
                        id: regalo.id,
                        name: `${regalo.name} (REGALO)`,
                        price: 0,
                        quantity: 1,
                        image: getProductImage(regalo.id),
                        originalPrice: regalo.price,
                        isGift: true,
                        isAutoGift: true
                    });
                    updateCartDisplay();
                    updateCartIcon();
                    showNotification(`Se agregó automáticamente un regalo: ${regalo.name}`);
                    // Deshabilitar otros regalos
                    disableOtherGifts();
                }
            } catch (e) {
                console.warn('No se pudo añadir un regalo automático:', e);
            }
        }
    } else {
        if (giftSection) {
            giftSection.style.display = 'block'; // Siempre mostrar la sección
        }
        
        // Si no cumple con el límite mínimo, remover regalos existentes
        if (alreadyHasGift) {
            const giftsToRemove = cart.filter(item => item.isGift === true);
            giftsToRemove.forEach(gift => {
                cart = cart.filter(item => item.id !== gift.id);
            });
            updateCartDisplay();
            updateCartIcon();
            showNotification('Se removió el regalo porque no cumples con el límite mínimo de compra.');
        }
        
        // Quitar la marca de elegibles y habilitar todos con precios normales
        giftCards.forEach(card => {
            card.classList.remove('gift-eligible');
            const button = card.querySelector('.add-to-cart-btn');
            const normalPrice = card.querySelector('.normal-price');
            const giftPrice = card.querySelector('.gift-price');
            
            if (button) {
                button.disabled = false;
                button.textContent = 'Agregar al Carrito';
                button.style.background = 'linear-gradient(45deg, #FF0066, #00CCFF);';
                button.style.cursor = 'pointer';
            }
            
            // Mostrar precio normal y ocultar precio de regalo
            if (normalPrice) normalPrice.style.display = 'block';
            if (giftPrice) giftPrice.style.display = 'none';
        });
    }
}

// Obtener un producto de regalo aleatorio desde la sección de regalos
function getRandomGiftProduct() {
    const giftCards = document.querySelectorAll('#regalos-container .gift-card');
    if (!giftCards || giftCards.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * giftCards.length);
    const card = giftCards[randomIndex];
    const dataAttr = card.getAttribute('data-product');
    if (!dataAttr) return null;
    try {
        const data = JSON.parse(dataAttr);
        return { id: data.id, name: data.name, price: data.price };
    } catch (e) {
        return null;
    }
}

// Deshabilitar otros regalos cuando ya hay uno seleccionado
function disableOtherGifts() {
    const giftCards = document.querySelectorAll('#regalos-container .gift-card');
    giftCards.forEach(card => {
        const button = card.querySelector('.add-to-cart-btn');
        const normalPrice = card.querySelector('.normal-price');
        const giftPrice = card.querySelector('.gift-price');
        
        if (button) {
            button.disabled = true;
            button.textContent = 'Regalo ya seleccionado';
            button.style.background = '#ccc';
            button.style.cursor = 'not-allowed';
        }
        
        // Mostrar precio normal y ocultar precio de regalo
        if (normalPrice) normalPrice.style.display = 'block';
        if (giftPrice) giftPrice.style.display = 'none';
    });
}

// Habilitar todos los regalos
function enableAllGifts() {
    const giftCards = document.querySelectorAll('#regalos-container .gift-card');
    giftCards.forEach(card => {
        const button = card.querySelector('.add-to-cart-btn');
        const normalPrice = card.querySelector('.normal-price');
        const giftPrice = card.querySelector('.gift-price');
        
        if (button) {
            button.disabled = false;
            button.textContent = 'Agregar al Carrito';
            button.style.background = 'linear-gradient(45deg, #FF0066, #00CCFF)';
            button.style.cursor = 'pointer';
        }
        
        // Mostrar precio normal y ocultar precio de regalo
        if (normalPrice) normalPrice.style.display = 'block';
        if (giftPrice) giftPrice.style.display = 'none';
    });
}

function getProductImage(productId) {
    const productCard = document.querySelector(`[data-product*="${productId}"]`);
    if (productCard) {
        const img = productCard.querySelector('img');
        return img ? img.src : 'https://via.placeholder.com/300x300?text=Producto';
    }
    return 'https://via.placeholder.com/300x300?text=Producto';
}

// Sistema de personalización de cascos
function showCustomizationModal(productId) {
    currentCustomization = productId;
    const modal = document.getElementById('customization-modal');
    const overlay = document.getElementById('modal-overlay');
    
    if (modal && overlay) {
        modal.classList.add('show');
        overlay.classList.add('show');
    }
    
    // Resetear opciones
    document.getElementById('custom-text').value = '';
    document.getElementById('design-select').value = 'sólido';
    document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('selected'));
    updateCustomPrice();
}

function closeCustomizationModal() {
    const modal = document.getElementById('customization-modal');
    const overlay = document.getElementById('modal-overlay');
    
    if (modal && overlay) {
        modal.classList.remove('show');
        overlay.classList.remove('show');
    }
    
    currentCustomization = null;
}

function addCustomizedToCart() {
    if (!currentCustomization) return;
    
    const color = document.querySelector('.color-btn.selected')?.dataset.color || 'negro';
    const design = document.getElementById('design-select').value;
    const customText = document.getElementById('custom-text').value;
    
    const productName = `Casco Personalizado (${color}, ${design})`;
    if (customText) {
        productName += ` - "${customText}"`;
    }
    
    const basePrice = getProductPrice(currentCustomization);
    const customPrice = calculateCustomPrice(design, customText);
    const totalPrice = basePrice + customPrice;
    
    addToCart(currentCustomization + '-custom', productName, totalPrice);
    closeCustomizationModal();
}

function calculateCustomPrice(design, customText) {
    let price = 0;
    
    if (design === 'rayas') price += 20000;
    else if (design === 'camuflaje') price += 30000;
    else if (design === 'personalizado') price += 50000;
    
    if (customText) price += 15000;
    
    return price;
}

function updateCustomPrice() {
    const design = document.getElementById('design-select').value;
    const customText = document.getElementById('custom-text').value;
    const price = calculateCustomPrice(design, customText);
    
    document.getElementById('custom-price').textContent = `$${price.toLocaleString()} COP`;
}

function getProductPrice(productId) {
    const productCard = document.querySelector(`[data-product*="${productId}"]`);
    if (productCard) {
        const priceElement = productCard.querySelector('.price');
        if (priceElement) {
            const priceText = priceElement.textContent.replace(/[^\d]/g, '');
            return parseInt(priceText) || 0;
        }
    }
    return 0;
}

// Event listeners para personalización
document.addEventListener('DOMContentLoaded', function() {
    // Color selection
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
        });
    });
    
    // Design and text changes
    const designSelect = document.getElementById('design-select');
    const customText = document.getElementById('custom-text');
    
    if (designSelect) {
        designSelect.addEventListener('change', updateCustomPrice);
    }
    
    if (customText) {
        customText.addEventListener('input', updateCustomPrice);
    }
});

// Sistema de catálogo
function showCatalog(category) {
    const modal = document.getElementById('catalog-modal');
    const overlay = document.getElementById('modal-overlay');
    const title = document.getElementById('catalog-title');
    const grid = document.getElementById('catalog-grid');
    
    if (!modal || !overlay || !title || !grid) return;
    
    title.textContent = `Catálogo - ${getCategoryName(category)}`;
    grid.innerHTML = '';
    
    // Cargar productos del catálogo
    const products = getCatalogProducts(category);
    products.forEach(product => {
        const item = document.createElement('div');
        item.className = 'catalog-item';
        item.innerHTML = `
            <img src="${product.image}" alt="${product.name}">
            <h4>${product.name}</h4>
            <p class="price">$${product.price.toLocaleString()} COP</p>
            <button class="add-to-cart-btn" onclick="addToCart('${product.id}', '${product.name}', ${product.price}, '${product.image}')">Agregar</button>
        `;
        grid.appendChild(item);
    });
    
    modal.classList.add('show');
    overlay.classList.add('show');
}

function closeCatalogModal() {
    const modal = document.getElementById('catalog-modal');
    const overlay = document.getElementById('modal-overlay');
    
    if (modal && overlay) {
        modal.classList.remove('show');
        overlay.classList.remove('show');
    }
}

function getCategoryName(category) {
    const names = {
        'camisetas': 'Camisetas Adidas',
        'tenis': 'Tenis Adidas',
        'jeans': 'Jeans',
        'cascos': 'Cascos para Motos',
        'deportes': 'Equipos Deportivos'
    };
    return names[category] || category;
}

function getCatalogProducts(category) {
    // Productos adicionales para el catálogo
    const catalogProducts = {
        'camisetas': [
            { id: 'camiseta-cat-1', name: 'Camiseta Adidas Originals ', price: 65000, image: 'Camiseta adidas4.webp' },
            { id: 'camiseta-cat-2', name: 'Camiseta Adidas Performance ', price: 80000, image: 'Camiseta Adidas2.jpg' },
            { id: 'camiseta-cat-3', name: 'Camiseta Adidas Arsenal Club ', price: 65000, image: 'Camiseta Arsenal.png' },
            { id: 'camiseta-cat-4', name: 'Camiseta Adidas Al Nassr Club ', price: 60000, image: 'Camiseta Alnassr.webp' },
            { id: 'camiseta-cat-5', name: 'Camiseta Adidas Real Madrid Club ', price: 70000, image: 'Camiseta Madrid black.png' },
            { id: 'camiseta-cat-6', name: 'Camiseta Adidas Seleccion Colombia ', price: 55000, image: 'Colombia.jpg' }
        ],
        'tenis': [
            { id: 'tenis-cat-1', name: 'Tenis Adidas Yeezy', price: 650000, image: 'Tenis Adidas yeezy.webp' },
            { id: 'tenis-cat-2', name: 'Tenis Adidas Boost', price: 400000, image: 'Tenis Adidas Boost.avif' },
            { id: 'tenis-cat-3', name: 'Tenis Adidas Retro', price: 200000, image: 'Tenis Adidas Retro.jpg' }
        ],
        'jeans': [
            { id: 'jeans-cat-1', name: 'Jeans Clasicos', price: 60000, image: 'Jeans clasico hombre.jpg' },
            { id: 'jeans-cat-2', name: 'Jeans Clasicos II', price: 60000, image: 'Jeans clasicos catalogo.jpg' },
            { id: 'jeans-cat-3', name: 'Jeans Vintage', price: 80000, image: 'jeans ventage dama2.webp' },
            { id: 'jeans-cat-4', name: 'Jeans Vintage II', price: 80000, image: 'jeans vintage dama.webp' },
            { id: 'jeans-cat-5', name: 'Jeans Rotos', price: 65000, image: 'jeans rotos2.webp' },
            { id: 'jeans-cat-6', name: 'Jeans Relaxed', price: 60000, image: 'jeans relaxed 2.webp' },
            { id: 'jeans-cat-7', name: 'Jeans Modernos', price: 80000, image: 'Jeans modernos2.webp' },
            { id: 'jeans-cat-8', name: 'Jeans Modernos II', price: 70000, image: 'jeans modernos3.jpg' }
        ],
        'cascos': [
            { id: 'casco-cat-1', name: 'Casco Premium', price: 300000, image: 'Casco Premium.jpg' },
            { id: 'casco-cat-2', name: 'Casco Premium 2', price: 300000, image: 'Casco Premium2.webp' },
            { id: 'casco-cat-3', name: 'Casco Racing', price: 250000, image: 'Casco Racing.jpg' },
            { id: 'casco-cat-4', name: 'Casco Racing 2', price: 250000, image: 'Casco Racing2.jpg' },
            { id: 'casco-cat-5', name: 'Casco Touring', price: 180000, image: 'Casco Touring.webp' },
            { id: 'casco-cat-6', name: 'Casco Touring 2', price: 180000, image: 'Casco Touring2.webp' }
        ],
        'deportes': [
            { id: 'deportes-cat-1', name: 'Bicicleta Mountain Bike', price: 1000000, image: 'BicicletaCata.jpg' },
            { id: 'deportes-cat-2', name: 'Bicicleta Mountain Bike 2', price: 900000, image: 'Bicicleta Bike 3.webp' },
            { id: 'deportes-cat-3', name: 'Bicicleta Mountain Bike 3', price: 900000, image: 'Bicicleta Bike 4.jpg' },
            { id: 'deportes-cat-4', name: 'Bicicleta Mountain Bike 4', price: 1000000, image: 'Bicicleta Bike2.webp' },
            { id: 'deportes-cat-5', name: 'Equipo Completo Ciclismo', price: 320000, image: 'Equipo Completo 1.avif' },
            { id: 'deportes-cat-6', name: 'Equipo Completo Ciclismo 2', price: 3500000, image: 'Equipo Completo 2.avif' },
            { id: 'deportes-cat-7', name: 'Equipo Completo Ciclismo 3', price: 250000, image: 'Equipo Completo 3.avif' },
            { id: 'deportes-cat-8', name: 'Accesorios Deportivos', price: 70000, image: 'Acesorios Bici.webp' },
            { id: 'deportes-cat-9', name: 'Accesorios Deportivos 2', price: 60000, image: 'Acesorios Bici2.jpg' },
            { id: 'deportes-cat-10', name: 'Accesorios Deportivos 3', price: 40000, image: 'Acesorios Bici3.jpeg' }
        ]
    };
    
    return catalogProducts[category] || [];
}

// Funcionalidad de checkout
function proceedToCheckout() {
    if (cart.length === 0) {
        showNotification('Tu carrito está vacío');
        return;
    }
    
    // Verificar si el usuario está autenticado
    if (!authSystem.isAuthenticated) {
        showNotification('Debes iniciar sesión para proceder al pago');
        authSystem.showLoginModal();
        return;
    }
    
    // Mostrar modal de pago
    showPaymentModal();
}

// Flujo de registro de pedidos
function openReservationModal() {
    if (cart.length === 0) {
        showNotification('Tu carrito está vacío');
        return;
    }
    const modal = document.getElementById('reservation-modal');
    const overlay = document.getElementById('modal-overlay');
    const items = document.getElementById('reservation-items');
    const total = document.getElementById('reservation-total-amount');
    if (!modal || !overlay || !items || !total) return;
    // Render resumen
    let html = '';
    cart.forEach(item => {
        const lineTotal = item.price * item.quantity;
        html += `
            <div class="payment-item">
                <span>${item.name} x${item.quantity}</span>
                <span>$${lineTotal.toLocaleString()} COP</span>
            </div>
        `;
    });
    // Añadir información de descuento si aplica
    const computedSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let computedDiscount = 0;
    if (computedSubtotal >= 500000) {
        computedDiscount = computedSubtotal * 0.1;
    } else if (computedSubtotal >= 300000) {
        computedDiscount = computedSubtotal * 0.05;
    }
    if (computedDiscount > 0) {
        html += `
            <div class="payment-item" style="margin-top:6px;">
                <span style="font-weight:600;">Descuento aplicado</span>
                <span style="color:#44a08d;">-$${computedDiscount.toLocaleString()} COP</span>
            </div>
        `;
    }
    // Mostrar regalo incluido si lo hay
    const gifts = cart.filter(i => i.isGift === true);
    if (gifts.length > 0) {
        const giftNames = gifts.map(g => g.name.replace(' (REGALO)', '')).join(', ');
        html += `
            <div class="payment-item">
                <span>Regalo incluido</span>
                <span>${giftNames}</span>
            </div>
        `;
    }
    items.innerHTML = html;
    total.textContent = `$${cartTotal.toLocaleString()} COP`;
    modal.classList.add('show');
    overlay.classList.add('show');
    // Agregar clase modal-open al body para prevenir scroll
    document.body.classList.add('modal-open');
}

function closeReservationModal() {
    const modal = document.getElementById('reservation-modal');
    const overlay = document.getElementById('modal-overlay');
    if (modal && overlay) {
        modal.classList.remove('show');
        overlay.classList.remove('show');
        // Asegurarse de que se elimine la clase modal-open del body
        document.body.classList.remove('modal-open');
    }
}

function buildCartLinesForMessage() {
    const lines = cart.map(item => {
        const lineTotal = item.price * item.quantity;
        return `- ${item.name} x${item.quantity} - $${lineTotal.toLocaleString()} COP`;
    });
    // Agregar detalle de descuento si aplica
    const computedSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let computedDiscount = 0;
    if (computedSubtotal >= 500000) {
        computedDiscount = computedSubtotal * 0.1;
    } else if (computedSubtotal >= 300000) {
        computedDiscount = computedSubtotal * 0.05;
    }
    if (computedDiscount > 0) {
        lines.push(`Descuento aplicado: $${computedDiscount.toLocaleString()} COP`);
    }
    // Agregar regalo(s) si existen
    const gifts = cart.filter(i => i.isGift === true);
    if (gifts.length > 0) {
        const giftNames = gifts.map(g => g.name.replace(' (REGALO)', '')).join(', ');
        lines.push(`Regalo incluido: ${giftNames}`);
    }
    return lines.join('\n');
}

// Funciones de validación
function validateName(name) {
    // Solo letras A-Z, a-z, sin números, caracteres especiales ni tildes
    const nameRegex = /^[A-Za-z]+$/;
    return nameRegex.test(name);
}

function validateEmail(email) {
    // Solo @gmail.com y @hotmail.com
    const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail|hotmail)\.com$/;
    return emailRegex.test(email);
}

function validatePhone(phone) {
    // Exactamente 10 dígitos numéricos, sin letras, espacios ni caracteres especiales
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phone);
}

function submitReservation(event) {
    event.preventDefault();
    if (cart.length === 0) {
        showNotification('Tu carrito está vacío');
        return;
    }
    const firstName = document.getElementById('res-first-name').value.trim();
    const lastName = document.getElementById('res-last-name').value.trim();
    const phone = document.getElementById('res-phone').value.trim();
    const email = document.getElementById('res-email').value.trim();
    const paymentMethod = document.getElementById('res-payment-method').value;
    
    // Validaciones estrictas
    if (!firstName || !lastName || !phone || !email || !paymentMethod) {
        showNotification('Por favor completa todos los campos');
        return;
    }
    
    if (!validateName(firstName)) {
        showNotification('El nombre solo puede contener letras (A-Z, a-z). No se permiten números, caracteres especiales ni tildes.');
        return;
    }
    
    if (!validateName(lastName)) {
        showNotification('El apellido solo puede contener letras (A-Z, a-z). No se permiten números, caracteres especiales ni tildes.');
        return;
    }
    
    if (!validateEmail(email)) {
        showNotification('Solo se aceptan correos que terminen en @gmail.com o @hotmail.com');
        return;
    }
    
    if (!validatePhone(phone)) {
        showNotification('El número de teléfono debe contener exactamente 10 dígitos numéricos. No se permiten letras, espacios ni caracteres especiales.');
        return;
    }
    
    const customerBlock = `Nombre: ${firstName}\nApellido: ${lastName}\nTeléfono: ${phone}\nEmail: ${email}`;
    const productsBlock = buildCartLinesForMessage();
    const message = `Hola, quiero reservar mi compra.\n\n${customerBlock}\nMétodo de pago: ${paymentMethod}\n\nProductos seleccionados:\n${productsBlock}\n\nTotal: $${cartTotal.toLocaleString()} COP`;
    tryOpenWhatsApp(message);
}

function tryOpenWhatsApp(message) {
    const whatsappNumber = '573116039256'; // +57 Colombia
    const encoded = encodeURIComponent(message);
    const deepLink = `whatsapp://send?phone=${whatsappNumber}&text=${encoded}`;

    let visibilityChanged = false;
    const onVisibility = () => { visibilityChanged = true; };
    document.addEventListener('visibilitychange', onVisibility, { once: true });

    const fallbackTimer = setTimeout(() => {
        document.removeEventListener('visibilitychange', onVisibility, { once: true });
        if (!visibilityChanged) {
            showNotification('No se pudo abrir WhatsApp. Asegúrate de tener la app instalada.');
        }
    }, 1500);

    // Intentar abrir la app de WhatsApp
    window.location.href = deepLink;
}

// Mostrar modal de pago
function showPaymentModal() {
    const modal = document.getElementById('payment-modal');
    const overlay = document.getElementById('modal-overlay');
    
    if (modal && overlay) {
        // Actualizar resumen de compra
        updatePaymentSummary();
        
        modal.classList.add('show');
        overlay.classList.add('show');
        document.body.classList.add('modal-open');
    }
}

// Actualizar resumen de pago
function updatePaymentSummary() {
    const paymentItems = document.getElementById('payment-items');
    const paymentTotal = document.getElementById('payment-total-amount');
    
    if (!paymentItems || !paymentTotal) return;
    
    let itemsHTML = '';
    cart.forEach(item => {
        const totalPrice = item.price * item.quantity;
        itemsHTML += `
            <div class="payment-item">
                <span>${item.name} x${item.quantity}</span>
                <span>$${totalPrice.toLocaleString()} COP</span>
            </div>
        `;
    });
    
    paymentItems.innerHTML = itemsHTML;
    paymentTotal.textContent = `$${cartTotal.toLocaleString()} COP`;
}

// Sistema de notificaciones
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: linear-gradient(45deg, #FF0066, #00CCFF);
        color: white;
        padding: 1rem 2rem;
        border-radius: 10px;
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        font-weight: 600;
        max-width: 300px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Funciones de utilidad
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('show');
    });
    document.getElementById('modal-overlay').classList.remove('show');
}

// Efecto parallax en el hero
window.addEventListener('scroll', function() {
    const scrolled = window.pageYOffset;
    const heroImage = document.querySelector('.bike-container');
    
    if (heroImage) {
        const rate = scrolled * -0.5;
        heroImage.style.transform = `rotate(-5deg) translateY(${rate}px)`;
    }
});

// Optimización de rendimiento
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Aplicar debounce a eventos de scroll
const debouncedScroll = debounce(function() {
    // Lógica de scroll optimizada
}, 10);

window.addEventListener('scroll', debouncedScroll);

// Funcionalidad de botones de acción
document.addEventListener('DOMContentLoaded', function() {
    // Botón "Ver Más" del hero
    const heroBtn = document.querySelector('.hero .btn-primary');
    if (heroBtn) {
        heroBtn.addEventListener('click', function() {
            document.querySelector('#camisetas').scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        });
    }
    
    // Efectos hover en las tarjetas de productos
    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
});

// Funciones para los botones del HTML
function showLoginModal() {
    authSystem.showLoginModal();
}

function showRegisterModal() {
    authSystem.showRegisterModal();
}

function returnToLogin() {
    // Cerrar modal de registro
    closeRegisterModal();
    
    // Mostrar modal de login
    setTimeout(() => {
        showLoginModal();
    }, 300); // Pequeño delay para transición suave
}

function closeLoginModal() {
    const modal = document.getElementById('login-modal');
    const overlay = document.getElementById('modal-overlay');
    
    if (modal && overlay) {
        modal.classList.remove('show');
        overlay.classList.remove('show');
    }
}

function closeRegisterModal() {
    const modal = document.getElementById('register-modal');
    const overlay = document.getElementById('modal-overlay');
    
    if (modal && overlay) {
        modal.classList.remove('show');
        overlay.classList.remove('show');
    }
}


function logout() {
    authSystem.logout();
}

// Mostrar modal de perfil de usuario
function showUserProfileModal() {
    if (!authSystem.isAuthenticated || !authSystem.currentUser) {
        return;
    }
    
    const modal = document.getElementById('user-profile-modal');
    const overlay = document.getElementById('modal-overlay');
    
    // Cargar datos del usuario
    loadUserProfileData();
    
    modal.classList.add('show');
    overlay.classList.add('show');
}

// Cargar datos del perfil de usuario
function loadUserProfileData() {
    const user = authSystem.currentUser;
    
    // Avatar
    const profileAvatar = document.getElementById('profile-avatar');
    if (profileAvatar) {
        if (!user.picture) {
            const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
            profileAvatar.src = `https://via.placeholder.com/80x80/${randomColor.substring(1)}/ffffff?text=${initials}`;
        } else {
            profileAvatar.src = user.picture;
        }
    }
    
    // Información básica
    document.getElementById('profile-name').textContent = user.name;
    document.getElementById('profile-email').textContent = user.email;
    document.getElementById('profile-phone').textContent = user.phone || 'No especificado';
    
    // Detalles del perfil
    document.getElementById('profile-doc-type').textContent = user.docType || 'No especificado';
    document.getElementById('profile-doc-number').textContent = user.docNumber || 'No especificado';
    document.getElementById('profile-birthdate').textContent = user.birthdate ? new Date(user.birthdate).toLocaleDateString() : 'No especificado';
    
    // Fechas del sistema
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    document.getElementById('profile-registration-date').textContent = userData.registrationDate ? new Date(userData.registrationDate).toLocaleString() : 'No disponible';
    document.getElementById('profile-last-login').textContent = userData.lastLogin ? new Date(userData.lastLogin).toLocaleString() : 'No disponible';
}

// Cerrar modal de perfil de usuario
function closeUserProfileModal() {
    const modal = document.getElementById('user-profile-modal');
    const overlay = document.getElementById('modal-overlay');
    
    modal.classList.remove('show');
    overlay.classList.remove('show');
}

async function showMyProductsModal() {
    const modal = document.getElementById('my-products-modal');
    const overlay = document.getElementById('modal-overlay');
    
    if (modal && overlay) {
        // Cargar órdenes del usuario
        await loadUserOrders();
        
        modal.classList.add('show');
        overlay.classList.add('show');
    }
}

async function loadUserOrders() {
    const content = document.getElementById('my-products-content');
    if (!content) return;

    try {
        const orders = await authSystem.getUserOrders();
        
        if (orders.length === 0) {
            content.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📦</div>
                    <p>No tienes productos comprados aún</p>
                    <button class="btn-primary" onclick="closeMyProductsModal()">Comenzar a comprar</button>
                </div>
            `;
        } else {
            let ordersHTML = '<div class="orders-container">';
            
            orders.forEach((order, index) => {
                const orderDate = new Date(order.orderDate).toLocaleDateString('es-CO');
                const orderTime = new Date(order.orderDate).toLocaleTimeString('es-CO');
                
                ordersHTML += `
                    <div class="order-card">
                        <div class="order-header">
                            <h4>Orden #${index + 1}</h4>
                            <span class="order-date">${orderDate} - ${orderTime}</span>
                        </div>
                        <div class="order-items">
                            ${order.items.map(item => `
                                <div class="order-item">
                                    <span class="item-name">${item.name}</span>
                                    <span class="item-quantity">x${item.quantity}</span>
                                    <span class="item-price">$${item.price.toLocaleString()} COP</span>
                                </div>
                            `).join('')}
                        </div>
                        <div class="order-footer">
                            <div class="order-total">
                                <strong>Total: $${order.total.toLocaleString()} COP</strong>
                            </div>
                            <div class="order-payment">
                                <span class="payment-method">${order.paymentMethod}</span>
                                <span class="order-status">${order.status}</span>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            ordersHTML += '</div>';
            content.innerHTML = ordersHTML;
        }
    } catch (error) {
        console.error('Error al cargar órdenes:', error);
        content.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">❌</div>
                <p>Error al cargar tus órdenes</p>
                <button class="btn-primary" onclick="closeMyProductsModal()">Cerrar</button>
            </div>
        `;
    }
}

function closeMyProductsModal() {
    const modal = document.getElementById('my-products-modal');
    const overlay = document.getElementById('modal-overlay');
    
    if (modal && overlay) {
        modal.classList.remove('show');
        overlay.classList.remove('show');
    }
}

function showTermsModal() {
    const modal = document.getElementById('terms-modal');
    const overlay = document.getElementById('modal-overlay');
    
    if (modal && overlay) {
        modal.classList.add('show');
        overlay.classList.add('show');
    }
}

function closeTermsModal() {
    const modal = document.getElementById('terms-modal');
    const overlay = document.getElementById('modal-overlay');
    
    if (modal && overlay) {
        modal.classList.remove('show');
        overlay.classList.remove('show');
    }
}

function closePaymentModal() {
    const modal = document.getElementById('payment-modal');
    const overlay = document.getElementById('modal-overlay');
    
    if (modal && overlay) {
        modal.classList.remove('show');
        overlay.classList.remove('show');
    }
}

function showEmailVerificationModal() {
    const modal = document.getElementById('email-verification-modal');
    const overlay = document.getElementById('modal-overlay');
    
    if (modal && overlay) {
        modal.classList.add('show');
        overlay.classList.add('show');
    }
}

function closeEmailVerificationModal() {
    const modal = document.getElementById('email-verification-modal');
    const overlay = document.getElementById('modal-overlay');
    
    if (modal && overlay) {
        modal.classList.remove('show');
        overlay.classList.remove('show');
    }
}

function resendVerificationCode() {
    showNotification('Código de verificación reenviado');
}

// Funciones de pago
async function processNequiPayment() {
    const number = document.getElementById('nequi-number').value;
    if (!number || number.length < 10) {
        showNotification('Por favor ingresa un número de Nequi válido (10 dígitos)');
        return;
    }
    
    // Verificar que el usuario esté autenticado
    if (!authSystem.isAuthenticated) {
        showNotification('Debes iniciar sesión para realizar el pago');
        authSystem.showLoginModal();
        return;
    }
    
    showNotification('Procesando pago con Nequi...');
    
    // Simular procesamiento
    setTimeout(async () => {
        try {
            // SOLO REGISTRAR TRANSACCIÓN SI EL PAGO ES EXITOSO
            const paymentSuccess = await simulatePaymentProcessing('Nequi', number);
            
            if (paymentSuccess) {
                // Guardar orden en la base de datos SOLO si el pago fue exitoso
                const orderData = {
                    items: cart.map(item => ({
                        id: item.id,
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity,
                        image: item.image || null
                    })),
                    total: cartTotal,
                    subtotal: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
                    discount: cartTotal < cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) ? 
                             cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) - cartTotal : 0,
                    paymentMethod: 'Nequi',
                    paymentNumber: '****' + number.slice(-4), // Solo últimos 4 dígitos
                    status: 'completed',
                    orderDate: new Date().toISOString(),
                    transactionId: 'nequi_' + Date.now(),
                    userId: authSystem.currentUser.id,
                    userEmail: authSystem.currentUser.email,
                    completedAt: new Date().toISOString()
                };
                
                await authSystem.saveUserOrder(orderData);
                
                showNotification('¡Pago exitoso con Nequi! Transacción registrada.');
                closePaymentModal();
                
                // Limpiar carrito
                cart = [];
                updateCartDisplay();
                updateCartIcon();
                
                // Detener timer de compra obligatoria si existe
                if (authSystem.purchaseFlowInterval) {
                    clearInterval(authSystem.purchaseFlowInterval);
                }
            } else {
                showNotification('Error en el procesamiento del pago. Intenta de nuevo.');
                // NO registrar nada si el pago falla
            }
        } catch (error) {
            console.error('Error al procesar pago:', error);
            showNotification('Error al procesar el pago');
            // NO registrar nada si hay error
        }
    }, 2000);
}

async function processBancolombiaPayment() {
    const number = document.getElementById('bancolombia-number').value;
    if (!number || number.length < 10) {
        showNotification('Por favor ingresa un número de Bancolombia válido (10 dígitos)');
        return;
    }
    
    // Verificar que el usuario esté autenticado
    if (!authSystem.isAuthenticated) {
        showNotification('Debes iniciar sesión para realizar el pago');
        authSystem.showLoginModal();
        return;
    }
    
    showNotification('Procesando pago con Bancolombia...');
    
    // Simular procesamiento
    setTimeout(async () => {
        try {
            // SOLO REGISTRAR TRANSACCIÓN SI EL PAGO ES EXITOSO
            const paymentSuccess = await simulatePaymentProcessing('Bancolombia', number);
            
            if (paymentSuccess) {
                // Guardar orden en la base de datos SOLO si el pago fue exitoso
                const orderData = {
                    items: cart.map(item => ({
                        id: item.id,
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity,
                        image: item.image || null
                    })),
                    total: cartTotal,
                    subtotal: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
                    discount: cartTotal < cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) ? 
                             cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) - cartTotal : 0,
                    paymentMethod: 'Bancolombia',
                    paymentNumber: '****' + number.slice(-4), // Solo últimos 4 dígitos
                    status: 'completed',
                    orderDate: new Date().toISOString(),
                    transactionId: 'bancolombia_' + Date.now(),
                    userId: authSystem.currentUser.id,
                    userEmail: authSystem.currentUser.email,
                    completedAt: new Date().toISOString()
                };
                
                await authSystem.saveUserOrder(orderData);
                
                showNotification('¡Pago exitoso con Bancolombia! Transacción registrada.');
                closePaymentModal();
                
                // Limpiar carrito
                cart = [];
                updateCartDisplay();
                updateCartIcon();
                
                // Detener timer de compra obligatoria si existe
                if (authSystem.purchaseFlowInterval) {
                    clearInterval(authSystem.purchaseFlowInterval);
                }
            } else {
                showNotification('Error en el procesamiento del pago. Intenta de nuevo.');
                // NO registrar nada si el pago falla
            }
        } catch (error) {
            console.error('Error al procesar pago:', error);
            showNotification('Error al procesar el pago');
            // NO registrar nada si hay error
        }
    }, 2000);
}

// SIMULAR PROCESAMIENTO DE PAGO (solo registra si es exitoso)
async function simulatePaymentProcessing(method, number) {
    // Simular validación del número
    if (!number || number.length < 10) {
        return false;
    }
    
    // Simular probabilidad de éxito (90% de éxito)
    const success = Math.random() > 0.1;
    
    if (success) {
        console.log(`Pago exitoso con ${method} - Número: ${number}`);
        return true;
    } else {
        console.log(`Pago fallido con ${method} - Número: ${number}`);
        return false;
    }
}