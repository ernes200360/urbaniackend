import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Usuarios de prueba
const usuarios = [
  { email: "admin@urbania.com", password: "admin123", nombre: "Administrador" }
];

// ✅ Publicaciones reales
let posts = [
  {
    id: 1,
    autor: "Administrador",
    texto: "Bienvenidos a Urbania 🚀✨",
    likes: 10,
    fecha: "2025-01-01"
  }
];


// ✅ Ruta principal
app.get("/", (req, res) => {
  res.send("Backend de Urbania funcionando correctamente ✅");
});

// ✅ Crear una nueva publicación
app.post("/posts", (req, res) => {
  const { autor, texto } = req.body;

  if (!autor || !texto) {
    return res.json({ success: false, mensaje: "Faltan datos" });
  }

  const nueva = {
    id: posts.length + 1,
    autor,
    texto,
    likes: 0,
    fecha: new Date().toLocaleString()
  };

  posts.unshift(nueva); // ✅ La publicación nueva aparece arriba

  res.json({ success: true, mensaje: "Publicación creada", post: nueva });
});


// ✅ REGISTRO REAL
app.post("/register", (req, res) => {
  const { email, password, nombre } = req.body;

  const existe = usuarios.find((u) => u.email === email);

  if (existe) {
    return res.json({
      success: false,
      mensaje: "El correo ya está registrado"
    });
  }

  usuarios.push({ email, password, nombre });

  return res.json({
    success: true,
    mensaje: "Usuario registrado con éxito"
  });
});
 
// ✅ Obtener todas las publicaciones
app.get("/posts", (req, res) => {
  res.json(posts);
});

// ✅ Crear una nueva publicación
app.post("/posts", (req, res) => {
  const { autor, texto } = req.body;

  if (!autor || !texto) {
    return res.json({ success: false, mensaje: "Faltan datos" });
  }

  const nueva = {
    id: posts.length + 1,
    autor,
    texto,
    likes: 0,
    fecha: new Date().toISOString().slice(0, 10)
  };

  posts.push(nueva);

  res.json({ success: true, mensaje: "Publicación creada", post: nueva });
});

// ✅ Puerto automático para Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log("✅ Backend Urbania corriendo en puerto " + PORT)
);
