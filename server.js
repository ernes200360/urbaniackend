import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); // ✅ habilita CORS

app.get("/", (req, res) => {
  res.send("✅ Backend de Urbania funcionando correctamente");
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
