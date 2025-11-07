// /backend/workers/tandasWorker.js
// Worker/Cron para automatizar sorteos de Tandas Globales (30 ganadores por día)
// y sorteos programados de Tandas Premium (semanal o cada 3 días)
// Autor: Urbania Backend

import { pool } from "../config.js";
import {
  validateRoundPayments,
  evaluatePenalties,
  drawGlobalWinners,
} from "../services/tandasLogic.js";

// ---------------------------------------------------------
// ✅ Función: Ejecutar Sorteo GLOBAL (30 ganadores)
// ---------------------------------------------------------
export async function runGlobalDailyDraw() {
  console.log("✨ Ejecutando sorteo global (30 ganadores)…");

  try {
    const winners = await drawGlobalWinners();

    console.log(`✅ Ganadores seleccionados: ${winners.length}`);

    return winners;
  } catch (err) {
    console.error("❌ Error en sorteo global", err);
    return [];
  }
}

// ---------------------------------------------------------
// ✅ Función: Ejecutar sorteos de TANDA PREMIUM
//   Frecuencias: 'weekly' o 'every_3_days'
// ---------------------------------------------------------
export async function runPremiumDraws() {
  console.log("🎩 Ejecutando sorteos de tandas premium…");

  try {
    // Obtener tandas premium activas
    const tandasQ = await pool.query(
      `SELECT * FROM tandas WHERE type='premium' AND status='active'`
    );

    const tandas = tandasQ.rows;

    for (const tanda of tandas) {
      const now = new Date();
      let shouldDraw = false;

      // ✅ Tanda semanal
      if (tanda.frequency === "weekly") {
        const lastDrawQ = await pool.query(
          `SELECT draw_date FROM tanda_draws WHERE tanda_id=$1 ORDER BY draw_date DESC LIMIT 1`,
          [tanda.id]
        );

        const lastDraw = lastDrawQ.rows[0]?.draw_date;

        if (!lastDraw) shouldDraw = true;
        else {
          const diff = (now - new Date(lastDraw)) / (1000 * 60 * 60 * 24);
          if (diff >= 7) shouldDraw = true;
        }
      }

      // ✅ Tanda cada 3 días
      if (tanda.frequency === "every_3_days") {
        const lastDrawQ = await pool.query(
          `SELECT draw_date FROM tanda_draws WHERE tanda_id=$1 ORDER BY draw_date DESC LIMIT 1`,
          [tanda.id]
        );

        const lastDraw = lastDrawQ.rows[0]?.draw_date;

        if (!lastDraw) shouldDraw = true;
        else {
          const diff = (now - new Date(lastDraw)) / (1000 * 60 * 60 * 24);
          if (diff >= 3) shouldDraw = true;
        }
      }

      if (shouldDraw) {
        console.log(`✅ Sorteando tanda premium: ${tanda.title}`);

        const winner = await selectPremiumWinner(tanda.id);

        // Registrar sorteo
        await pool.query(
          `INSERT INTO tanda_draws (tanda_id, winner_participant_id, draw_date, amount_cents)
          VALUES ($1, $2, now(), $3)`,
          [tanda.id, winner.participant_id, tanda.amount_cents * tanda.total_participants]
        );
      }
    }
  } catch (err) {
    console.error("❌ Error en sorteos premium", err);
  }
}

// ---------------------------------------------------------
// ✅ Seleccionar ganador de una tanda premium
// ---------------------------------------------------------
async function selectPremiumWinner(tandaId) {
  // Elegir entre los que NO han recibido y están activos
  const q = await pool.query(
    `SELECT id AS participant_id FROM tanda_participants WHERE tanda_id=$1 AND is_active=true AND received=false`,
    [tandaId]
  );

  const participants = q.rows;
  if (participants.length === 0) return null;

  const random = Math.floor(Math.random() * participants.length);
  const winner = participants[random];

  // marcar como recibido
  await pool.query(`UPDATE tanda_participants SET received=true WHERE id=$1`, [winner.participant_id]);

  return winner;
}

// ---------------------------------------------------------
// ✅ Evaluar pagos atrasados, expulsiones y reputación
// ---------------------------------------------------------
export async function runPenaltyCheck(tandaId, roundNum) {
  console.log("⚠️ Verificando atrasos en ronda", roundNum);

  try {
    const lateUsers = await validateRoundPayments(tandaId, roundNum);
    await evaluatePenalties(tandaId);

    console.log(`⚠️ Usuarios atrasados: ${lateUsers.length}`);
    return lateUsers;
  } catch (err) {
    console.error("❌ Error en penalizaciones", err);
    return [];
  }
}

// ---------------------------------------------------------
// ✅ Función general que se llamará con CRON
// ---------------------------------------------------------
export async function runScheduledJobs() {
  console.log("⏱️ Ejecutando tareas automáticas de Urbania...");

  await runGlobalDailyDraw();
  await runPremiumDraws();

  console.log("✅ Tareas automáticas completadas.");
}
