// Funciones para el manejo del carrito
function clearCart() {
    window.cart = [];
    localStorage.setItem('cart', JSON.stringify([]));
    
    // Actualizar contador del carrito si existe la función
    if (typeof updateCartCount === 'function') {
        updateCartCount();
    }
    
    // Actualizar visualización del carrito si existe la función
    if (typeof updateCartDisplay === 'function') {
        updateCartDisplay();
    }
    
    console.log('Carrito vaciado correctamente');
}

// Exportar funciones para uso global
window.clearCart = clearCart;