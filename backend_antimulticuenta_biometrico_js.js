// /backend/services/antiMulticuenta.js
// Sistema #12: Anti‑multicuenta biométrico para Urbania
// ---------------------------------------------------------
// Funciones:
// ✅ Detectar selfies duplicadas (hash SHA256)
// ✅ Comparar INE duplicados
// ✅ Bloquear creación de cuentas duplicadas por selfie_hash
// ✅ Bloquear por INE frontal hash
// ✅ Verificación cruzada entre usuarios
// ✅ Marcar usuarios sospechosos
// ✅ Registrar eventos en user_flags
// ---------------------------------------------------------
// Nota: esto es la capa lógica. Si se integra FaceTec, Incode o cualquier
// otro proveedor biométrico, va aquí.

import { pool } from "../config.js";
import crypto from "crypto";
import fs from "fs/promises";

// ✅ Hash de archivo (selfie o INE)
export async function hashFile(path) {
  const buf = await fs.readFile(path);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

// ✅ Registrar bandera en la tabla user_flags
async function flagUser(userId, type, details) {
  await pool.query(
    `INSERT INTO user_flags (user_id, flag_type, details, created_at)
     VALUES ($1, $2, $3, now())`,
    [userId, type, details]
  );
}

// ✅ Revisar si existe otro usuario con el mismo selfie_hash
export async function checkSelfieDuplicate(selfieHash, userId) {
  const q = await pool.query(
    `SELECT uv.user_id
     FROM user_verifications uv
     JOIN users u ON uv.user_id = u.id
     WHERE uv.selfie_hash = $1
     AND uv.user_id <> $2
     AND uv.status = 'approved'
     LIMIT 1`,
    [selfieHash, userId]
  );

  if (q.rows.length > 0) {
    const otherId = q.rows[0].user_id;
    await flagUser(userId, "duplicate_selfie", { matches: otherId });
    return { duplicate: true, matches: otherId };
  }

  return { duplicate: false };
}

// ✅ Revisar INE duplicado
export async function checkIneDuplicate(ineFrontHash, userId) {
  const q = await pool.query(
    `SELECT uv.user_id
     FROM user_verifications uv
     WHERE uv.ine_front_hash = $1
     AND uv.user_id <> $2
     AND uv.status = 'approved'
     LIMIT 1`,
    [ineFrontHash, userId]
  );

  if (q.rows.length > 0) {
    const other = q.rows[0].user_id;
    await flagUser(userId, "duplicate_ine", { matches: other });
    return { duplicate: true, matches: other };
  }

  return { duplicate: false };
}

// ✅ Marcar usuario como sospechoso
export async function markSuspicious(userId, reason) {
  await flagUser(userId, "suspicious", { reason });
  await pool.query(
    `UPDATE users SET suspicious = true WHERE id = $1`,
    [userId]
  );
}

// ✅ Función general para validar duplicados después de submit
export async function antiMulticuentaCheck({ selfieHash, ineFrontHash, userId }) {
  // Revisar selfie duplicada
  const selfie = await checkSelfieDuplicate(selfieHash, userId);
  if (selfie.duplicate) {
    return {
      ok: false,
      reason: "SELFIE_DUPLICADA",
      matches: selfie.matches,
    };
  }

  // Revisar INE duplicado
  const ine = await checkIneDuplicate(ineFrontHash, userId);
  if (ine.duplicate) {
    return {
      ok: false,
      reason: "INE_DUPLICADO",
      matches: ine.matches,
    };
  }

  return { ok: true };
}

// ✅ Integración recomendada:
// En /verification/submit.js después de guardar archivos:
//  const selfieHash = hashFile(selfiePath)
//  const ineHash = hashFile(ineFrontPath)
//  const anti = await antiMulticuentaCheck({ selfieHash, ineFrontHash: ineHash, userId })
//  if (!anti.ok) -> rechazar automáticamente

// ---------------------------------------------------------
// ✅ FIN SISTEMA ANTI-MULTICUENTA
// ---------------------------------------------------------
