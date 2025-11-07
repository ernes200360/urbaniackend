// /backend/routes/verification.js
// Rutas para el sistema de verificación de identidad (INE + selfie + comprobación biométrica)
// Endpoints:
// POST  /api/verification/submit      -> subir INE (front/back) + selfie
// GET   /api/verification/:userId      -> obtener estado de verificación
// POST  /api/verification/approve     -> admin aprueba verificación
// POST  /api/verification/reject      -> admin rechaza verificación
// NOTE: requiere express-fileupload (ya usado en index.js) y tabla user_verifications creada en migración

import express from "express";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { pool, CONFIG } from "../config.js";

export const router = express.Router();

// helper: calcula hash SHA256 de buffer
async function hashBuffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

// helper: guarda archivo en uploads (o en storage real si se integra)
async function saveFile(fileObj, subpath = "verifications") {
  const uploadsDir = CONFIG.UPLOADS_DIR || "./uploads";
  const dir = path.join(uploadsDir, subpath);
  await fs.mkdir(dir, { recursive: true });

  const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}_${fileObj.name}`;
  const full = path.join(dir, filename);

  // fileObj may be an express-fileupload object with .mv; try to use buffer if provided
  if (typeof fileObj.mv === "function") {
    // move to temp path using provided helper
    await fileObj.mv(full);
  } else if (fileObj.data) {
    await fs.writeFile(full, fileObj.data);
  } else {
    throw new Error("Unsupported file object");
  }

  return full; // ruta local; idealmente retornar URL pública en storage
}

// POST /api/verification/submit
// body: userId (string)
// files: ine_front, ine_back, selfie
router.post("/submit", async (req, res) => {
  try {
    const { userId } = req.body;
    const { ine_front, ine_back, selfie } = req.files || {};

    if (!userId || !ine_front || !ine_back || !selfie) {
      return res.status(400).json({ error: "Missing userId or required files (ine_front, ine_back, selfie)" });
    }

    // Guardar archivos en storage local (o S3)
    const ineFrontPath = await saveFile(ine_front, "ine");
    const ineBackPath = await saveFile(ine_back, "ine");
    const selfiePath = await saveFile(selfie, "selfies");

    // Calcular hashes (para detectar duplicados)
    const ineFrontBuf = await fs.readFile(ineFrontPath);
    const selfieBuf = await fs.readFile(selfiePath);
    const ineFrontHash = await hashBuffer(ineFrontBuf);
    const selfieHash = await hashBuffer(selfieBuf);

    // Insertar registro en user_verifications
    const insertQ = `
      INSERT INTO user_verifications (user_id, ine_front_url, ine_back_url, selfie_url, selfie_hash, method, status)
      VALUES ($1, $2, $3, $4, $5, 'ine_selfie', 'pending') RETURNING *
    `;

    const insertRes = await pool.query(insertQ, [
      userId,
      ineFrontPath,
      ineBackPath,
      selfiePath,
      selfieHash,
    ]);

    // Buscar duplicados por selfie_hash o INE hash en verifications aprobadas
    const dupQ = `
      SELECT uv.user_id, u.email, uv.status
      FROM user_verifications uv
      JOIN users u ON u.id = uv.user_id
      WHERE (uv.selfie_hash = $1)
      AND uv.status = 'approved'
      LIMIT 1
    `;

    const dupRes = await pool.query(dupQ, [selfieHash]);

    if (dupRes.rows.length > 0) {
      // Marcar como rejected automáticamente si se detecta duplicado
      await pool.query(`UPDATE user_verifications SET status='rejected', review_notes=$2, reviewed_at = now() WHERE id = $1`, [insertRes.rows[0].id, 'Selfie duplicada con otra cuenta aprobada']);

      return res.json({ ok: false, reason: 'Duplicate selfie detected', duplicateWith: dupRes.rows[0] });
    }

    // NOTA: aquí idealmente llamarías a un servicio externo de verificación OCR/biometría.
    // Por ahora dejamos el registro en 'pending' para revisión manual o job externo.

    return res.json({ ok: true, verification: insertRes.rows[0] });
  } catch (err) {
    console.error("Error in verification submit:", err);
    return res.status(500).json({ error: 'Server error submitting verification' });
  }
});

// GET /api/verification/:userId  -> obtener estado de verificación
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const q = `SELECT * FROM user_verifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`;
    const r = await pool.query(q, [userId]);
    if (r.rows.length === 0) return res.json({ status: 'not_submitted' });
    const v = r.rows[0];
    return res.json({ status: v.status, verification: v });
  } catch (err) {
    console.error('Error getting verification status', err);
    return res.status(500).json({ error: 'Server error fetching verification' });
  }
});

// POST /api/verification/approve  (admin)
// body: verificationId, reviewerId
router.post('/approve', async (req, res) => {
  try {
    const { verificationId, reviewerId } = req.body;
    if (!verificationId || !reviewerId) return res.status(400).json({ error: 'Missing fields' });

    // Marcar verification
    const upd = await pool.query(`UPDATE user_verifications SET status='approved', reviewer_id=$2, reviewed_at=now() WHERE id=$1 RETURNING *`, [verificationId, reviewerId]);
    const ver = upd.rows[0];

    // Marcar usuario como verificado
    await pool.query(`UPDATE users SET is_verified=true, verification_method='ine_selfie', verification_completed_at=now() WHERE id=$1`, [ver.user_id]);

    return res.json({ ok: true, verification: ver });
  } catch (err) {
    console.error('Error approving verification', err);
    return res.status(500).json({ error: 'Server error approving verification' });
  }
});

// POST /api/verification/reject  (admin)
// body: verificationId, reviewerId, reason
router.post('/reject', async (req, res) => {
  try {
    const { verificationId, reviewerId, reason } = req.body;
    if (!verificationId || !reviewerId || !reason) return res.status(400).json({ error: 'Missing fields' });

    const upd = await pool.query(`UPDATE user_verifications SET status='rejected', reviewer_id=$2, review_notes=$3, reviewed_at=now() WHERE id=$1 RETURNING *`, [verificationId, reviewerId, reason]);

    return res.json({ ok: true, verification: upd.rows[0] });
  } catch (err) {
    console.error('Error rejecting verification', err);
    return res.status(500).json({ error: 'Server error rejecting verification' });
  }
});

export default router;
