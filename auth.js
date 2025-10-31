// Sistema de Autenticación para Estilo Activo
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.verificationCode = null;
        this.pendingUser = null;
        
        this.init();
    }
    
    // Función para capitalizar la primera letra de cada palabra
    capitalizeWords(text) {
        if (!text) return text;
        return text.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    init() {
        this.checkAuthStatus();
        this.setupEventListeners();
        this.initializeOAuth();
    }

    // Verificar estado de autenticación al cargar la página
    checkAuthStatus() {
        const token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('userData');
        
        if (token && userData) {
            try {
                this.currentUser = JSON.parse(userData);
                this.isAuthenticated = true;
                this.updateUI();
            } catch (error) {
                console.error('Error parsing user data:', error);
                this.logout();
            }
        }
    }

    // Configurar event listeners
    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Register form
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Verification form
        const verificationForm = document.getElementById('verification-form');
        if (verificationForm) {
            verificationForm.addEventListener('submit', (e) => this.handleVerification(e));
        }

        // Password strength indicator
        const passwordInput = document.getElementById('register-password');
        if (passwordInput) {
            passwordInput.addEventListener('input', (e) => this.checkPasswordStrength(e.target.value));
        }

        // Payment tabs
        document.querySelectorAll('.payment-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchPaymentMethod(e.target.dataset.method));
        });

        // Card form
        const cardForm = document.getElementById('card-form');
        if (cardForm) {
            cardForm.addEventListener('submit', (e) => this.handleCardPayment(e));
        }

        // Formatear inputs
        this.setupInputFormatting();
    }

    // Inicializar OAuth
    initializeOAuth() {
        // Google OAuth
        if (typeof google !== 'undefined') {
            google.accounts.id.initialize({
                client_id: 'YOUR_GOOGLE_CLIENT_ID', // Reemplazar con tu Client ID real
                callback: this.handleGoogleCallback.bind(this)
            });
        }

        // Facebook OAuth
        if (typeof FB !== 'undefined') {
            FB.init({
                appId: 'YOUR_FACEBOOK_APP_ID', // Reemplazar con tu App ID real
                cookie: true,
                xfbml: true,
                version: 'v18.0'
            });
        }
    }

    // Manejar login con email/contraseña
    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        // Validar campos
        if (!this.validateEmail(email)) {
            this.showError('login-email-error', 'Ingresa un correo electrónico válido');
            return;
        }
        
        if (!password) {
            this.showError('login-password-error', 'La contraseña es requerida');
            return;
        }

        try {
            // CARGAR USUARIOS DESDE USERS.JSON
            const users = await this.loadUsersFromJSON();
            const user = users.find(u => u.email === email);
            
            if (!user) {
                // Usuario no existe - mostrar alerta
                alert('❌ Usuario no registrado. Debes crear una cuenta primero.');
                this.showError('login-email-error', 'Usuario no registrado. Debes crear una cuenta primero.');
                return;
            }

            // Usuario existe - proceder con login
            this.currentUser = {
                id: user.id,
                name: user.name + ' ' + user.lastname,
                email: user.email,
                phone: user.phone,
                docType: user.docType,
                docNumber: user.docNumber,
                birthdate: user.birthdate,
                verified: true
            };
            
            this.isAuthenticated = true;
            localStorage.setItem('authToken', 'mock_jwt_token_' + Date.now());
            localStorage.setItem('userData', JSON.stringify(this.currentUser));
            
            this.closeLoginModal();
            this.updateUI();
            this.showNotification('¡Bienvenido de vuelta!');
            
            // OBLIGAR AL USUARIO A CONTINUAR CON EL PROCESO DE COMPRA
            this.forcePurchaseFlow();
            
        } catch (error) {
            console.error('Error al iniciar sesión:', error);
            this.showError('login-password-error', 'Error al iniciar sesión. Intenta de nuevo.');
        }
    }

    // Manejar registro
    async handleRegister(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const userData = Object.fromEntries(formData.entries());
        
        // Capitalizar nombre y apellido
        if (userData.name) {
            userData.name = this.capitalizeWords(userData.name);
        }
        if (userData.lastname) {
            userData.lastname = this.capitalizeWords(userData.lastname);
        }
        
        // Validar datos
        const validation = this.validateRegistration(userData);
        if (!validation.isValid) {
            this.showError(validation.field + '-error', validation.message);
            return;
        }

        // Verificar edad
        if (!this.isAdult(userData.birthdate)) {
            this.showError('register-birthdate-error', 'Debes ser mayor de 18 años');
            return;
        }

        try {
            // CARGAR USUARIOS EXISTENTES
            const existingUsers = await this.loadUsersFromJSON();
            
            // VERIFICAR SI EL EMAIL YA EXISTE
            const userExists = existingUsers.some(user => user.email === userData.email);
            if (userExists) {
                alert('❌ Este correo electrónico ya está registrado');
                this.showError('register-email-error', 'Este correo electrónico ya está registrado');
                return;
            }

            // Guardar usuario pendiente para verificación
            this.pendingUser = userData;
            this.verificationCode = '123456'; // Código fijo para desarrollo
            
            this.closeRegisterModal();
            this.showEmailVerificationModal(userData.email);
            
        } catch (error) {
            console.error('Error al registrar usuario:', error);
            this.showError('register-email-error', 'Error al crear la cuenta. Intenta de nuevo.');
        }
    }

    // Manejar verificación de email
    async handleVerification(e) {
        e.preventDefault();
        
        const code = document.getElementById('verification-code').value;
        
        if (!code || code.length !== 6) {
            this.showError('verification-code-error', 'Ingresa un código de 6 dígitos');
            return;
        }

        try {
            // Verificar código (siempre 123456 para desarrollo)
            if (code !== '123456') {
                this.showError('verification-code-error', 'Código incorrecto');
                return;
            }

            // GUARDAR USUARIO EN USERS.JSON
            const completeUserData = {
                ...this.pendingUser,
                id: 'user_' + Date.now(),
                verified: true,
                registrationDate: new Date().toISOString(),
                registrationTimestamp: Date.now(),
                isActive: true,
                lastLogin: new Date().toISOString()
            };
            
            // Cargar usuarios existentes
            const existingUsers = await this.loadUsersFromJSON();
            
            // Agregar nuevo usuario
            existingUsers.push(completeUserData);
            
            // Guardar en users.json
            await this.saveUsersToJSON(existingUsers);
            
            // Configurar usuario actual
            this.currentUser = {
                id: completeUserData.id,
                name: completeUserData.name + ' ' + completeUserData.lastname,
                email: completeUserData.email,
                phone: completeUserData.phone,
                docType: completeUserData.docType,
                docNumber: completeUserData.docNumber,
                birthdate: completeUserData.birthdate,
                verified: true
            };
            
            this.isAuthenticated = true;
            localStorage.setItem('authToken', 'mock_jwt_token_' + Date.now());
            localStorage.setItem('userData', JSON.stringify(this.currentUser));
            
            this.closeEmailVerificationModal();
            this.updateUI();
            this.showNotification('¡Cuenta verificada y registrada exitosamente!');
            
            // OBLIGAR AL USUARIO A CONTINUAR CON EL PROCESO DE COMPRA
            this.forcePurchaseFlow();
            
        } catch (error) {
            console.error('Error al verificar código:', error);
            this.showError('verification-code-error', 'Error al verificar el código');
        }
    }


    // Manejar éxito de OAuth
    async handleOAuthSuccess(user) {
        try {
            this.showNotification('Procesando autenticación...');
            
            // VERIFICAR SI EL USUARIO ESTÁ REGISTRADO EN LA BASE DE DATOS
            const isUserRegistered = await this.verifyUserRegistration(user.email);
            
            if (!isUserRegistered) {
                // Usuario no registrado - obligar a completar registro
                this.showNotification('Debes completar tu registro para continuar');
                this.forceUserRegistration(user);
                return;
            }
            
            const response = await this.simulateApiCall('/api/auth/oauth', user);
            
            if (response.success) {
                this.currentUser = response.user;
                this.isAuthenticated = true;
                localStorage.setItem('authToken', response.token);
                localStorage.setItem('userData', JSON.stringify(response.user));
                
                // Cerrar todos los modales de autenticación
                this.closeLoginModal();
                this.closeRegisterModal();
                this.closeEmailVerificationModal();
                
                this.updateUI();
                
                // Mostrar mensaje de bienvenida personalizado
                if (response.isNewUser) {
                    this.showNotification(`¡Bienvenido a Style, ${user.name}! Tu cuenta ha sido creada exitosamente.`);
                } else {
                    this.showNotification(`¡Bienvenido de vuelta, ${user.name}!`);
                }
                
                // Actualizar la UI con la foto del usuario si está disponible
                this.updateUserProfile(user);
                
                // OBLIGAR AL USUARIO A CONTINUAR CON EL PROCESO DE COMPRA
                this.forcePurchaseFlow();
            } else {
                this.showNotification('Error al autenticar: ' + (response.message || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error en OAuth:', error);
            this.showNotification('Error al procesar el login');
        }
    }

    // Callback de Google
    handleGoogleCallback(response) {
        try {
            // Decodificar el JWT token para obtener información del usuario
            const payload = JSON.parse(atob(response.credential.split('.')[1]));
            
            const user = {
                id: 'google_' + payload.sub,
                name: payload.name,
                email: payload.email,
                provider: 'google',
                verified: payload.email_verified,
                picture: payload.picture
            };
            
            this.handleOAuthSuccess(user);
        } catch (error) {
            console.error('Error decodificando Google token:', error);
            this.showNotification('Error al procesar la información de Google');
        }
    }

    // Actualizar perfil del usuario en la UI
    updateUserProfile(user) {
        // Actualizar avatar si está disponible
        if (user.picture) {
            const userAvatar = document.querySelector('.user-avatar');
            if (userAvatar) {
                userAvatar.src = user.picture;
                userAvatar.style.display = 'block';
            }
        }
        
        // Actualizar nombre del usuario en la UI
        const userNameElements = document.querySelectorAll('.user-name');
        userNameElements.forEach(element => {
            element.textContent = user.name;
        });
    }

    // Cerrar sesión
    logout() {
        this.currentUser = null;
        this.isAuthenticated = false;
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        this.updateUI();
        this.showNotification('Sesión cerrada');
    }

    // Actualizar UI según estado de autenticación
    updateUI() {
        const loginBtn = document.getElementById('login-btn');
        const myProductsBtn = document.getElementById('my-products-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const userInfo = document.getElementById('user-info');
        const userAvatar = document.getElementById('user-avatar');
        const userName = document.getElementById('user-name');

        if (this.isAuthenticated && this.currentUser) {
            if (loginBtn) loginBtn.style.display = 'none';
            if (myProductsBtn) myProductsBtn.style.display = 'block';
            if (logoutBtn) logoutBtn.style.display = 'block';
            if (userInfo) userInfo.style.display = 'flex';
            
            // Mostrar información del usuario
            if (userName) userName.textContent = this.currentUser.name;
            if (userAvatar) {
                // Generar avatar aleatorio si no hay imagen
                if (!this.currentUser.picture) {
                    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'];
                    const randomColor = colors[Math.floor(Math.random() * colors.length)];
                    const initials = this.currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase();
                    userAvatar.src = `https://via.placeholder.com/40x40/${randomColor.substring(1)}/ffffff?text=${initials}`;
                } else {
                    userAvatar.src = this.currentUser.picture;
                }
                userAvatar.style.display = 'block';
            }
        } else {
            if (loginBtn) loginBtn.style.display = 'block';
            if (myProductsBtn) myProductsBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (userInfo) userInfo.style.display = 'none';
        }
    }

    // Validaciones
    validateEmail(email) {
        // Convertir a minúsculas
        email = email.toLowerCase();
        
        // Validar que termine en uno de los dominios permitidos
        const validDomains = ['@gmail.com', '@hotmail.com', '@udi.edu.co'];
        const hasDomain = validDomains.some(domain => email.endsWith(domain));
        
        // Validar formato general de correo
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email) && hasDomain;
    }

    validateColombianPhone(phone) {
        // Validar formato colombiano: +57 seguido de 10 dígitos
        const phoneRegex = /^\+57\s?\d{10}$/;
        return phoneRegex.test(phone);
    }

    validateRegistration(data) {
        // Validar nombre
        if (!data.name || data.name.trim().length < 2) {
            return { isValid: false, field: 'register-name', message: 'El nombre debe tener al menos 2 caracteres' };
        }

        // Validar apellidos
        if (!data.lastname || data.lastname.trim().length < 2) {
            return { isValid: false, field: 'register-lastname', message: 'Los apellidos deben tener al menos 2 caracteres' };
        }

        // Validar tipo de documento
        if (!data.docType) {
            return { isValid: false, field: 'register-doc-type', message: 'Selecciona un tipo de documento' };
        }

        // Validar número de documento
        if (!data.docNumber || data.docNumber.trim().length < 6) {
            return { isValid: false, field: 'register-doc-number', message: 'El número de documento debe tener al menos 6 dígitos' };
        }

        // Validar email
        if (!this.validateEmail(data.email)) {
            return { isValid: false, field: 'register-email', message: 'Ingresa un correo electrónico válido' };
        }

        // Validar fecha de nacimiento
        if (!data.birthdate) {
            return { isValid: false, field: 'register-birthdate', message: 'La fecha de nacimiento es requerida' };
        }

        // Validar teléfono colombiano
        if (!this.validateColombianPhone(data.phone)) {
            return { isValid: false, field: 'register-phone', message: 'El teléfono debe tener formato +57 seguido de 10 dígitos' };
        }

        // Validar contraseña
        if (!data.password || data.password.length < 8) {
            return { isValid: false, field: 'register-password', message: 'La contraseña debe tener al menos 8 caracteres' };
        }

        // Validar confirmación de contraseña
        if (data.password !== data.confirmPassword) {
            return { isValid: false, field: 'register-confirm-password', message: 'Las contraseñas no coinciden' };
        }

        // Validar términos
        if (!data.terms) {
            return { isValid: false, field: 'register-terms', message: 'Debes aceptar los términos y condiciones' };
        }

        return { isValid: true };
    }

    isAdult(birthdate) {
        const today = new Date();
        const birth = new Date(birthdate);
        const age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            return age - 1 >= 18;
        }
        return age >= 18;
    }

    checkPasswordStrength(password) {
        const strengthIndicator = document.getElementById('password-strength');
        if (!strengthIndicator) return;

        let strength = 0;
        if (password.length >= 8) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;

        strengthIndicator.className = 'password-strength';
        
        if (strength < 2) {
            strengthIndicator.classList.add('weak');
        } else if (strength < 3) {
            strengthIndicator.classList.add('fair');
        } else if (strength < 4) {
            strengthIndicator.classList.add('good');
        } else {
            strengthIndicator.classList.add('strong');
        }
    }

    // Configurar formateo de inputs
    setupInputFormatting() {
        // Formatear número de tarjeta
        const cardNumber = document.getElementById('card-number');
        if (cardNumber) {
            cardNumber.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
                let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
                e.target.value = formattedValue;
            });
        }

        // Formatear fecha de vencimiento
        const cardExpiry = document.getElementById('card-expiry');
        if (cardExpiry) {
            cardExpiry.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length >= 2) {
                    value = value.substring(0, 2) + '/' + value.substring(2, 4);
                }
                e.target.value = value;
            });
        }

        // Solo números para CVV
        const cardCvv = document.getElementById('card-cvv');
        if (cardCvv) {
            cardCvv.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
            });
        }

        // Formatear teléfono colombiano
        const phoneInput = document.getElementById('register-phone');
        if (phoneInput) {
            phoneInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                
                // Si empieza con 57, agregar +57
                if (value.startsWith('57') && value.length > 2) {
                    value = '+57' + value.substring(2);
                } else if (!value.startsWith('+57') && value.length > 0) {
                    value = '+57' + value;
                }
                
                // Limitar a +57 + 10 dígitos
                if (value.startsWith('+57')) {
                    const digits = value.substring(3);
                    if (digits.length > 10) {
                        value = '+57' + digits.substring(0, 10);
                    }
                }
                
                e.target.value = value;
            });
            
            // Validar en tiempo real
            phoneInput.addEventListener('blur', (e) => {
                if (e.target.value && !this.validateColombianPhone(e.target.value)) {
                    this.showError('register-phone-error', 'Formato inválido. Debe ser +57 seguido de 10 dígitos');
                } else {
                    this.clearError('register-phone-error');
                }
            });
        }
    }

    // Métodos de UI
    showLoginModal() {
        if (!this.isAuthenticated) {
            this.openModal('login-modal');
        }
    }

    showRegisterModal() {
        // Cerrar modal de login si está abierto
        this.closeLoginModal();
        
        // Mostrar modal de registro
        this.openModal('register-modal');
    }

    closeLoginModal() {
        this.closeModal('login-modal');
        this.clearForm('login-form');
    }

    closeRegisterModal() {
        this.closeModal('register-modal');
        this.clearForm('register-form');
    }

    showEmailVerificationModal(email) {
        document.getElementById('verification-email').textContent = email;
        this.openModal('email-verification-modal');
    }

    closeEmailVerificationModal() {
        this.closeModal('email-verification-modal');
        this.clearForm('verification-form');
    }

    showTermsModal() {
        this.openModal('terms-modal');
    }

    closeTermsModal() {
        this.closeModal('terms-modal');
    }

    showMyProductsModal() {
        if (this.isAuthenticated) {
            this.loadUserProducts();
            this.openModal('my-products-modal');
        }
    }

    closeMyProductsModal() {
        this.closeModal('my-products-modal');
    }

    // Métodos de pago
    switchPaymentMethod(method) {
        // Actualizar tabs
        document.querySelectorAll('.payment-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-method="${method}"]`).classList.add('active');

        // Actualizar contenido
        document.querySelectorAll('.payment-method').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${method}-payment`).classList.add('active');
    }

    async processNequiPayment() {
        const number = document.getElementById('nequi-number').value;
        if (!number || number.length !== 10) {
            this.showNotification('Ingresa un número de Nequi válido');
            return;
        }

        await this.processPayment('nequi', { number });
    }

    async processBancolombiaPayment() {
        const number = document.getElementById('bancolombia-number').value;
        if (!number || number.length !== 10) {
            this.showNotification('Ingresa un número de Bancolombia válido');
            return;
        }

        await this.processPayment('bancolombia', { number });
    }

    async handleCardPayment(e) {
        e.preventDefault();
        
        const cardData = {
            number: document.getElementById('card-number').value.replace(/\s/g, ''),
            expiry: document.getElementById('card-expiry').value,
            cvv: document.getElementById('card-cvv').value,
            name: document.getElementById('card-name').value
        };

        if (!this.validateCardData(cardData)) {
            return;
        }

        await this.processPayment('card', cardData);
    }

    validateCardData(cardData) {
        if (!cardData.number || cardData.number.length < 16) {
            this.showNotification('Número de tarjeta inválido');
            return false;
        }

        if (!cardData.expiry || !/^\d{2}\/\d{2}$/.test(cardData.expiry)) {
            this.showNotification('Fecha de vencimiento inválida');
            return false;
        }

        if (!cardData.cvv || cardData.cvv.length < 3) {
            this.showNotification('CVV inválido');
            return false;
        }

        if (!cardData.name || cardData.name.trim().length < 2) {
            this.showNotification('Nombre en la tarjeta inválido');
            return false;
        }

        return true;
    }

    async processPayment(method, data) {
        if (!this.isAuthenticated) {
            this.showNotification('Debes iniciar sesión para realizar el pago');
            this.showLoginModal();
            return;
        }

        try {
            // Obtener items del carrito
            const items = window.cart || [];
            const amount = window.cartTotal || 0;

            if (items.length === 0) {
                this.showNotification('No hay productos en el carrito para procesar');
                return;
            }

            // SOLO REGISTRAR TRANSACCIÓN SI EL PAGO ES EXITOSO
            const paymentSuccess = await this.simulatePaymentProcessing(method, data);

            if (paymentSuccess) {
                // Procesar pago exitoso
                const response = await this.simulateApiCall('/api/payments/process', {
                    method,
                    data,
                    amount,
                    items
                });

                if (response.success) {
                    // GUARDAR ORDEN EN LA BASE DE DATOS SOLO SI EL PAGO FUE EXITOSO
                    const orderData = {
                        items: items.map(item => ({
                            id: item.id,
                            name: item.name,
                            price: item.price,
                            quantity: item.quantity,
                            image: item.image || null
                        })),
                        total: amount,
                        subtotal: items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
                        discount: amount < items.reduce((sum, item) => sum + (item.price * item.quantity), 0) ? 
                                 items.reduce((sum, item) => sum + (item.price * item.quantity), 0) - amount : 0,
                        paymentMethod: method,
                        paymentData: this.sanitizePaymentData(data),
                        status: 'completed',
                        orderDate: new Date().toISOString(),
                        transactionId: method + '_' + Date.now(),
                        userId: this.currentUser.id,
                        userEmail: this.currentUser.email,
                        completedAt: new Date().toISOString()
                    };
                    
                    // Guardar orden exitosa
                    await this.saveUserOrder(orderData);
                    
                    // Registrar transacción exitosa
                    await this.recordSuccessfulTransaction(orderData);
                    
                    this.closePaymentModal();
                    
                    // Limpiar carrito
                    if (window.cart) {
                        window.cart = [];
                        if (typeof updateCartDisplay === 'function') {
                            updateCartDisplay();
                        }
                        if (typeof updateCartIcon === 'function') {
                            updateCartIcon();
                        }
                    }
                    
                    this.showNotification('¡Pago procesado exitosamente! Transacción registrada.');
                    
                    // Actualizar productos del usuario
                    setTimeout(() => {
                        this.loadUserProducts();
                    }, 1000);
                } else {
                    this.showNotification('Error al procesar el pago: ' + response.message);
                }
            } else {
                this.showNotification('Error en el procesamiento del pago. Intenta de nuevo.');
                // NO registrar nada si el pago falla
            }
        } catch (error) {
            this.showNotification('Error al procesar el pago: ' + error.message);
            // NO registrar nada si hay error
        }
    }

    // Sanitizar datos de pago para no guardar información sensible
    sanitizePaymentData(data) {
        const sanitized = { ...data };
        if (sanitized.number) {
            // Solo guardar los últimos 4 dígitos
            sanitized.number = '****' + sanitized.number.slice(-4);
        }
        if (sanitized.cvv) {
            // No guardar CVV
            delete sanitized.cvv;
        }
        return sanitized;
    }

    // Registrar transacción exitosa
    async recordSuccessfulTransaction(orderData) {
        try {
            // Intentar guardar en el servidor primero
            try {
                const response = await fetch('/api/transactions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(orderData)
                });
                
                const result = await response.json();
                if (result.success) {
                    console.log('Transacción registrada exitosamente en servidor:', result.transaction);
                }
            } catch (serverError) {
                console.log('Servidor no disponible, guardando transacción localmente');
                
                // Fallback a localStorage
                const transactions = JSON.parse(localStorage.getItem('successful_transactions')) || [];
                transactions.push(orderData);
                localStorage.setItem('successful_transactions', JSON.stringify(transactions));
                console.log('Transacción registrada localmente:', orderData);
            }
        } catch (error) {
            console.error('Error al registrar transacción:', error);
        }
    }

    // SIMULAR PROCESAMIENTO DE PAGO (solo registra si es exitoso)
    async simulatePaymentProcessing(method, data) {
        // Simular validación según el método
        if (method === 'card') {
            if (!data.number || data.number.length < 16) {
                return false;
            }
            if (!data.expiry || !/^\d{2}\/\d{2}$/.test(data.expiry)) {
                return false;
            }
            if (!data.cvv || data.cvv.length < 3) {
                return false;
            }
        } else if (method === 'nequi' || method === 'bancolombia') {
            if (!data.number || data.number.length < 10) {
                return false;
            }
        }
        
        // Simular probabilidad de éxito (90% de éxito)
        const success = Math.random() > 0.1;
        
        if (success) {
            console.log(`Pago exitoso con ${method}`);
            return true;
        } else {
            console.log(`Pago fallido con ${method}`);
            return false;
        }
    }

    // Utilidades
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        const overlay = document.getElementById('modal-overlay');
        
        if (modal && overlay) {
            modal.classList.add('show');
            overlay.classList.add('show');
            document.body.classList.add('modal-open');
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        const overlay = document.getElementById('modal-overlay');
        
        if (modal && overlay) {
            modal.classList.remove('show');
            overlay.classList.remove('show');
            document.body.classList.remove('modal-open');
        }
    }

    clearForm(formId) {
        const form = document.getElementById(formId);
        if (form) {
            form.reset();
            // Limpiar errores
            form.querySelectorAll('.error-message').forEach(error => {
                error.classList.remove('show');
            });
        }
    }

    showError(fieldId, message) {
        const errorElement = document.getElementById(fieldId);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
        }
    }

    clearError(fieldId) {
        const errorElement = document.getElementById(fieldId);
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.classList.remove('show');
        }
    }

    showNotification(message) {
        // Usar la función existente del script principal
        if (typeof showNotification === 'function') {
            showNotification(message);
        } else {
            alert(message);
        }
    }

    // Llamadas API reales
    async apiCall(endpoint, data, method = 'POST') {
        try {
            const url = `http://localhost:3000${endpoint}`;
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                }
            };

            if (data) {
                options.body = JSON.stringify(data);
            }

            // Agregar token de autenticación si existe
            const token = localStorage.getItem('authToken');
            if (token) {
                options.headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(url, options);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Error en la solicitud');
            }

            return result;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Simular llamadas API (fallback para desarrollo)
    async simulateApiCall(endpoint, data) {
        // Si el backend no está disponible, usar simulación
        try {
            return await this.apiCall(endpoint, data);
        } catch (error) {
            console.log('Backend no disponible, usando simulación');
            
            // Simular delay de red
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Simular respuestas según el endpoint
            switch (endpoint) {
                case '/api/auth/login':
                    // Verificar si el usuario existe en users.json
                    const loginUsers = await this.loadUsersFromJSON();
                    const loginUser = loginUsers.find(u => u.email === data.email);
                    
                    if (loginUser) {
                        return {
                            success: true,
                            token: 'mock_jwt_token_' + Date.now(),
                            user: {
                                id: loginUser.id,
                                name: loginUser.name + ' ' + loginUser.lastname,
                                email: loginUser.email,
                                verified: true
                            }
                        };
                    }
                    return { success: false, message: 'Credenciales incorrectas' };

                case '/api/auth/register':
                    return {
                        success: true,
                        verificationCode: '123456'
                    };

                case '/api/auth/verify':
                    if (data.code === '123456') {
                        return {
                            success: true,
                            token: 'mock_jwt_token_' + Date.now(),
                            user: {
                                id: 'user_' + Date.now(),
                                name: this.pendingUser.name + ' ' + this.pendingUser.lastname,
                                email: this.pendingUser.email,
                                verified: true
                            }
                        };
                    }
                    return { success: false, message: 'Código incorrecto' };

                case '/api/auth/oauth':
                    // Simular verificación si el usuario ya existe
                    const oauthUsers = JSON.parse(localStorage.getItem('oauth_users') || '[]');
                    const oauthUser = oauthUsers.find(u => u.email === data.email);
                    
                    if (oauthUser) {
                        // Usuario existente - solo login
                        return {
                            success: true,
                            token: 'mock_jwt_token_' + Date.now(),
                            user: oauthUser,
                            isNewUser: false
                        };
                    } else {
                        // Usuario nuevo - crear cuenta
                        const newOAuthUser = {
                            ...data,
                            id: data.id,
                            created_at: new Date().toISOString(),
                            phone: null, // Los usuarios OAuth no tienen teléfono inicialmente
                            docType: null,
                            docNumber: null
                        };
                        
                        oauthUsers.push(newOAuthUser);
                        localStorage.setItem('oauth_users', JSON.stringify(oauthUsers));
                        
                        return {
                            success: true,
                            token: 'mock_jwt_token_' + Date.now(),
                            user: newOAuthUser,
                            isNewUser: true
                        };
                    }

                case '/api/payments/process':
                    return { success: true, transactionId: 'txn_' + Date.now() };

                case '/api/user/products':
                    return { success: true, products: [] };

                default:
                    return { success: false, message: 'Endpoint no encontrado' };
            }
        }
    }

    // Cargar productos del usuario
    async loadUserProducts() {
        const content = document.getElementById('my-products-content');
        if (!content) return;

        try {
            const response = await this.simulateApiCall('/api/user/products', {
                userId: this.currentUser.id
            });

            if (response.success && response.products.length > 0) {
                content.innerHTML = this.renderUserProducts(response.products);
            } else {
                content.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📦</div>
                        <p>No tienes productos comprados aún</p>
                        <button class="btn-primary" onclick="closeMyProductsModal()">Comenzar a comprar</button>
                    </div>
                `;
            }
        } catch (error) {
            content.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">❌</div>
                    <p>Error al cargar tus productos</p>
                    <button class="btn-primary" onclick="closeMyProductsModal()">Cerrar</button>
                </div>
            `;
        }
    }

    renderUserProducts(products) {
        return `
            <div class="user-products">
                <h4>Tus Compras</h4>
                <div class="products-list">
                    ${products.map(product => `
                        <div class="user-product-item">
                            <img src="${product.image}" alt="${product.name}">
                            <div class="product-info">
                                <h5>${product.name}</h5>
                                <p>Precio: $${product.price.toLocaleString()} COP</p>
                                <p>Fecha: ${new Date(product.purchaseDate).toLocaleDateString()}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    addToUserProducts() {
        // Simular agregar productos comprados al perfil del usuario
        const products = window.cart || [];
        if (products.length > 0) {
            this.showNotification(`Se agregaron ${products.length} productos a tu perfil`);
        }
    }

    // OBLIGAR AL USUARIO A CONTINUAR CON EL PROCESO DE COMPRA
    forcePurchaseFlow() {
        // Mostrar modal obligatorio de compra inmediatamente
            this.showMandatoryPurchaseModal();
        
        // Configurar timer para verificar que el usuario continúe con la compra
        this.startPurchaseFlowTimer();
    }

    // Timer para asegurar que el usuario continúe con la compra
    startPurchaseFlowTimer() {
        // Verificar cada 30 segundos si el usuario ha agregado productos al carrito
        this.purchaseFlowInterval = setInterval(() => {
            const cart = window.cart || [];
            if (cart.length === 0) {
                // Si no hay productos en el carrito, mostrar recordatorio
                this.showPurchaseReminder();
            } else {
                // Si hay productos, detener el timer y mostrar mensaje de confirmación
                clearInterval(this.purchaseFlowInterval);
                this.showNotification('¡Perfecto! Continúa con el proceso de pago.');
            }
        }, 30000); // Verificar cada 30 segundos
    }

    // Mostrar recordatorio de compra
    showPurchaseReminder() {
        const reminderModal = document.createElement('div');
        reminderModal.id = 'purchase-reminder-modal';
        reminderModal.className = 'modal';
        reminderModal.innerHTML = `
            <div class="modal-content purchase-reminder-modal">
                <div class="modal-header">
                    <h3>¡No olvides completar tu compra!</h3>
                </div>
                <div class="modal-body">
                    <div class="reminder-content">
                        <div class="reminder-icon">🛒</div>
                        <p class="reminder-text">Para continuar en Estilo Activo, debes agregar al menos un producto al carrito y completar el pago.</p>
                        <p class="reminder-subtext">Tu sesión permanecerá activa mientras completes tu compra.</p>
                        <div class="reminder-actions">
                            <button class="btn-primary" onclick="startShoppingNow()">Comenzar a Comprar</button>
                            <button class="btn-secondary" onclick="closePurchaseReminder()">Entendido</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(reminderModal);
        this.openModal('purchase-reminder-modal');
    }

    // Mostrar modal obligatorio de compra
    showMandatoryPurchaseModal() {
        // Crear modal si no existe
        let modal = document.getElementById('mandatory-purchase-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'mandatory-purchase-modal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content mandatory-purchase-modal">
                    <div class="modal-header">
                        <h3>¡Continúa con tu Compra!</h3>
                    </div>
                    <div class="modal-body">
                        <div class="mandatory-purchase-content">
                            <div class="purchase-icon">🛒</div>
                            <p class="mandatory-text">Para completar tu experiencia en Estilo Activo, debes continuar con el proceso de compra.</p>
                            <p class="mandatory-subtext">Selecciona al menos un producto para proceder con el pago.</p>
                            <div class="mandatory-actions">
                                <button class="btn-primary" onclick="startMandatoryPurchase()">Continuar Comprando</button>
                                <button class="btn-secondary" onclick="closeMandatoryPurchaseModal()">Ver Catálogo</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        // Mostrar modal
        this.openModal('mandatory-purchase-modal');
        
        // Prevenir que el usuario cierre el modal
        const overlay = document.getElementById('modal-overlay');
        if (overlay) {
            overlay.onclick = null; // Deshabilitar click en overlay
        }
    }

    // Cerrar modal obligatorio (solo si hay productos en el carrito)
    closeMandatoryPurchaseModal() {
        const cart = window.cart || [];
        if (cart.length > 0) {
            this.closeModal('mandatory-purchase-modal');
            this.showNotification('¡Perfecto! Continúa con el proceso de pago.');
            // Detener el timer ya que el usuario está progresando
            if (this.purchaseFlowInterval) {
                clearInterval(this.purchaseFlowInterval);
            }
        } else {
            this.showNotification('Debes agregar al menos un producto al carrito para continuar.');
            // No cerrar el modal, mantenerlo abierto para forzar la acción
        }
    }

    // Cerrar recordatorio de compra
    closePurchaseReminder() {
        this.closeModal('purchase-reminder-modal');
        // El timer continúa ejecutándose
    }

    // VERIFICAR SI EL USUARIO ESTÁ REGISTRADO EN USERS.JSON
    async verifyUserRegistration(email) {
        try {
            // Cargar usuarios desde users.json
            const users = await this.loadUsersFromJSON();
            const userExists = users.some(user => user.email === email);
            
            if (userExists) {
                console.log('Usuario encontrado en users.json');
            }
            return userExists;
        } catch (error) {
            console.error('Error al verificar registro del usuario:', error);
            return false;
        }
    }

    // CARGAR USUARIOS DESDE USERS.JSON
    async loadUsersFromJSON() {
        try {
            const response = await fetch('users.json');
            if (response.ok) {
                const data = await response.json();
                return data.users || [];
                } else {
                // Si no existe el archivo, crear uno vacío
                return [];
            }
        } catch (error) {
            console.log('users.json no existe, creando archivo vacío');
            return [];
        }
    }

    // GUARDAR USUARIOS EN USERS.JSON
    async saveUsersToJSON(users) {
        try {
            const response = await fetch('/api/users/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ users })
            });
            
            if (response.ok) {
                console.log('Usuarios guardados en users.json');
                return true;
            } else {
                throw new Error('Error al guardar usuarios');
            }
        } catch (error) {
            console.log('Servidor no disponible, guardando en localStorage como fallback');
            localStorage.setItem('users', JSON.stringify(users));
            return false;
        }
    }

    // FORZAR AL USUARIO A COMPLETAR SU REGISTRO
    forceUserRegistration(oauthUser) {
        // Crear modal de registro obligatorio
        let modal = document.getElementById('mandatory-registration-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'mandatory-registration-modal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content mandatory-registration-modal">
                    <div class="modal-header">
                        <h3>Completa tu Registro</h3>
                    </div>
                    <div class="modal-body">
                        <div class="mandatory-registration-content">
                            <div class="registration-icon">📝</div>
                            <p class="mandatory-text">Para continuar, debes completar tu información personal.</p>
                            <p class="mandatory-subtext">Esta información es obligatoria para procesar tus compras.</p>
                            
                            <form id="mandatory-registration-form" class="auth-form">
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="mandatory-name">Nombre</label>
                                        <input type="text" id="mandatory-name" name="name" value="${oauthUser.name.split(' ')[0] || ''}" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="mandatory-lastname">Apellidos</label>
                                        <input type="text" id="mandatory-lastname" name="lastname" value="${oauthUser.name.split(' ').slice(1).join(' ') || ''}" required>
                                    </div>
                                </div>
                                
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="mandatory-doc-type">Tipo de documento</label>
                                        <select id="mandatory-doc-type" name="docType" required>
                                            <option value="">Seleccionar</option>
                                            <option value="CC">Cédula de Ciudadanía</option>
                                            <option value="CE">Cédula de Extranjería</option>
                                            <option value="TI">Tarjeta de Identidad</option>
                                            <option value="PA">Pasaporte</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label for="mandatory-doc-number">Número de documento</label>
                                        <input type="text" id="mandatory-doc-number" name="docNumber" required>
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <label for="mandatory-email">Correo electrónico</label>
                                    <input type="email" id="mandatory-email" name="email" value="${oauthUser.email}" readonly>
                                </div>
                                
                                <div class="form-group">
                                    <label for="mandatory-birthdate">Fecha de nacimiento</label>
                                    <input type="date" id="mandatory-birthdate" name="birthdate" required>
                                </div>
                                
                                <div class="form-group">
                                    <label for="mandatory-phone">Número de teléfono</label>
                                    <input type="tel" id="mandatory-phone" name="phone" placeholder="+57 300 123 4567" required>
                                    <small style="color: #666; font-size: 0.8rem; margin-top: 0.3rem; display: block;">
                                        Formato requerido: +57 seguido de 10 dígitos (ej: +57 300 123 4567)
                                    </small>
                                </div>
                                
                                <div class="mandatory-actions">
                                    <button type="submit" class="btn-primary">Completar Registro</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        // Mostrar modal
        this.openModal('mandatory-registration-modal');
        
        // Configurar event listener para el formulario
        const form = document.getElementById('mandatory-registration-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleMandatoryRegistration(e, oauthUser));
        }
        
        // Prevenir que el usuario cierre el modal
        const overlay = document.getElementById('modal-overlay');
        if (overlay) {
            overlay.onclick = null; // Deshabilitar click en overlay
        }
    }

    // MANEJAR REGISTRO OBLIGATORIO
    async handleMandatoryRegistration(e, oauthUser) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const userData = Object.fromEntries(formData.entries());
        
        // Capitalizar nombre y apellido
        if (userData.name) {
            userData.name = this.capitalizeWords(userData.name);
        }
        if (userData.lastname) {
            userData.lastname = this.capitalizeWords(userData.lastname);
        }
        
        // Validar datos
        const validation = this.validateRegistration(userData);
        if (!validation.isValid) {
            this.showNotification(validation.message);
            return;
        }

        // Verificar edad
        if (!this.isAdult(userData.birthdate)) {
            this.showNotification('Debes ser mayor de 18 años');
            return;
        }

        try {
            // Crear usuario completo con datos OAuth + datos del formulario
            const completeUserData = {
                ...oauthUser,
                ...userData,
                provider: oauthUser.provider,
                verified: true,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            };

            // Guardar en la base de datos
            await this.saveUserToDatabase(completeUserData);
            
            // Establecer como usuario actual
            this.currentUser = completeUserData;
            this.isAuthenticated = true;
            localStorage.setItem('authToken', 'oauth_token_' + Date.now());
            localStorage.setItem('userData', JSON.stringify(completeUserData));
            
            // Cerrar modal de registro
            this.closeModal('mandatory-registration-modal');
            
            // Actualizar UI
            this.updateUI();
            this.updateUserProfile(completeUserData);
            
            this.showNotification('¡Registro completado exitosamente!');
            
            // OBLIGAR AL USUARIO A CONTINUAR CON EL PROCESO DE COMPRA
            this.forcePurchaseFlow();
            
        } catch (error) {
            console.error('Error al completar registro:', error);
            this.showNotification('Error al completar el registro. Intenta de nuevo.');
        }
    }

    // GUARDAR USUARIO EN USERS.JSON
    async saveUserToDatabase(userData) {
        try {
            // Agregar timestamp de registro
            const completeUserData = {
                ...userData,
                registrationDate: new Date().toISOString(),
                registrationTimestamp: Date.now(),
                isActive: true,
                lastLogin: new Date().toISOString()
            };

            // Cargar usuarios existentes
            const existingUsers = await this.loadUsersFromJSON();
            
            // Agregar nuevo usuario
            existingUsers.push(completeUserData);
            
            // Guardar en users.json
            await this.saveUsersToJSON(existingUsers);
            
            console.log('Usuario guardado exitosamente en users.json:', completeUserData);
            return completeUserData;
        } catch (error) {
            console.error('Error al guardar usuario:', error);
            throw error;
        }
    }
}

// Funciones globales para compatibilidad
function showLoginModal() {
    authSystem.showLoginModal();
}

function showRegisterModal() {
    authSystem.showRegisterModal();
}

function closeLoginModal() {
    authSystem.closeLoginModal();
}

function closeRegisterModal() {
    authSystem.closeRegisterModal();
}

function closeEmailVerificationModal() {
    authSystem.closeEmailVerificationModal();
}

function showTermsModal() {
    authSystem.showTermsModal();
}

function closeTermsModal() {
    authSystem.closeTermsModal();
}

function showMyProductsModal() {
    authSystem.showMyProductsModal();
}

function closeMyProductsModal() {
    authSystem.closeMyProductsModal();
}

function loginWithGoogle() {
    authSystem.loginWithGoogle();
}

function loginWithFacebook() {
    authSystem.loginWithFacebook();
}

function logout() {
    authSystem.logout();
}

function resendVerificationCode() {
    authSystem.showNotification('Código reenviado');
}

function processNequiPayment() {
    authSystem.processNequiPayment();
}

function processBancolombiaPayment() {
    authSystem.processBancolombiaPayment();
}

function closePaymentModal() {
    authSystem.closeModal('payment-modal');
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('show');
    });
    document.getElementById('modal-overlay').classList.remove('show');
    document.body.classList.remove('modal-open');
}

// Funciones para el modal obligatorio de compra
function startMandatoryPurchase() {
    // Cerrar modal obligatorio
    authSystem.closeModal('mandatory-purchase-modal');
    
    // Scroll a la primera sección de productos
    const firstProductSection = document.querySelector('#camisetas');
    if (firstProductSection) {
        firstProductSection.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }
    
    // Mostrar notificación
    authSystem.showNotification('¡Perfecto! Explora nuestros productos y agrega al menos uno al carrito.');
}

function closeMandatoryPurchaseModal() {
    authSystem.closeMandatoryPurchaseModal();
}

// Funciones para el recordatorio de compra
function startShoppingNow() {
    // Cerrar recordatorio
    authSystem.closePurchaseReminder();
    
    // Scroll a la primera sección de productos
    const firstProductSection = document.querySelector('#camisetas');
    if (firstProductSection) {
        firstProductSection.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }
    
    // Mostrar notificación
    authSystem.showNotification('¡Excelente! Agrega productos al carrito para continuar.');
}

function closePurchaseReminder() {
    authSystem.closePurchaseReminder();
}

// Inicializar sistema de autenticación
let authSystem;
document.addEventListener('DOMContentLoaded', function() {
    authSystem = new AuthSystem();
});