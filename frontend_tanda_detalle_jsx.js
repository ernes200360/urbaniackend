// /frontend/screens/TandaDetalle.jsx
// Pantalla de detalle para ver información específica de una tanda
// Muestra: participantes, reglas, historial, pagos, requisitos, etc.

import React, { useEffect, useState } from "react";

export default function TandaDetalle({ tandaId, user }) {
  const [loading, setLoading] = useState(true);
  const [tanda, setTanda] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [history, setHistory] = useState([]);
  const [info, setInfo] = useState(null);
  const [showJoinModal, setShowJoinModal] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Mock temporal; cambiar por fetch a /api/tandas/:id
        const mock = {
          id: tandaId,
          title: "Tanda Premium $50 - Semanal",
          type: "premium",
          amount_cents: 5000,
          deposit_required: true,
          deposit_cents: 5000,
          frequency: "weekly",
          max_participants: 500,
          participants_count: 125,
          requires_reputation: 3.5,
          requires_points_credits: 5000,
          status: "active",
        };

        const mockParticipants = [
          { id: 1, name: "Luna G.", received: false },
          { id: 2, name: "Carlos M.", received: true },
        ];

        const mockHistory = [
          { id: 1, event: "joined", user: "Luna G.", date: "2025-10-01" },
          { id: 2, event: "joined", user: "Carlos M.", date: "2025-10-02" },
        ];

        setTanda(mock);
        setParticipants(mockParticipants);
        setHistory(mockHistory);
      } catch (err) {
        console.error(err);
        setInfo("Error cargando la tanda");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [tandaId]);

  const tryJoin = () => {
    if (!user?.is_verified) return setInfo("Debes verificar tu cuenta para unirte.");
    if (tanda.type === "premium") {
      if (Number(user.reputation_score) < Number(tanda.requires_reputation)) {
        return setInfo("Tu reputación no es suficiente para entrar.");
      }
      if (Number(user.points_credits) < Number(tanda.requires_points_credits)) {
        return setInfo("Necesitas más créditos de puntos.");
      }
    }
    setShowJoinModal(true);
  };

  const confirmJoin = () => {
    setInfo("Solicitud enviada. Completa el depósito para finalizar.");
    setShowJoinModal(false);
  };

  if (loading) return <div>Cargando tanda...</div>;

  return (
    <div className="p-4">
      {info && <div className="mb-3 p-3 bg-sky-100 text-sky-700 rounded">{info}</div>}

      <h2 className="text-2xl font-bold">{tanda.title}</h2>
      <p className="text-slate-500 mt-1">Tipo: {tanda.type}</p>

      <div className="mt-4 bg-white p-4 rounded-xl shadow">
        <h3 className="font-semibold">Detalles</h3>

        <p className="text-sm mt-2 text-slate-600">Aporte: ${ (tanda.amount_cents / 100).toFixed(2) }</p>
        <p className="text-sm text-slate-600">Frecuencia: {tanda.frequency}</p>
        <p className="text-sm text-slate-600">Participantes: {tanda.participants_count}/{tanda.max_participants}</p>

        {tanda.deposit_required && (
          <p className="text-sm text-orange-600 mt-2">Depósito inicial requerido: ${ (tanda.deposit_cents/100).toFixed(2) }</p>
        )}

        {tanda.type === "premium" && (
          <div className="mt-3 text-sm">
            <p>Reputación mínima: {tanda.requires_reputation} ★</p>
            <p>Créditos requeridos: {tanda.requires_points_credits}</p>
          </div>
        )}

        <button
          onClick={tryJoin}
          className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl"
        >
          Unirme
        </button>
      </div>

      {/* PARTICIPANTES */}
      <div className="mt-6 bg-white p-4 rounded-xl shadow">
        <h3 className="font-semibold mb-2">Participantes</h3>
        {participants.map((p) => (
          <div key={p.id} className="border-b py-2 text-sm">
            <span>{p.name}</span>
            {p.received && <span className="ml-2 text-emerald-600">(Ya recibió)</span>}
          </div>
        ))}
      </div>

      {/* HISTORIAL */}
      <div className="mt-6 bg-white p-4 rounded-xl shadow">
        <h3 className="font-semibold mb-2">Historial</h3>

        {history.map((h) => (
          <div key={h.id} className="border-b py-2 text-sm">
            <span className="font-semibold">{h.user}</span>
            <span className="ml-2 text-slate-600">{h.event}</span>
            <span className="ml-2 text-slate-400 text-xs">{h.date}</span>
          </div>
        ))}
      </div>

      {/* Join modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-lg relative">
            <button onClick={() => setShowJoinModal(false)} className="absolute top-3 right-3">✕</button>
            <h3 className="text-lg font-semibold">Unirse a {tanda.title}</h3>
            <p className="text-sm text-slate-500 mt-2">Confirma que deseas unirte. Si requiere depósito, deberás pagarlo.</p>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setShowJoinModal(false)} className="px-3 py-2 rounded">Cancelar</button>
              <button onClick={confirmJoin} className="ml-2 px-3 py-2 rounded bg-emerald-600 text-white">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
