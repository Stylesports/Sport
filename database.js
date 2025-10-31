// Base de datos para almacenar usuarios y pedidos
class Database {
    constructor() {
        this.users = JSON.parse(localStorage.getItem('users')) || [];
        this.orders = JSON.parse(localStorage.getItem('orders')) || [];
        this.currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
    }

    // Inicializar la base de datos
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('Error al abrir la base de datos:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('Base de datos inicializada correctamente');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Crear tabla de usuarios
                if (!db.objectStoreNames.contains('users')) {
                    const userStore = db.createObjectStore('users', { keyPath: 'id' });
                    userStore.createIndex('email', 'email', { unique: true });
                    userStore.createIndex('provider', 'provider', { unique: false });
                    userStore.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // Crear tabla de órdenes
                if (!db.objectStoreNames.contains('orders')) {
                    const orderStore = db.createObjectStore('orders', { keyPath: 'id', autoIncrement: true });
                    orderStore.createIndex('userId', 'userId', { unique: false });
                    orderStore.createIndex('orderDate', 'orderDate', { unique: false });
                    orderStore.createIndex('status', 'status', { unique: false });
                }

                // Crear tabla de productos
                if (!db.objectStoreNames.contains('products')) {
                    const productStore = db.createObjectStore('products', { keyPath: 'id' });
                    productStore.createIndex('category', 'category', { unique: false });
                    productStore.createIndex('name', 'name', { unique: false });
                }

                console.log('Estructura de base de datos creada');
            };
        });
    }

    // Agregar un nuevo usuario
    async addUser(userData) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Base de datos no inicializada'));
                return;
            }

            const transaction = this.db.transaction(['users'], 'readwrite');
            const store = transaction.objectStore('users');

            const user = {
                id: userData.id,
                name: userData.name,
                email: userData.email,
                photo: userData.photo,
                provider: userData.provider,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                orders: [],
                isActive: true
            };

            const request = store.add(user);

            request.onsuccess = () => {
                console.log('Usuario agregado exitosamente:', user);
                resolve(user);
            };

            request.onerror = () => {
                console.error('Error al agregar usuario:', request.error);
                reject(request.error);
            };
        });
    }

    // Obtener usuario por email
    async getUserByEmail(email) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Base de datos no inicializada'));
                return;
            }

            const transaction = this.db.transaction(['users'], 'readonly');
            const store = transaction.objectStore('users');
            const index = store.index('email');

            const request = index.get(email);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('Error al buscar usuario:', request.error);
                reject(request.error);
            };
        });
    }

    // Obtener usuario por ID
    async getUserById(id) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Base de datos no inicializada'));
                return;
            }

            const transaction = this.db.transaction(['users'], 'readonly');
            const store = transaction.objectStore('users');

            const request = store.get(id);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('Error al buscar usuario por ID:', request.error);
                reject(request.error);
            };
        });
    }

    // Actualizar usuario
    async updateUser(userId, updateData) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Base de datos no inicializada'));
                return;
            }

            const transaction = this.db.transaction(['users'], 'readwrite');
            const store = transaction.objectStore('users');

            // Primero obtener el usuario actual
            const getRequest = store.get(userId);

            getRequest.onsuccess = () => {
                const user = getRequest.result;
                if (user) {
                    // Actualizar datos
                    Object.assign(user, updateData);
                    user.lastLogin = new Date().toISOString();

                    const putRequest = store.put(user);

                    putRequest.onsuccess = () => {
                        console.log('Usuario actualizado exitosamente');
                        resolve(user);
                    };

                    putRequest.onerror = () => {
                        console.error('Error al actualizar usuario:', putRequest.error);
                        reject(putRequest.error);
                    };
                } else {
                    reject(new Error('Usuario no encontrado'));
                }
            };

            getRequest.onerror = () => {
                console.error('Error al obtener usuario:', getRequest.error);
                reject(getRequest.error);
            };
        });
    }

    // Obtener todos los usuarios
    async getAllUsers() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Base de datos no inicializada'));
                return;
            }

            const transaction = this.db.transaction(['users'], 'readonly');
            const store = transaction.objectStore('users');

            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('Error al obtener usuarios:', request.error);
                reject(request.error);
            };
        });
    }

    // Agregar orden
    async addOrder(userId, orderData) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Base de datos no inicializada'));
                return;
            }

            const transaction = this.db.transaction(['orders', 'users'], 'readwrite');
            const orderStore = transaction.objectStore('orders');
            const userStore = transaction.objectStore('users');

            const order = {
                userId: userId,
                items: orderData.items,
                total: orderData.total,
                status: 'completed',
                orderDate: new Date().toISOString(),
                paymentMethod: orderData.paymentMethod || 'unknown'
            };

            const addOrderRequest = orderStore.add(order);

            addOrderRequest.onsuccess = () => {
                // Actualizar el usuario con la nueva orden
                const getUserRequest = userStore.get(userId);

                getUserRequest.onsuccess = () => {
                    const user = getUserRequest.result;
                    if (user) {
                        user.orders.push(order.id);
                        const updateUserRequest = userStore.put(user);

                        updateUserRequest.onsuccess = () => {
                            console.log('Orden agregada exitosamente');
                            resolve(order);
                        };

                        updateUserRequest.onerror = () => {
                            console.error('Error al actualizar usuario con orden:', updateUserRequest.error);
                            reject(updateUserRequest.error);
                        };
                    } else {
                        reject(new Error('Usuario no encontrado'));
                    }
                };

                getUserRequest.onerror = () => {
                    console.error('Error al obtener usuario para actualizar orden:', getUserRequest.error);
                    reject(getUserRequest.error);
                };
            };

            addOrderRequest.onerror = () => {
                console.error('Error al agregar orden:', addOrderRequest.error);
                reject(addOrderRequest.error);
            };
        });
    }

    // Obtener órdenes de un usuario
    async getUserOrders(userId) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Base de datos no inicializada'));
                return;
            }

            const transaction = this.db.transaction(['orders'], 'readonly');
            const store = transaction.objectStore('orders');
            const index = store.index('userId');

            const request = index.getAll(userId);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('Error al obtener órdenes del usuario:', request.error);
                reject(request.error);
            };
        });
    }

    // Eliminar usuario
    async deleteUser(userId) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Base de datos no inicializada'));
                return;
            }

            const transaction = this.db.transaction(['users'], 'readwrite');
            const store = transaction.objectStore('users');

            const request = store.delete(userId);

            request.onsuccess = () => {
                console.log('Usuario eliminado exitosamente');
                resolve(true);
            };

            request.onerror = () => {
                console.error('Error al eliminar usuario:', request.error);
                reject(request.error);
            };
        });
    }

    // Exportar datos de usuarios (para respaldo)
    async exportUsers() {
        try {
            const users = await this.getAllUsers();
            const dataStr = JSON.stringify(users, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `usuarios_estilo_activo_${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            return users;
        } catch (error) {
            console.error('Error al exportar usuarios:', error);
            throw error;
        }
    }

    // Importar datos de usuarios (para restaurar)
    async importUsers(usersData) {
        try {
            for (const userData of usersData) {
                await this.addUser(userData);
            }
            console.log('Usuarios importados exitosamente');
            return true;
        } catch (error) {
            console.error('Error al importar usuarios:', error);
            throw error;
        }
    }
}

// Crear instancia global de la base de datos
const database = new Database();

// Exportar para uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Database;
}