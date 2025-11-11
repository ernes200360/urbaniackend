import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Usuarios de prueba (luego los pondremos en BD real)
const usuarios = [
  { email: "admin@urbania.com", password: "admin123", nombre: "Administrador" }
];

// ✅ Ruta principal
app.get("/", (req, res) => {
  res.send("Backend de Urbania funcionando correctamente ✅");
});

// ✅ LOGIN REAL
app.post("/login", (req, res) => {
  const { email, password } = req.body;

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

// ✅ Puerto automático para Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("✅ Backend Urbania corriendo en puerto " + PORT));
