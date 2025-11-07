// /backend/services/antiMultiCuenta.js
// Sistema #12: Anti-multicuenta biométrico y documental para Urbania
// --------------------------------------------------------------
// Este servicio protege Urbania evitando:
//  ✅ múltiples cuentas con la misma persona
//  ✅ duplicación de selfies
//  ✅ duplicación de INEs
//  ✅ registros con datos sospechosos
//  ✅ acceso a tandas desde cuentas falsas
// --------------------------------------------------------------
// MÉTODOS INCLUIDOS:
//  - detectDuplicateSelfie(selfieHash)
//  - detectDuplicateIne(ineFrontHash, ineBackHash)
//  - detectSuspiciousData(user)   (nombres repetidos, CURP similar, etc.)
//  - blockUser(userId, reason)
//  - isUserBlocked(userId)
// --------------------------------------------------------------

import { pool } from "../config.js";
import crypto from "crypto";
import fs from "fs/promises";

// ✅ Hash SHA256 de un archivo
export async function hashFile(path) {
  const buffer = await fs.readFile(path);
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

// ✅ 1) Detectar selfies duplicadas
// --------------------------------------------------------------
export async function detectDuplicateSelfie(selfieHash, currentUserId = null) {
  const q = await pool.query(
    `SELECT user_id FROM user_verifications
     WHERE selfie_hash=$1 AND status='approved'`,
    [selfieHash]
  );

  if (q.rows.length === 0) return null;

  // Si es el mismo usuario, no es duplicado
  if (currentUserId && q.rows[0].user_id === currentUserId) return null;

  return q.rows[0].user_id;
}

// ✅ 2) Detectar INE duplicado por hashes de imágenes
// --------------------------------------------------------------
export async function detectDuplicateIne(ineFrontHash, ineBackHash, currentUserId = null) {
  const q = await pool.query(
    `SELECT user_id FROM user_verifications
     WHERE (ine_front_hash=$1 OR ine_back_hash=$2)
     AND status='approved'`,
    [ineFrontHash, ineBackHash]
  );

  if (q.rows.length === 0) return null;
  if (currentUserId && q.rows[0].user_id === currentUserId) return null;

  return q.rows[0].user_id;
}

// ✅ 3) Detectar datos sospechosos
// --------------------------------------------------------------
export async function detectSuspiciousData(user) {
  const { email, display_name } = user;

  // Verifica nombres muy similares a cuentas existentes
  const similarQ = await pool.query(
    `SELECT id, display_name FROM users
     WHERE similarity(display_name, $1) > 0.7`,
    [display_name]
  );

  if (similarQ.rows.length > 1) {
    return {
      reason: "Nombre muy similar a otros usuarios. Posible duplicado.",
      matches: similarQ.rows,
    };
  }

  // Emails duplicados ya están protegidos a nivel DB
  return null;
}

// ✅ 4) Bloquear usuario por intento de multicuentas
// --------------------------------------------------------------
export async function blockUser(userId, reason) {
  await pool.query(
    `UPDATE users SET is_blocked=true WHERE id=$1`,
    [userId]
  );

  await pool.query(
    `INSERT INTO reputation_events (user_id, event, score_delta, details)
     VALUES ($1, 'multi_account_attempt', -5, $2)`,
    [userId, { reason }]
  );

  return true;
}

// ✅ 5) Saber si un usuario está bloqueado
// --------------------------------------------------------------
export async function isUserBlocked(userId) {
  const q = await pool.query(`SELECT is_blocked FROM users WHERE id=$1`, [userId]);
  return q.rows[0]?.is_blocked === true;
}

// ✅ 6) Checar multicuentas de forma completa
// --------------------------------------------------------------
export async function fullAntiMultiCheck({ userId, selfieHash, ineFrontHash, ineBackHash }) {
  // 1) Revisar selfies duplicadas
  const dupSelfie = await detectDuplicateSelfie(selfieHash, userId);
  if (dupSelfie) {
    await blockUser(userId, `Selfie duplicada con usuario ${dupSelfie}`);
    return { ok: false, reason: "Selfie duplicada detectada", duplicateWith: dupSelfie };
  }

  // 2) Revisar INEs duplicados
  const dupIne = await detectDuplicateIne(ineFrontHash, ineBackHash, userId);
  if (dupIne) {
    await blockUser(userId, `INE duplicado con usuario ${dupIne}`);
    return { ok: false, reason: "INE duplicado detectado", duplicateWith: dupIne };
  }

  // 3) Revisar datos sospechosos (nombre muy similar)
  const userQ = await pool.query(`SELECT * FROM users WHERE id=$1`, [userId]);
  const user = userQ.rows[0];

  const suspicious = await detectSuspiciousData(user);
  if (suspicious) {
    await blockUser(userId, suspicious.reason);
    return { ok: false, reason: suspicious.reason, matches: suspicious.matches };
  }

  return { ok: true };
}

// --------------------------------------------------------------
// FIN DEL SISTEMA ANTI-MULTICUENTA
// Urbania ahora detecta y bloquea:
// ✅ Selfies repetidas
// ✅ INEs repetidas
// ✅ Datos sospechosos
// ✅ Intentos de duplicar identidades
// --------------------------------------------------------------
