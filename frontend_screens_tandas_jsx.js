// /frontend/screens/Tandas.jsx
// Pantalla principal para Tandas: Global, Premium y Propuestas (votadas)
// Muestra estado, permite votar, unirse y ver requisitos (verificación, reputación, créditos)

import React, { useEffect, useState } from "react";

export default function Tandas({ user }) {
  const [loading, setLoading] = useState(true);
  const [globalTanda, setGlobalTanda] = useState(null);
  const [premium, setPremium] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [myParticipation, setMyParticipation] = useState([]);
  const [showJoinModal, setShowJoinModal] = useState(null); // tanda object
  const [showVoteModal, setShowVoteModal] = useState(null);
  const [info, setInfo] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // En producción: llamar a /api/tandas/active y /api/tandas/global (ajustar endpoints)
        const mockGlobal = {
          id: "global-1",
          title: "Tanda Global",
          type: "global",
          amount_cents: 100,
          frequency: "daily",
          participants_count: 125000,
          winners_per_day: 30,
          status: "active",
        };

        const mockPremium = [
          {
            id: "p-50-weekly",
            title: "Tanda Premium $50 - Semanal",
            type: "premium",
            amount_cents: 5000,
            frequency: "weekly",
            max_participants: 500,
            participants_count: 125,
            requires_reputation: 3.5,
            requires_points_credits: 5000,
            deposit_required: true,
            deposit_cents: 5000,
            status: "active",
          },
        ];

        const mockProposals = [
          {
            id: "prop-100",
            title: "Propuesta: Tanda $100 - cada 3 días",
            type: "proposed",
            amount_cents: 10000,
            frequency: "every_3_days",
            votes_required: 2000,
            votes_count: 420,
            status: "voting",
          },
        ];

        const mockMy = [];

        setGlobalTanda(mockGlobal);
        setPremium(mockPremium);
        setProposals(mockProposals);
        setMyParticipation(mockMy);
      } catch (e) {
        console.error(e);
        setInfo("Error cargando tandas");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const joinTanda = async (tanda) => {
    // Validaciones frontend rápidas
    if (!user || !user.is_verified) {
      setInfo("Debes tener tu cuenta verificada para unirte a esta tanda.");
      return;
    }

    if (tanda.type === "premium") {
      if (Number(user.reputation_score) < Number(tanda.requires_reputation)) {
        setInfo("Reputación insuficiente para entrar a esta tanda premium.");
        return;
      }
      if (Number(user.points_credits) < Number(tanda.requires_points_credits)) {
        setInfo("Necesitas más créditos (puntos) para entrar a esta tanda premium.");
        return;
      }
    }

    // abrir modal para confirmar depósito si aplica
    setShowJoinModal(tanda);
  };

  const confirmJoin = async (tanda) => {
    try {
      // POST /api/tandas/join { userId, tandaId }
      // Si deposit_required -> redirigir a pantalla de pago / subir comprobante
      setInfo("Solicitud de unión enviada. Paga el depósito para completar la inscripción.");
      setShowJoinModal(null);
    } catch (e) {
      console.error(e);
      setInfo("No se pudo unir a la tanda.");
    }
  };

  const vote = async (proposal) => {
    if (!user) return setInfo("Inicia sesión para votar");
    setShowVoteModal(proposal);
  };

  const confirmVote = async (proposal) => {
    try {
      // POST /api/tandas/vote { tandaId, userId }
      setInfo("Voto registrado. Gracias por participar.");
      setShowVoteModal(null);
    } catch (e) {
      setInfo("No se pudo registrar el voto.");
    }
  };

  if (loading) return <div>Cargando tandas...</div>;

  return (
    <div className="p-3">
      <h2 className="text-2xl font-bold">Tandas</h2>

      {/* INFO */}
      {info && <div className="mt-3 p-3 bg-sky-100 text-sky-700 rounded">{info}</div>}

      {/* 1) TANDA GLOBAL */}
      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Tanda Global</h3>
          <div className="text-sm text-slate-500">{globalTanda.participants_count.toLocaleString()} participantes</div>
        </div>

        <div className="mt-3 bg-white rounded-xl p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Aporte</div>
              <div className="text-xl font-bold">$ {(globalTanda.amount_cents/100).toFixed(2)}</div>
              <div className="text-xs text-slate-400">{globalTanda.winners_per_day} premios por día</div>
            </div>

            <div>
              <button
                onClick={() => joinTanda(globalTanda)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl"
              >
                Inscribirme
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2) TANDAS PREMIUM */}
      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Tandas Premium</h3>
          <div className="text-sm text-slate-500">Exclusivas: requieren verificación y créditos</div>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          {premium.map((p) => (
            <div key={p.id} className="bg-white rounded-xl p-4 shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">{p.title}</h4>
                  <div className="text-xs text-slate-400">Frecuencia: {p.frequency}</div>
                  <div className="text-xs text-slate-400">Cupo: {p.participants_count}/{p.max_participants}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-slate-500">Aporte</div>
                  <div className="font-bold text-emerald-600">$ {(p.amount_cents/100).toFixed(2)}</div>
                </div>
              </div>

              <div className="mt-3 flex gap-2 justify-end">
                <button onClick={() => joinTanda(p)} className="px-3 py-2 rounded bg-sky-600 text-white">Entrar</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3) PROPUESTAS / VOTADAS */}
      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Tandas propuestas (vota para activarlas)</h3>
          <div className="text-sm text-slate-500">Cuando alcanzan votos required se activan</div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-4">
          {proposals.map((pr) => (
            <div key={pr.id} className="bg-white rounded-xl p-4 shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">{pr.title}</h4>
                  <div className="text-xs text-slate-400">{pr.votes_count || 0} / {pr.votes_required} votos</div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => vote(pr)} className="px-3 py-2 rounded bg-amber-500 text-white">Votar</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4) Mis tandas */}
      <section className="mt-6">
        <h3 className="text-lg font-semibold">Mis tandas</h3>
        <div className="mt-3 bg-white rounded-xl p-4 shadow">
          {myParticipation.length === 0 ? (
            <p className="text-sm text-slate-500">Aún no participas en tandas.</p>
          ) : (
            myParticipation.map((m) => (
              <div key={m.id} className="border rounded p-2 mb-2">
                <div className="flex justify-between">
                  <div>{m.tanda_title}</div>
                  <div className="text-sm text-slate-400">Estado: {m.status}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Join modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-lg relative">
            <button onClick={() => setShowJoinModal(null)} className="absolute top-3 right-3">✕</button>
            <h3 className="text-lg font-semibold">Unirse a {showJoinModal.title}</h3>
            <p className="text-sm text-slate-500 mt-2">Confirma que deseas unirte a esta tanda. Si requiere depósito, deberás pagarlo para completar la inscripción.</p>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setShowJoinModal(null)} className="px-3 py-2 rounded">Cancelar</button>
              <button onClick={() => confirmJoin(showJoinModal)} className="ml-2 px-3 py-2 rounded bg-emerald-600 text-white">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Vote modal */}
      {showVoteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-lg relative">
            <button onClick={() => setShowVoteModal(null)} className="absolute top-3 right-3">✕</button>
            <h3 className="text-lg font-semibold">Votar por {showVoteModal.title}</h3>
            <p className="text-sm text-slate-500 mt-2">¿Deseas apoyar la creación de esta tanda?</p>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setShowVoteModal(null)} className="px-3 py-2 rounded">Cancelar</button>
              <button onClick={() => confirmVote(showVoteModal)} className="ml-2 px-3 py-2 rounded bg-amber-500 text-white">Votar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
