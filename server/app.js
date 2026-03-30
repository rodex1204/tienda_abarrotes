// Importaciones únicas (elimina las duplicadas)
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const express = require("express");
const soap = require("soap");
const fs = require("fs");
const cors = require("cors");
const path = require("path");

// Inicializar Firebase Admin (una sola vez)
const serviceAccount = require("./proyectoabarrotes-179ea-firebase-adminsdk-fbsvc-9d3c3a76a6.json");
const firebaseApp = initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore(firebaseApp); // <-- Usamos la instancia firebaseApp
const auth = getAuth(firebaseApp); // <-- Para autenticación

const app = express();
app.use(cors());
app.use(express.json());

// Middleware para verificar autenticación
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }
  
  const token = authHeader.split('Bearer ')[1];
  
  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

// Datos en memoria (opcional, solo si los necesitas)
let ventas = [];

// Servicio SOAP con Firestore
const service = {
  TiendaService: {
    TiendaPort: {
      ObtenerProductos: async function (args, callback) {
        try {
          console.log("Intentando obtener productos..."); // Debug
          const snapshot = await db.collection("products").get();

          if (snapshot.empty) {
            console.log("No se encontraron productos"); // Debug
          }

          const productos = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          console.log("Productos encontrados:", productos); // Debug
          callback(null, { productos });
        } catch (error) {
          console.error("Error al obtener productos:", error); // Debug
          callback(error);
        }
      },
      AgregarAlCarrito: async function (args, callback) {
        try {
          const productRef = db.collection("products").doc(args.productId);
          const saleRef = db.collection("sales").doc();

          const result = await db.runTransaction(async (transaction) => {
            const productDoc = await transaction.get(productRef);

            if (!productDoc.exists) {
              throw new Error("Producto no encontrado");
            }

            const product = productDoc.data();
            const newStock = product.stock - args.quantity;

            if (newStock < 0) {
              throw new Error("Stock insuficiente");
            }

            transaction.update(productRef, {
              stock: newStock,
            });

            transaction.set(saleRef, {
              productId: args.productId,
              quantity: args.quantity,
              date: FieldValue.serverTimestamp(),
              unitPrice: product.price,
              total: product.price * args.quantity,
            });

            return {
              success: true,
              message: "Venta registrada",
              stockActual: newStock,
            };
          });

          callback(null, result);
        } catch (error) {
          console.error("Error en transacción:", error);
          callback(null, {
            success: false,
            message: error.message,
          });
        }
      },
    },
  },
};

// Configurar WSDL
const wsdl = fs.readFileSync("wsdl.xml", "utf8");

// Interfaz de administración
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

// Página de bienvenida
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/welcome.html"));
});

// Páginas de autenticación
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/login.html"));
});

app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/register.html"));
});

app.get("/planes", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/planes.html"));
});

// Endpoint para verificar token
app.post("/api/verify-token", async (req, res) => {
  try {
    const { token } = req.body;
    const decodedToken = await auth.verifyIdToken(token);
    res.json({ valid: true, user: decodedToken });
  } catch (error) {
    res.status(401).json({ valid: false, error: error.message });
  }
});

app.get("/api/ventas", async (req, res) => {
  try {
    const salesSnapshot = await db.collection("sales").orderBy("fecha", "desc").get();
    const ventas = salesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        productos: data.productos || [],
        total: data.total,
        fecha: data.fecha
      };
    });
    res.json(ventas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para obtener ventas por tenant
app.get("/api/ventas/:tenantId", async (req, res) => {
  try {
    const { tenantId } = req.params;
    const salesSnapshot = await db.collection("sales")
      .where("tenantId", "==", tenantId)
      .orderBy("fecha", "desc")
      .get();
    
    const ventas = salesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        productos: data.productos || [],
        total: data.total,
        fecha: data.fecha
      };
    });
    res.json(ventas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para gestionar planes de suscripción
app.get("/api/planes", async (req, res) => {
  try {
    const planesSnapshot = await db.collection("planes").get();
    const planes = planesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(planes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para crear/actualizar suscripción
app.post("/api/suscripciones", async (req, res) => {
  try {
    const { tenantId, planId, email, nombreTienda } = req.body;
    
    // Calcular fecha de vencimiento según el plan
    let fechaVencimiento;
    if (planId === 'gratuito') {
      // Plan gratuito no vence
      fechaVencimiento = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(); // 100 años
    } else {
      // Planes pagos vencen en 30 días
      fechaVencimiento = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    }
    
    // Crear o actualizar suscripción
    const suscripcionRef = db.collection("suscripciones").doc(tenantId);
    await suscripcionRef.set({
      tenantId,
      planId,
      email,
      nombreTienda,
      fechaCreacion: new Date().toISOString(),
      fechaVencimiento,
      activa: true
    });
    
    res.json({ success: true, tenantId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para verificar suscripción
app.get("/api/suscripciones/:tenantId", async (req, res) => {
  try {
    const { tenantId } = req.params;
    const suscripcionDoc = await db.collection("suscripciones").doc(tenantId).get();
    
    if (!suscripcionDoc.exists) {
      return res.status(404).json({ error: "Suscripción no encontrada" });
    }
    
    const suscripcion = suscripcionDoc.data();
    const fechaVencimiento = new Date(suscripcion.fechaVencimiento);
    const ahora = new Date();
    
    suscripcion.activa = fechaVencimiento > ahora;
    res.json(suscripcion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint REST para obtener productos desde Firestore
app.get("/api/productos", async (req, res) => {
  try {
    console.log("Intentando obtener productos desde Firestore...");
    const snapshot = await db.collection("products").get();
    console.log("Snapshot obtenido, procesando documentos...");
    const productos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    console.log("Productos procesados:", productos.length, "productos encontrados");
    res.json(productos);
  } catch (error) {
    console.error("Error al obtener productos:", error);
    res.status(500).json({ error: error.message });
  }
});

// // Endpoint para obtener productos por tenant (tienda específica)
// app.get("/api/productos/:tenantId", async (req, res) => {
//   try {
//     const { tenantId } = req.params;
//     console.log(`Obteniendo productos para tenant: ${tenantId}`);
    
//     const snapshot = await db.collection("products")
//       .where("tenantId", "==", tenantId)
//       .get();
    
//     const productos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
//     console.log(`Productos encontrados para tenant ${tenantId}:`, productos.length);
//     res.json(productos);
//   } catch (error) {
//     console.error("Error al obtener productos por tenant:", error);
//     res.status(500).json({ error: error.message });
//   }
// });

// Endpoint para registrar una venta completa (carrito)
app.post("/api/ventas", async (req, res) => {
  try {
    const { productos, tenantId } = req.body; // productos: [{id, nombre, cantidad, precio}]
    if (!productos || !Array.isArray(productos) || productos.length === 0) {
      return res.status(400).json({ error: "No hay productos en la venta" });
    }
    if (!tenantId) {
      return res.status(400).json({ error: "TenantId es requerido" });
    }
    
    let total = 0;
    productos.forEach(p => {
      total += (p.precio || p.price) * p.cantidad;
    });
    
    await db.collection("sales").add({
      productos,
      total,
      tenantId,
      fecha: new Date().toISOString()
    });
    
    // Actualizar stock
    const batch = db.batch();
    productos.forEach(p => {
      const ref = db.collection("products").doc(p.id);
      batch.update(ref, { stock: FieldValue.increment(-p.cantidad) });
    });
    await batch.commit();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para crear productos de ejemplo para un tenant
app.post("/api/productos-ejemplo/:tenantId", async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { planId } = req.body;
    
    // Productos de ejemplo según el plan
    const productosEjemplo = [
      { name: "Arroz", price: 25.50, stock: 50, tenantId },
      { name: "Frijoles", price: 18.75, stock: 30, tenantId },
      { name: "Aceite", price: 45.00, stock: 20, tenantId },
      { name: "Azúcar", price: 22.30, stock: 40, tenantId },
      { name: "Harina", price: 28.90, stock: 25, tenantId }
    ];
    
    // Limitar productos según el plan
    let productosACrear = productosEjemplo;
    if (planId === 'gratuito') {
      productosACrear = productosEjemplo.slice(0, 3); // Solo 3 productos para plan gratuito
    } else if (planId === 'basico') {
      productosACrear = productosEjemplo.slice(0, 4); // 4 productos para plan básico
    }
    // Planes superiores pueden tener todos los productos
    
    // Crear productos en Firestore
    const batch = db.batch();
    productosACrear.forEach(producto => {
      const docRef = db.collection("products").doc();
      batch.set(docRef, producto);
    });
    
    await batch.commit();
    
    res.json({ 
      success: true, 
      message: `Se crearon ${productosACrear.length} productos de ejemplo`,
      productosCreados: productosACrear.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, "../client")));

// Iniciar servidor
const port = 5678;
app.listen(port, '0.0.0.0', () => {
  console.log(`\n✅ Servidor listo:`);
  console.log(`- Bienvenida:   http://localhost:${port}/`);
  console.log(`- Cliente:      http://localhost:${port}/index.html`);
  console.log(`- Panel Admin:  http://localhost:${port}/admin`);
  console.log(`- WSDL SOAP:    http://localhost:${port}/wsdl?wsdl\n`);

  soap.listen(app, "/wsdl", service, wsdl);
});
