// Script para cargar productos usando fetch desde el endpoint REST

document.addEventListener('DOMContentLoaded', () => {
  cargarProductos();
});

function cargarProductos() {
  const contenedor = document.getElementById('productos');
  contenedor.innerHTML = '<div style="text-align: center; padding: 40px; color: #7f8c8d;">Cargando productos...</div>';
  
  fetch('/api/productos')
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(productos => {
      window.productosDisponibles = productos; // Guardar productos globalmente
      contenedor.innerHTML = '';
      
      if (productos.length === 0) {
        contenedor.innerHTML = '<div style="text-align: center; padding: 40px; color: #95a5a6; font-style: italic;">No hay productos disponibles</div>';
        return;
      }
      
      productos.forEach((p, index) => {
        const div = document.createElement('div');
        div.className = 'producto';
        div.style.animationDelay = `${index * 0.1}s`;
        div.innerHTML = `
          <h3>${p.name}</h3>
          <p>Precio: $${p.price.toFixed(2)}</p>
          <p>Stock: ${p.stock} unidades</p>
          <button onclick="agregarAlCarrito('${p.id}', '${p.name}')" ${p.stock <= 0 ? 'disabled' : ''}>
            ${p.stock <= 0 ? 'Sin stock' : 'Agregar al carrito'}
          </button>
        `;
        contenedor.appendChild(div);
      });
    })
    .catch(err => {
      contenedor.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #e74c3c;">
          <h3>Error al cargar productos</h3>
          <p>Por favor, intenta de nuevo más tarde</p>
          <button onclick="cargarProductos()" style="margin-top: 15px; padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 15px; cursor: pointer;">
            Reintentar
          </button>
        </div>
      `;
      console.error('Error cargando productos:', err);
    });
}

function agregarAlCarrito(id, name) {
  // Buscar el producto completo para obtener el precio
  const productoData = (window.productosDisponibles || []).find(p => p.id === id);
  const precio = productoData ? productoData.price : 0;
  // Buscar si ya existe en el carrito
  const productoExistente = carrito.find(p => p.id === id);
  if (productoExistente) {
    productoExistente.cantidad++;
  } else {
    carrito.push({ id, nombre: name, cantidad: 1, precio });
  }
  renderizarCarrito();
}
