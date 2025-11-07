// /backend/services/reputation.js
// Sistema #13 — Reputación de usuarios para Urbania
// --------------------------------------------------------------
// Responsabilidades:
// - Aplicar eventos de reputación (pagó a tiempo, faltó, cooperó, etc.)
// - Recalcular score agregado del usuario (0.00 - 5.00)
// - Exponer helpers para consultar y penalizar/bonificar usuarios
// - Registrar events en la tabla reputation_events
// --------------------------------------------------------------

import { pool } from "../config.js";

// Parámetros de negocio (ajustables)
const SCORE_MIN = 0.0;
const SCORE_MAX = 5.0;

// Pesos por evento (puedes ajustar)
// positive: aumenta reputación; negative: disminuye
export const EVENT_WEIGHTS = {
  paid_on_time: 0.5,
  paid_late: -0.5,
  missed_payment: -1.5,
  created_project_success: 1.0,
  validated_donation: 0.3,
  volunteer_help: 0.4,
  reported_fraud: -2.0,
  manual_adjustment: 0.0, // se usa para setear manualmente
};

// --------------------------------------------------------------
// Registrar un evento de reputación
// event: string (clave en EVENT_WEIGHTS)
// scoreDelta: optional (si se quiere override)
// details: object (opcional)
// --------------------------------------------------------------
export async function addReputationEvent(userId, event, scoreDelta = null, details = null) {
  try {
    const delta = scoreDelta !== null ? scoreDelta : (EVENT_WEIGHTS[event] || 0);

    await pool.query(
      `INSERT INTO reputation_events (user_id, event, score_delta, details) VALUES ($1, $2, $3, $4)`,
      [userId, event, delta, details ? JSON.stringify(details) : null]
    );

    // Actualizar el score agregado del usuario
    await recalcUserReputation(userId);

    return { ok: true, delta };
  } catch (err) {
    console.error("Error addReputationEvent:", err);
    return { ok: false };
  }
}

// --------------------------------------------------------------
// Recalcular reputación de un usuario desde events (score agregado)
// Método: sumar todos los score_delta y mapear a escala 0-5.
// Ajustable según necesidades de negocio.
// --------------------------------------------------------------
export async function recalcUserReputation(userId) {
  try {
    const q = await pool.query(
      `SELECT COALESCE(SUM(score_delta),0) AS total_delta FROM reputation_events WHERE user_id = $1`,
      [userId]
    );

    const totalDelta = Number(q.rows[0].total_delta) || 0;

    // Normalizar: asumimos que un usuario nuevo parte en 2.5 y los deltas mueven el score.
    // Fórmula: base + normalized_delta
    const BASE = 2.5;

    // Para evitar scores extremos, limitamos el totalDelta a un rango razonable
    const CLAMP_DELTA = Math.max(-10, Math.min(10, totalDelta));

    // Mapeo simple: cada 1 punto de delta equivale a 0.2 en la escala 0-5 (ajustable)
    const SCALE = 0.2;
    let newScore = BASE + CLAMP_DELTA * SCALE;

    // Clamp entre 0 y 5
    newScore = Math.max(SCORE_MIN, Math.min(SCORE_MAX, newScore));

    // Guardar en users.reputation_score
    await pool.query(`UPDATE users SET reputation_score = $1 WHERE id = $2`, [newScore.toFixed(2), userId]);

    return { ok: true, reputation: Number(newScore.toFixed(2)) };
  } catch (err) {
    console.error("Error recalcUserReputation:", err);
    return { ok: false };
  }
}

// --------------------------------------------------------------
// Obtener reputación del usuario
// --------------------------------------------------------------
export async function getUserReputation(userId) {
  try {
    const q = await pool.query(`SELECT reputation_score FROM users WHERE id = $1`, [userId]);
    if (q.rows.length === 0) return { ok: false, error: 'User not found' };
    return { ok: true, reputation: Number(q.rows[0].reputation_score) };
  } catch (err) {
    console.error('Error getUserReputation', err);
    return { ok: false };
  }
}

// --------------------------------------------------------------
// Función para penalizar por faltas recurrentes (ejemplo usado en tandas)
// --------------------------------------------------------------
export async function penalizeMissedPayment(userId, details = null) {
  // Añadir event
  await addReputationEvent(userId, 'missed_payment', EVENT_WEIGHTS['missed_payment'], details);
}

// --------------------------------------------------------------
// Función para bonificar por comportamiento ejemplar
// --------------------------------------------------------------
export async function rewardPaidOnTime(userId, details = null) {
  await addReputationEvent(userId, 'paid_on_time', EVENT_WEIGHTS['paid_on_time'], details);
}

// --------------------------------------------------------------
// Export default
// --------------------------------------------------------------
export default {
  addReputationEvent,
  recalcUserReputation,
  getUserReputation,
  penalizeMissedPayment,
  rewardPaidOnTime,
};
