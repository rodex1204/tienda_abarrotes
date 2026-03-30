// Configuración SOAP
const soapUrl = 'http://localhost:8000/wsdl?wsdl';
let carrito = [];

// Cargar productos
function cargarProductos() {
  soap.createClient(soapUrl, (err, client) => {
    if (err) {
      console.error("Error creando cliente SOAP:", err);
      return;
    }
    
    console.log("Cliente SOAP creado, llamando a ObtenerProductos..."); // Debug
    
    client.ObtenerProductos({}, (err, result) => {
      if (err) {
        console.error("Error en ObtenerProductos:", err);
        return;
      }
      
      console.log("Respuesta recibida:", result); // Debug
      
      const productos = result.return?.productos || [];
      const contenedor = document.getElementById('productos');
      contenedor.innerHTML = '';
      
      productos.forEach(p => {
        const div = document.createElement('div');
        div.className = 'producto';
        div.innerHTML = `
          <h3>${p.nombre}</h3>
          <p>$${p.precio} | Stock: ${p.stock}</p>
          <button data-id="${p.id}">Agregar al carrito</button>
        `;
        contenedor.appendChild(div);
      });
    });
  });
}

// Función para agregar al carrito
function agregarAlCarrito(productoId) {
  soap.createClient(soapUrl, (err, client) => {
    client.AgregarAlCarrito({ productoId, cantidad: 1 }, (err, result) => {
      if (err) return console.error(err);
      
      if (result.success) {
        actualizarCarrito(productoId, result.stockActual);
      }
      alert(result.message);
    });
  });
}

// Inicialización
window.onload = cargarProductos;