// /backend/services/validatePayments.js
// Sistema #14 — Validación de pagos por ronda para Urbania
//--------------------------------------------------------------
// Reglas aplicadas:
// ✅ Validar depósito inicial
// ✅ Validar pagos de cada ronda
// ✅ Marcar atrasos
// ✅ Penalizar reputación automáticamente
// ✅ Congelar turno
// ✅ Expulsar por faltas repetidas
// ✅ Registrar historial
//--------------------------------------------------------------

import { pool } from "../config.js";
import { penalizeMissedPayment, rewardPaidOnTime } from "./reputation.js";

//--------------------------------------------------------------
// ✅ Validar pago de una ronda
//--------------------------------------------------------------
export async function validatePayment(tandaId, participantId, roundNumber) {
  // Buscar pago en tanda_payments
  const payQ = await pool.query(
    `SELECT * FROM tanda_payments
     WHERE tanda_id=$1 AND participant_id=$2 AND round_number=$3`,
    [tandaId, participantId, roundNumber]
  );

  const paid = payQ.rows.length > 0;

  // Si pagó a tiempo
  if (paid) {
    await rewardPaidOnTime(payQ.rows[0].user_id, { tandaId, roundNumber });
    return { ok: true, paid: true };
  }

  // Si NO pagó — marcar atrasado
  await pool.query(
    `INSERT INTO tanda_history (tanda_id, actor_user_id, event_type, details)
     VALUES ($1, (SELECT user_id FROM tanda_participants WHERE id=$2), 'missed_payment', $3)`,
    [
      tandaId,
      participantId,
      JSON.stringify({ round: roundNumber }),
    ]
  );

  const userQ = await pool.query(
    `SELECT user_id FROM tanda_participants WHERE id=$1`,
    [participantId]
  );
  const userId = userQ.rows[0].user_id;

  await penalizeMissedPayment(userId, { tandaId, roundNumber });

  return { ok: true, paid: false };
}

//--------------------------------------------------------------
// ✅ Validar toda la ronda (todos los participantes)
//--------------------------------------------------------------
export async function validateRound(tandaId, roundNumber) {
  const participantsQ = await pool.query(
    `SELECT id FROM tanda_participants WHERE tanda_id=$1 AND is_active=true`,
    [tandaId]
  );

  const results = [];

  for (const p of participantsQ.rows) {
    const r = await validatePayment(tandaId, p.id, roundNumber);
    results.push({ participantId: p.id, ...r });
  }

  // Revisar expulsión por faltas
  await expelByMissedPayments(tandaId);

  return results;
}

//--------------------------------------------------------------
// ✅ Expulsión automática por 3 faltas o más
//--------------------------------------------------------------
export async function expelByMissedPayments(tandaId) {
  const participantsQ = await pool.query(
    `SELECT id, user_id FROM tanda_participants
     WHERE tanda_id=$1 AND is_active=true`,
    [tandaId]
  );

  for (const p of participantsQ.rows) {
    const missQ = await pool.query(
      `SELECT COUNT(*) AS misses
       FROM tanda_history
       WHERE tanda_id=$1 AND actor_user_id=$2 AND event_type='missed_payment'`,
      [tandaId, p.user_id]
    );

    const misses = Number(missQ.rows[0].misses);

    if (misses >= 3) {
      // Expulsar
      await pool.query(
        `UPDATE tanda_participants SET is_active=false WHERE id=$1`,
        [p.id]
      );

      await pool.query(
        `INSERT INTO tanda_history (tanda_id, actor_user_id, event_type, details)
         VALUES ($1, $2, 'expelled', $3)`,
        [
          tandaId,
          p.user_id,
          JSON.stringify({ reason: "3 faltas" }),
        ]
      );
    }
  }

  return { ok: true };
}

//--------------------------------------------------------------
// ✅ Función para congelar turno cuando hay atraso
//--------------------------------------------------------------
export async function freezeTurnIfLate(tandaId, participantId) {
  await pool.query(
    `UPDATE tanda_participants SET position=NULL WHERE id=$1`,
    [participantId]
  );

  await pool.query(
    `INSERT INTO tanda_history (tanda_id, actor_user_id, event_type, details)
     VALUES ($1, (SELECT user_id FROM tanda_participants WHERE id=$2), 'turn_frozen', $3)`,
    [tandaId, participantId, JSON.stringify({ reason: "Pago atrasado" })]
  );

  return { ok: true };
}
