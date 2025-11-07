// /frontend/screens/Verification.jsx
// Pantalla para subir INE frontal, reverso y selfie
// Compatible con el backend /api/verification/submit
// Muestra estado: not_submitted | pending | approved | rejected

import React, { useEffect, useState } from "react";

export default function Verification({ user }) {
  const [status, setStatus] = useState("loading");
  const [verification, setVerification] = useState(null);
  const [ineFront, setIneFront] = useState(null);
  const [ineBack, setIneBack] = useState(null);
  const [selfie, setSelfie] = useState(null);
  const [info, setInfo] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;

    async function load() {
      try {
        // GET /api/verification/:userId
        const r = await fetch(`/api/verification/${user.id}`);
        const j = await r.json();
        setStatus(j.status);
        setVerification(j.verification || null);
      } catch (err) {
        console.error(err);
        setStatus("error");
      }
    }

    load();
  }, [user]);

  const handleSubmit = async () => {
    if (!ineFront || !ineBack || !selfie) {
      setInfo("Debes subir INE frontal, reverso y selfie.");
      return;
    }

    setSubmitting(true);
    const form = new FormData();
    form.append("userId", user.id);
    form.append("ine_front", ineFront);
    form.append("ine_back", ineBack);
    form.append("selfie", selfie);

    try {
      const req = await fetch(`/api/verification/submit`, {
        method: "POST",
        body: form,
      });
      const res = await req.json();

      if (!res.ok) {
        setInfo(`⛔ Verificación rechazada automáticamente: ${res.reason || "Error"}`);
        setStatus("rejected");
        setSubmitting(false);
        return;
      }

      setInfo("✅ Datos enviados. Tu verificación está en revisión.");
      setStatus("pending");
      setSubmitting(false);
    } catch (e) {
      console.error(e);
      setInfo("Error al enviar verificación");
      setSubmitting(false);
    }
  };

  if (!user) return <div>Debes iniciar sesión</div>;
  if (status === "loading") return <div>Cargando verificación...</div>;

  return (
    <div className="p-4">
      {info && <div className="mb-3 p-3 bg-sky-100 text-sky-700 rounded">{info}</div>}

      <h2 className="text-2xl font-bold">Verificación de identidad</h2>

      {/* STATUS */}
      {status === "not_submitted" && (
        <p className="mt-2 text-slate-600 text-sm">Sube tu INE frontal, reverso y una selfie clara.</p>
      )}

      {status === "pending" && (
        <p className="mt-2 text-amber-600 text-sm">Tu verificación está en revisión. Esto puede tardar algunas horas.</p>
      )}

      {status === "approved" && (
        <p className="mt-2 text-emerald-600 text-sm">✅ Tu identidad ha sido verificada. Ya puedes usar Tandas.</p>
      )}

      {status === "rejected" && (
        <p className="mt-2 text-red-600 text-sm">⛔ Rechazada. Sube nuevamente tus documentos con mejor calidad.</p>
      )}

      {/* Formulario */}
      {(status === "not_submitted" || status === "rejected") && (
        <div className="mt-6 bg-white p-4 rounded-xl shadow">
          <label className="block text-sm font-medium">INE - Frente</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setIneFront(e.target.files[0])}
            className="mt-1 mb-3"
          />

          <label className="block text-sm font-medium">INE - Reverso</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setIneBack(e.target.files[0])}
            className="mt-1 mb-3"
          />

          <label className="block text-sm font-medium">Selfie</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setSelfie(e.target.files[0])}
            className="mt-1 mb-3"
          />

          <button
            disabled={submitting}
            onClick={handleSubmit}
            className="w-full py-2 bg-emerald-600 text-white rounded-xl mt-4 disabled:bg-slate-400"
          >
            {submitting ? "Enviando..." : "Enviar verificación"}
          </button>
        </div>
      )}
    </div>
  );
}
