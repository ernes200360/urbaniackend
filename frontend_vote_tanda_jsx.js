// /frontend/screens/VoteTanda.jsx
// Pantalla dedicada para votar tandas propuestas
// Muestra detalles, progreso, botones, validaciones y confirmación

import React, { useEffect, useState } from "react";

export default function VoteTanda({ tandaId, user }) {
  const [loading, setLoading] = useState(true);
  const [tanda, setTanda] = useState(null);
  const [info, setInfo] = useState(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Mock temporal; reemplazar con fetch /api/tandas/:id
        const mockProposal = {
          id: tandaId,
          title: "Propuesta: Tanda $100 cada 3 días",
          type: "proposed",
          amount_cents: 10000,
          frequency: "every_3_days",
          votes_required: 2000,
          votes_count: 420,
          creator: "Luna García",
          status: "voting",
          description: "Tanda premium de 100 pesos con frecuencia cada 3 días y cupo limitado a 300 personas.",
        };

        setTanda(mockProposal);
      } catch (err) {
        console.error(err);
        setInfo("No se pudo cargar la tanda propuesta");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [tandaId]);

  const castVote = async () => {
    if (!user) return setInfo("Debes iniciar sesión para votar.");

    setConfirming(true);
  };

  const confirmVote = async () => {
    try {
      // POST /api/tandas/vote
      setInfo("✅ Tu voto fue registrado. Gracias por apoyar esta tanda.");
      setConfirming(false);
    } catch (err) {
      console.error(err);
      setInfo("No se pudo registrar tu voto.");
    }
  };

  if (loading) return <div>Cargando...</div>;

  const progress = Math.min(
    (tanda.votes_count / tanda.votes_required) * 100,
    100
  );

  return (
    <div className="p-4">
      {info && (
        <div className="mb-3 p-3 bg-amber-100 text-amber-700 rounded">{info}</div>
      )}

      <h2 className="text-2xl font-bold">{tanda.title}</h2>
      <p className="text-sm text-slate-500 mt-1">Propuesta por {tanda.creator}</p>

      {tanda.description && (
        <p className="mt-3 text-sm text-slate-700">{tanda.description}</p>
      )}

      <div className="mt-4 bg-white rounded-xl p-4 shadow">
        <h3 className="font-semibold">Detalles</h3>
        <p className="text-sm text-slate-600 mt-2">Aporte: ${
          (tanda.amount_cents / 100).toFixed(2)
        }</p>
        <p className="text-sm text-slate-600">Frecuencia: {tanda.frequency}</p>
        <p className="text-sm text-slate-600">Estado: {tanda.status}</p>
      </div>

      <div className="mt-6 bg-white rounded-xl p-4 shadow">
        <h3 className="font-semibold">Progreso de votos</h3>
        <div className="mt-3 w-full bg-slate-200 h-3 rounded-full overflow-hidden">
          <div
            style={{ width: progress + "%" }}
            className="h-full bg-emerald-600"
          ></div>
        </div>
        <p className="text-sm mt-2 text-slate-600">
          {tanda.votes_count} / {tanda.votes_required} votos
        </p>
      </div>

      <button
        onClick={castVote}
        className="mt-6 w-full py-2 bg-emerald-600 text-white rounded-xl"
      >
        Votar por esta tanda
      </button>

      {/* Modal confirmar voto */}
      {confirming && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-lg relative">
            <button onClick={() => setConfirming(false)} className="absolute top-3 right-3">✕</button>
            <h3 className="text-lg font-semibold">Confirmar voto</h3>
            <p className="text-sm text-slate-500 mt-2">¿Deseas registrar tu voto por esta tanda?</p>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setConfirming(false)} className="px-3 py-2 rounded">Cancelar</button>
              <button onClick={confirmVote} className="ml-2 px-3 py-2 rounded bg-emerald-600 text-white">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
