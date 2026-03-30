let carrito = [];

function actualizarCarrito(productoId, nuevoStock) {
  // Actualizar interfaz
  const productoElement = document.querySelector(`[data-id="${productoId}"]`).parentNode;
  productoElement.querySelector('p').textContent = 
    productoElement.querySelector('p').textContent.replace(/Stock: \d+/, `Stock: ${nuevoStock}`);
  
  // Actualizar carrito
  const productoExistente = carrito.find(p => p.id === productoId);
  if (productoExistente) {
    productoExistente.cantidad++;
  } else {
    const nombre = productoElement.querySelector('h3').textContent;
    carrito.push({ id: productoId, nombre, cantidad: 1 });
  }
  
  renderizarCarrito();
}

function renderizarCarrito() {
  const carritoDiv = document.getElementById('carrito');
  
  if (carrito.length === 0) {
    carritoDiv.innerHTML = `
      <h2>Tu Carrito</h2>
      <div style="text-align: center; padding: 40px; color: #95a5a6; font-style: italic;">
        Tu carrito está vacío
      </div>
    `;
    return;
  }
  
  const total = carrito.reduce((sum, p) => sum + (p.precio * p.cantidad), 0);
  
  carritoDiv.innerHTML = `
    <h2>Tu Carrito</h2>
    ${carrito.map((p, idx) => `
      <div class="item-carrito">
        <div>
          <span style="font-weight: 600; color: #2c3e50;">${p.nombre}</span>
          <div style="color: #7f8c8d; font-size: 0.9rem;">
            Cantidad: ${p.cantidad} | Precio: $${p.precio.toFixed(2)} | Subtotal: $${(p.precio * p.cantidad).toFixed(2)}
          </div>
        </div>
        <button onclick="quitarDelCarrito(${idx})">Quitar</button>
      </div>
    `).join('')}
    <div style="text-align: right; margin-top: 20px; padding: 15px; background: rgba(39, 174, 96, 0.1); border-radius: 15px; border: 1px solid rgba(39, 174, 96, 0.2);">
      <span style="font-size: 1.2rem; font-weight: 600; color: #27ae60;">Total: $${total.toFixed(2)}</span>
    </div>
  `;
}

function quitarDelCarrito(idx) {
  carrito.splice(idx, 1);
  renderizarCarrito();
}

document.getElementById('finalizar-compra').addEventListener('click', async () => {
  if (carrito.length === 0) {
    alert('El carrito está vacío');
    return;
  }
  
  const button = document.getElementById('finalizar-compra');
  const originalText = button.textContent;
  button.textContent = 'Procesando...';
  button.disabled = true;
  
  try {
    // Prepara los productos para enviar
    const productosVenta = carrito.map(p => ({
      id: p.id,
      nombre: p.nombre,
      cantidad: p.cantidad,
      precio: p.precio || p.price || 0
    }));
    
    const tenantId = localStorage.getItem('tenantId');
    if (!tenantId) {
      alert('No tienes una tienda configurada. Por favor selecciona un plan primero.');
      window.location.href = '/planes';
      return;
    }

    const response = await fetch('/api/ventas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productos: productosVenta, tenantId })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Mostrar mensaje de éxito
      const successDiv = document.createElement('div');
      successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #27ae60, #2ecc71);
        color: white;
        padding: 20px;
        border-radius: 15px;
        box-shadow: 0 10px 30px rgba(39, 174, 96, 0.3);
        z-index: 1000;
        animation: slideIn 0.5s ease-out;
      `;
      successDiv.innerHTML = `
        <h3 style="margin: 0 0 10px 0;">¡Compra exitosa!</h3>
        <p style="margin: 0;">Gracias por tu compra</p>
      `;
      document.body.appendChild(successDiv);
      
      // Limpiar carrito
      carrito = [];
      renderizarCarrito();
      
      // Remover mensaje después de 3 segundos
      setTimeout(() => {
        successDiv.remove();
      }, 3000);
      
      // Recargar productos para actualizar stock
      cargarProductos();
    } else {
      throw new Error(data.error || 'Error al procesar la venta');
    }
  } catch (error) {
    console.error('Error al finalizar compra:', error);
    
    // Mostrar mensaje de error
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #e74c3c, #c0392b);
      color: white;
      padding: 20px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(231, 76, 60, 0.3);
      z-index: 1000;
      animation: slideIn 0.5s ease-out;
    `;
    errorDiv.innerHTML = `
      <h3 style="margin: 0 0 10px 0;">Error</h3>
      <p style="margin: 0;">No se pudo procesar la compra</p>
    `;
    document.body.appendChild(errorDiv);
    
    // Remover mensaje después de 3 segundos
    setTimeout(() => {
      errorDiv.remove();
    }, 3000);
  } finally {
    button.textContent = originalText;
    button.disabled = false;
  }
});

// Agregar estilos para la animación
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);