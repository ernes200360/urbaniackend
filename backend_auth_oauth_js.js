// /backend/routes/auth.js
// Registro e inicio de sesión con Google, Facebook, Apple ID y Correo
// Urbania — Sistema #11
//--------------------------------------------------------------
// NOTA IMPORTANTE:
// Este archivo define las rutas y lógica base de OAuth.
// Requiere credenciales reales de Google/Facebook/Apple.
// Se asume uso de JWT para sesiones.
//--------------------------------------------------------------

import express from "express";
import jwt from "jsonwebtoken";
import { pool } from "../config.js";

export const router = express.Router();

// Utilidad para crear JWT
function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.display_name,
      verified: user.is_verified,
    },
    process.env.JWT_SECRET || "urbania_secret",
    { expiresIn: "30d" }
  );
}

//--------------------------------------------------------------
// ✅ Registro por correo
//--------------------------------------------------------------
router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Faltan datos" });

    const exists = await pool.query(
      `SELECT id FROM users WHERE email=$1`,
      [email]
    );
    if (exists.rows.length > 0)
      return res.status(400).json({ error: "Email ya registrado" });

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, display_name)
       VALUES ($1, crypt($2, gen_salt('bf')), $3) RETURNING *`,
      [email, password, name || "Usuario Urbania"]
    );

    const token = createToken(result.rows[0]);
    return res.json({ ok: true, token, user: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error registrando usuario" });
  }
});

//--------------------------------------------------------------
// ✅ Login por correo
//--------------------------------------------------------------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const r = await pool.query(
      `SELECT * FROM users WHERE email=$1 AND password_hash = crypt($2, password_hash)`,
      [email, password]
    );

    if (r.rows.length === 0)
      return res.status(400).json({ error: "Credenciales incorrectas" });

    const token = createToken(r.rows[0]);
    return res.json({ ok: true, token, user: r.rows[0] });
  } catch (e) {
    return res.status(500).json({ error: "Error de login" });
  }
});

//--------------------------------------------------------------
// ✅ Login con Google OAuth
// Requiere obtener el Google ID Token desde frontend
//--------------------------------------------------------------
router.post("/google", async (req, res) => {
  try {
    const { googleId, email, name } = req.body;
    if (!googleId || !email)
      return res.status(400).json({ error: "Faltan datos" });

    // Buscar usuario
    let userQ = await pool.query(`SELECT * FROM users WHERE email=$1`, [email]);

    let user;
    if (userQ.rows.length === 0) {
      // Crear usuario
      const insert = await pool.query(
        `INSERT INTO users (email, google_id, display_name)
         VALUES ($1, $2, $3) RETURNING *`,
        [email, googleId, name]
      );
      user = insert.rows[0];
    } else {
      user = userQ.rows[0];
    }

    const token = createToken(user);
    return res.json({ ok: true, token, user });
  } catch (err) {
    console.error("GOOGLE ERROR", err);
    return res.status(500).json({ error: "Error en login con Google" });
  }
});

//--------------------------------------------------------------
// ✅ Login con Facebook OAuth
//--------------------------------------------------------------
router.post("/facebook", async (req, res) => {
  try {
    const { email, fbId, name } = req.body;
    if (!email || !fbId)
      return res.status(400).json({ error: "Faltan datos" });

    let userQ = await pool.query(`SELECT * FROM users WHERE email=$1`, [email]);
    let user;

    if (userQ.rows.length === 0) {
      const insert = await pool.query(
        `INSERT INTO users (email, facebook_id, display_name)
         VALUES ($1, $2, $3) RETURNING *`,
        [email, fbId, name]
      );
      user = insert.rows[0];
    } else {
      user = userQ.rows[0];
    }

    const token = createToken(user);
    return res.json({ ok: true, token, user });
  } catch (err) {
    console.error("FB ERROR", err);
    return res.status(500).json({ error: "Error en login con Facebook" });
  }
});

//--------------------------------------------------------------
// ✅ Login con Apple ID
//--------------------------------------------------------------
router.post("/apple", async (req, res) => {
  try {
    const { appleId, email, name } = req.body;
    if (!appleId)
      return res.status(400).json({ error: "Faltan datos (appleId)" });

    let userQ;
    if (email) {
      userQ = await pool.query(`SELECT * FROM users WHERE email=$1`, [email]);
    }

    let user;

    if (!userQ || userQ.rows.length === 0) {
      const insert = await pool.query(
        `INSERT INTO users (email, apple_id, display_name)
         VALUES ($1, $2, $3) RETURNING *`,
        [email || null, appleId, name || "Usuario Apple"]
      );
      user = insert.rows[0];
    } else {
      user = userQ.rows[0];
    }

    const token = createToken(user);
    return res.json({ ok: true, token, user });
  } catch (err) {
    console.error("APPLE ERROR", err);
    return res.status(500).json({ error: "Error en login con Apple" });
  }
});

//--------------------------------------------------------------
// ✅ Ruta: obtener perfil del usuario con JWT
//--------------------------------------------------------------
router.get("/me", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "urbania_secret");

    const r = await pool.query(`SELECT * FROM users WHERE id=$1`, [decoded.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: "User not found" });

    return res.json({ ok: true, user: r.rows[0] });
  } catch (err) {
    return res.status(401).json({ error: "Token inválido" });
  }
});

//--------------------------------------------------------------
// FIN RUTAS AUTH
//--------------------------------------------------------------
