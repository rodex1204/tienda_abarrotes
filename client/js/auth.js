// Configuración de Firebase (necesitarás agregar esto)
const firebaseConfig = {
  apiKey: "AIzaSyBT_vLiQr7UEZu2pLyAz2WZzIe8u_FTPhc",
  authDomain: "proyectoabarrotes-179ea.firebaseapp.com",
  projectId: "proyectoabarrotes-179ea",
  storageBucket: "proyectoabarrotes-179ea.appspot.com",
  messagingSenderId: "1000691717590",
  appId: "1:1000691717590:web:014babf2ac74fe48258077",
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Verificar autenticación al cargar la página
document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
});

function checkAuth() {
  const token = localStorage.getItem("authToken");
  const userEmail = localStorage.getItem("userEmail");

  if (!token || !userEmail) {
    // No hay token, redirigir a la página de bienvenida
    window.location.href = "/";
    return;
  }

  // Verificar si el token es válido
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      // Usuario autenticado
      document.getElementById("userEmail").textContent = userEmail;
    } else {
      // Token inválido, redirigir a la página de bienvenida
      localStorage.removeItem("authToken");
      localStorage.removeItem("userEmail");
      window.location.href = "/";
    }
  });
}

function logout() {
  firebase
    .auth()
    .signOut()
    .then(() => {
      localStorage.removeItem("authToken");
      localStorage.removeItem("userEmail");
      window.location.href = "/";
    })
    .catch((error) => {
      console.error("Error al cerrar sesión:", error);
    });
}
