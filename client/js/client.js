// Cambia esta URL solo si el backend cambia de IP o puerto
const soapUrl = 'http://178.16.142.158:5678/wsdl?wsdl';

// Obtener y mostrar productos
function cargarProductos() {
  const params = {};
  
  soap.createClient(soapUrl, function(err, client) {
    if (err) {
      console.error('Error creando cliente SOAP:', err);
      return;
    }
    
    client.ObtenerProductos(params, function(err, result) {
      if (err) {
        console.error('Error llamando al servicio:', err);
        return;
      }
      
      const productos = result.productos.Producto || [];
      const contenedor = document.getElementById('productos');
      
      productos.forEach(producto => {
        const div = document.createElement('div');
        div.className = 'producto';
        div.innerHTML = `
          <h3>${producto.nombre}</h3>
          <p>Precio: $${producto.precio}</p>
          <p>Stock: ${producto.stock}</p>
          <button onclick="agregarAlCarrito(${producto.id})">Agregar al carrito</button>
        `;
        contenedor.appendChild(div);
      });
    });
  });
}

// Agregar producto al carrito
function agregarAlCarrito(productoId) {
  soap.createClient(soapUrl, function(err, client) {
    if (err) {
      alert('Error conectando al servidor');
      return;
    }
    
    client.AgregarAlCarrito({ productoId: productoId, cantidad: 1 }, function(err, result) {
      if (err) {
        alert('Error al agregar producto');
        return;
      }
      
      if (result.success) {
        alert('Producto agregado al carrito');
      } else {
        alert(result.message);
      }
    });
  });
}

// Inicializar cuando cargue la página
window.onload = cargarProductos;