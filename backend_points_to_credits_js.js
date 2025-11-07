// /backend/services/pointsToCredits.js
// Sistema #10: Conversión de puntos → créditos automáticos para Tandas Premium
// --------------------------------------------------------------
// Los puntos NO se gastan. No se pierden.
// Se usan para calcular "credits" que desbloquean tandas premium.
// La conversión funciona así:
//  - 1 punto = 1 crédito
//  - credits se actualizan automáticamente según el total de puntos
//  - credits se guardan en users.points_credits
// --------------------------------------------------------------

import { pool } from "../config.js";

// ✅ Función: recalcular créditos de TODOS los usuarios automáticamente
// Esta función se ejecuta por un CRON cada 24 horas
export async function recalcAllCredits() {
  try {
    // Obtiene puntos actuales de cada usuario
    const q = await pool.query(`
      SELECT id, total_points
      FROM users
    `);

    for (const row of q.rows) {
      const userId = row.id;
      const points = Number(row.total_points) || 0;

      // créditos = puntos (con posibilidad de cambiar fórmula futuramente)
      const credits = points;

      await pool.query(
        `UPDATE users SET points_credits = $1 WHERE id = $2`,
        [credits, userId]
      );
    }

    return { ok: true, updated: q.rows.length };
  } catch (err) {
    console.error("❌ Error recalculando créditos", err);
    return { ok: false };
  }
}

// ✅ Función: recalcular créditos SOLO de un usuario
export async function recalcCreditsForUser(userId) {
  try {
    const q = await pool.query(
      `SELECT total_points FROM users WHERE id = $1`,
      [userId]
    );

    if (q.rows.length === 0) throw new Error("Usuario no encontrado");

    const points = Number(q.rows[0].total_points) || 0;
    const credits = points;

    await pool.query(
      `UPDATE users SET points_credits = $1 WHERE id = $2`,
      [credits, userId]
    );

    return { ok: true, credits };
  } catch (err) {
    console.error("❌ Error recalculando créditos por usuario:", err);
    return { ok: false };
  }
}

// ✅ Endpoint helper (si se desea usar en backend/routes)
export async function handleRecalcRequest(req, res) {
  try {
    const result = await recalcAllCredits();
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: "Error en recálculo de créditos" });
  }
}

// ✅ Nota:
// Esta lógica se integra con:
//  ✅ tandasLogic.js (requisitos de créditos)
//  ✅ rutas de usuario
//  ✅ worker cron diario
// --------------------------------------------------------------
// Urbania ahora soporta créditos de confianza basados en puntos ❤️
// --------------------------------------------------------------
