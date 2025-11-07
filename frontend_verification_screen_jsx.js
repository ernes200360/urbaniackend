// /frontend/screens/Verification.jsx
// Pantalla donde el usuario sube INE frontal, INE reverso y selfie
// Muestra estado de verificación y envía archivos al backend

import React, { useState, useEffect } from "react";

export default function Verification({ user }) {
  const [ineFront, setIneFront] = useState(null);
  const [ineBack, setIneBack] = useState(null);
  const [selfie, setSelfie] = useState(null);
  const [status, setStatus] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/verification/${user.id}`);
      const data = await res.json();
      setStatus(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchStatus();
  }, [user]);

  const uploadVerification = async () => {
    if (!ineFront || !ineBack || !selfie) {
      setInfo("Debes subir las 3 imágenes (INE frente, reverso y selfie)");
      return;
    }

    const form = new FormData();
    form.append("userId", user.id);
    form.append("ine_front", ineFront);
    form.append("ine_back", ineBack);
    form.append("selfie", selfie);

    try {
      const res = await fetch(`/api/verification/submit`, {
        method: "POST",
        body: form,
      });

      const data = await res.json();

      if (data.ok) {
        setInfo("✅ Documentos enviados. Tu verificación está en revisión.");
        fetchStatus();
      } else {
        setInfo("❌ Hubo un problema: " + (data.reason || "Error"));
      }
    } catch (e) {
      console.error(e);
      setInfo("Error subiendo documentos");
    }
  };

  if (loading) return <div>Cargando estado...</div>;

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold">Verificación de identidad</h2>
      <p className="text-sm text-slate-600 mt-1">Necesaria para usar Tandas Globales y Premium</p>

      {info && (
        <div className="mt-3 p-3 bg-blue-100 text-blue-700 rounded">{info}</div>
      )}

      {/* Estado actual */}
      {status?.status && (
        <div className="mt-4 bg-white p-4 rounded-xl shadow">
          <p className="text-sm text-slate-600">Estado actual:</p>
          <p className={`text-lg font-semibold ${status.status === 'approved' ? 'text-emerald-600' : status.status === 'rejected' ? 'text-red-600' : 'text-amber-600'}`}> {status.status}</p>

          {status.status === "rejected" && (
            <p className="text-xs text-red-500 mt-1">Motivo: {status.verification?.review_notes}</p>
          )}
        </div>
      )}

      {/* Subida de archivos */}
      <div className="mt-6 bg-white p-4 rounded-xl shadow">
        <h3 className="font-semibold mb-2">Sube tus documentos</h3>

        <div className="mt-2">
          <label className="text-sm">INE frontal</label>
          <input type="file" accept="image/*" onChange={(e) => setIneFront(e.target.files[0])} className="mt-1" />
        </div>

        <div className="mt-3">
          <label className="text-sm">INE reverso</label>
          <input type="file" accept="image/*" onChange={(e) => setIneBack(e.target.files[0])} className="mt-1" />
        </div>

        <div className="mt-3">
          <label className="text-sm">Selfie</label>
          <input type="file" accept="image/*" onChange={(e) => setSelfie(e.target.files[0])} className="mt-1" />
        </div>

        <button onClick={uploadVerification} className="mt-4 w-full py-2 bg-emerald-600 text-white rounded-xl">
          Enviar verificación
        </button>
      </div>
    </div>
  );
}
