import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Ruta raíz (ya existente)
app.get("/", (req, res) => {
  res.send("✅ Backend de Urbania funcionando correctamente");
});

// Ruta para iniciar sesión
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (email === "admin@urbania.com" && password === "1234") {
    res.json({ success: true, message: "Inicio de sesión exitoso 🌆" });
  } else {
    res.status(401).json({ success: false, message: "Credenciales inválidas ❌" });
  }
});

// Ruta para registrar usuario
app.post("/register", (req, res) => {
  const { username, email, password } = req.body;
  console.log("Nuevo registro:", username, email);
  res.json({ success: true, message: "Usuario registrado correctamente 🖤" });
});

// Puerto
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Servidor funcionando en puerto ${port}`));
