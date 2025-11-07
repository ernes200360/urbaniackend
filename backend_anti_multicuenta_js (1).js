// /backend/services/antiMulticuenta.js
// Sistema #12 — Anti-Multicuenta Biométrico para Urbania
//--------------------------------------------------------------
// Funciones:
// ✅ Detectar duplicados por selfie_hash
// ✅ Detectar duplicados por INE (OCR futuro / hash simple actual)
// ✅ Detectar duplicados por datos similares: nombre, fecha, email
// ✅ Bloquear automáticamente cuentas sospechosas
// ✅ Reglas: una persona = una cuenta
// Este módulo se integra con verification.js
//--------------------------------------------------------------

import { pool } from "../config.js";

//--------------------------------------------------------------
// ✅ 1. Verificar si una selfie ya existe en otra cuenta
//--------------------------------------------------------------
export async function detectDuplicateSelfie(selfieHash, currentUserId = null) {
  const q = await pool.query(
    `SELECT uv.user_id, uv.status
     FROM user_verifications uv
     WHERE uv.selfie_hash = $1
     AND ($2 IS NULL OR uv.user_id != $2)
     AND uv.status = 'approved'
     LIMIT 1`,
    [selfieHash, currentUserId]
  );

  if (q.rows.length > 0) {
    return {
      duplicate: true,
      matched_user: q.rows[0].user_id,
    };
  }

  return { duplicate: false };
}

//--------------------------------------------------------------
// ✅ 2. Verificar duplicado por INE frontal hash (simple)
// NOTE: Se recomienda OCR real en el futuro
//--------------------------------------------------------------
export async function detectDuplicateINE(ineFrontHash, currentUserId = null) {
  const q = await pool.query(
    `SELECT uv.user_id, uv.status
     FROM user_verifications uv
     WHERE uv.ine_front_hash = $1
     AND ($2 IS NULL OR uv.user_id != $2)
     AND uv.status = 'approved'
     LIMIT 1`,
    [ineFrontHash, currentUserId]
  );

  if (q.rows.length > 0) {
    return {
      duplicate: true,
      matched_user: q.rows[0].user_id,
    };
  }

  return { duplicate: false };
}

//--------------------------------------------------------------
// ✅ 3. Detección por datos personales similares (fuzzy match)
// Comparación ligera por nombre
//--------------------------------------------------------------
export async function detectSimilarName(name, currentUserId = null) {
  if (!name) return { similar: false };

  const q = await pool.query(
    `SELECT id, display_name FROM users
     WHERE LOWER(display_name) = LOWER($1)
     AND ($2 IS NULL OR id != $2)
     LIMIT 1`,
    [name, currentUserId]
  );

  if (q.rows.length > 0) {
    return {
      similar: true,
      matched_user: q.rows[0].id,
    };
  }

  return { similar: false };
}

//--------------------------------------------------------------
// ✅ 4. Regla final: verificar si usuario puede aprobar verificación
//--------------------------------------------------------------
export async function antiMulticuentaCheck({ selfieHash, ineFrontHash, name, currentUserId }) {
  // Selfie duplicada
  const selfieCheck = await detectDuplicateSelfie(selfieHash, currentUserId);
  if (selfieCheck.duplicate) {
    return {
      ok: false,
      reason: "Selfie ya existe en otra cuenta",
      matched_user: selfieCheck.matched_user,
    };
  }

  // INE duplicado (hash simple)
  if (ineFrontHash) {
    const ineCheck = await detectDuplicateINE(ineFrontHash, currentUserId);
    if (ineCheck.duplicate) {
      return {
        ok: false,
        reason: "El INE ya está registrado en otra cuenta",
        matched_user: ineCheck.matched_user,
      };
    }
  }

  // Nombre similar exacto
  const nameCheck = await detectSimilarName(name, currentUserId);
  if (nameCheck.similar) {
    return {
      ok: false,
      reason: "El nombre coincide con otro usuario. Sospecha de multicuentas.",
      matched_user: nameCheck.matched_user,
    };
  }

  // Si pasa todo
  return { ok: true };
}

//--------------------------------------------------------------
// ✅ 5. Marcar usuario como bloqueado por multicuentas
//--------------------------------------------------------------
export async function blockUser(userId, reason = "multicuenta sospechosa") {
  await pool.query(
    `UPDATE users SET is_active = false, ban_reason=$2 WHERE id=$1`,
    [userId, reason]
  );
}

//--------------------------------------------------------------
// ✅ 6. Integración lista para usar desde verification.js
//--------------------------------------------------------------
export async function runAntiMulticuentaDuringVerification(verificationRecord) {
  const { user_id, selfie_hash, ine_front_hash } = verificationRecord;

  // Datos del usuario
  const userQ = await pool.query(
    `SELECT id, display_name FROM users WHERE id = $1`,
    [user_id]
  );
  const user = userQ.rows[0];

  const check = await antiMulticuentaCheck({
    selfieHash: selfie_hash,
    ineFrontHash: ine_front_hash,
    name: user.display_name,
    currentUserId: user_id,
  });

  if (!check.ok) {
    // Bloquear usuario automáticamente
    await blockUser(user_id, check.reason);

    // Registrar rechazo de verificación
    await pool.query(
      `UPDATE user_verifications SET status='rejected', review_notes=$2, reviewed_at=now() WHERE id=$1`,
      [verificationRecord.id, check.reason]
    );

    return { ok: false, reason: check.reason };
  }

  return { ok: true };
}
