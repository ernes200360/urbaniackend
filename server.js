import express from "express";
import cors from "cors";
import fs from "fs";

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Ruta del archivo donde se guardan usuarios
const rutaUsuarios = "./data/usuarios.json";

// ✅ Cargar usuarios desde el archivo JSON
function cargarUsuarios() {
  try {
    const data = fs.readFileSync(rutaUsuarios, "utf8");
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

// ✅ Guardar usuarios en el archivo JSON
function guardarUsuarios(usuarios) {
  fs.writeFileSync(rutaUsuarios, JSON.stringify(usuarios, null, 2));
}

// ✅ Publicaciones reales (solo se guardan en memoria por ahora)
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

// ✅ LOGIN REAL (lee usuarios desde archivo)
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  const usuarios = cargarUsuarios();

  const user = usuarios.find(
    (u) => u.email === email && u.password === password
  );

  if (user) {
    return res.json({
      success: true,
      mensaje: "Inicio de sesión exitoso",
      nombre: user.nombre
    });
  } else {
    return res.json({
      success: false,
      mensaje: "Credenciales incorrectas"
    });
  }
});

// ✅ REGISTRO REAL (guarda usuarios en archivo)
app.post("/register", (req, res) => {
  const { email, password, nombre } = req.body;

  let usuarios = cargarUsuarios();

  const existe = usuarios.find((u) => u.email === email);

  if (existe) {
    return res.json({
      success: false,
      mensaje: "El correo ya está registrado"
    });
  }

  usuarios.push({ email, password, nombre });
  guardarUsuarios(usuarios);

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
    fecha: new Date().toLocaleString()
  };

  posts.unshift(nueva);

  res.json({ success: true, mensaje: "Publicación creada", post: nueva });
});

// ✅ Puerto automático para Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log("✅ Backend Urbania corriendo en puerto " + PORT)
);
