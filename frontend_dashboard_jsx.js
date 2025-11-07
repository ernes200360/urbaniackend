// /frontend/screens/Dashboard.jsx
// Sistema #15 — Panel principal del usuario en Urbania
// --------------------------------------------------------------
// Muestra:
// ✅ Información del usuario (nombre, reputación, verificación)
// ✅ Créditos y puntos
// ✅ Tandas activas y su estado
// ✅ Historial de pagos
// ✅ Donaciones realizadas
// ✅ Acceso rápido a: Tandas, Votación, Proyectos, Perfil
// --------------------------------------------------------------

import React, { useEffect, useState } from "react";

export default function Dashboard({ user, onNavigate }) {
  const [tandas, setTandas] = useState([]);
  const [payments, setPayments] = useState([]);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null);

  useEffect(() => {
    if (!user) return;

    async function load() {
      try {
        // Cargar tandas del usuario
        const t1 = await fetch(`/api/tandas/user/${user.id}`);
        const tandasJson = await t1.json();

        // Cargar historial de pagos
        const t2 = await fetch(`/api/tandas/payments/${user.id}`);
        const paymentsJson = await t2.json();

        // Cargar donaciones
        const t3 = await fetch(`/api/donations/${user.id}`);
        const donationsJson = await t3.json();

        setTandas(tandasJson.tandas || []);
        setPayments(paymentsJson.payments || []);
        setDonations(donationsJson.donations || []);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setInfo("Error cargando información del panel.");
        setLoading(false);
      }
    }

    load();
  }, [user]);

  if (!user) return <div>Debes iniciar sesión</div>;
  if (loading) return <div className="p-4">Cargando tu panel…</div>;

  return (
    <div className="p-4 space-y-6">
      {info && (
        <div className="bg-sky-100 p-3 rounded text-sky-700">{info}</div>
      )}

      {/* HEADER */}
      <div className="bg-white shadow rounded-xl p-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Hola, {user.display_name}</h2>
          <p className="text-sm text-slate-600">Bienvenido a Urbania</p>
        </div>
        <img
          src={user.profile_photo || "/default-avatar.png"}
          alt="avatar"
          className="w-16 h-16 rounded-full object-cover shadow"
        />
      </div>

      {/* VERIFICACIÓN + REPUTACIÓN */}
      <div className="bg-white shadow p-4 rounded-xl">
        <h3 className="font-bold mb-2">Estado de tu cuenta</h3>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600">Verificación</p>
            <p className={`font-semibold ${user.is_verified ? "text-emerald-600" : "text-red-600"}`}>
              {user.is_verified ? "Verificada ✅" : "No verificada ❌"}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-600">Reputación</p>
            <p className="font-semibold">⭐ {user.reputation_score}</p>
          </div>

          <button
            onClick={() => onNavigate("Verification")}
            className="px-3 py-1 bg-sky-600 text-white rounded"
          >
            Verificar
          </button>
        </div>
      </div>

      {/* PUNTOS Y CRÉDITOS */}
      <div className="bg-white shadow p-4 rounded-xl">
        <h3 className="font-bold mb-3">Tus puntos y créditos</h3>
        <div className="flex justify-between text-center">
          <div>
            <p className="text-sm text-slate-600">Puntos</p>
            <p className="text-xl font-bold text-emerald-600">{user.total_points}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Créditos</p>
            <p className="text-xl font-bold text-indigo-600">{user.points_credits}</p>
          </div>
        </div>
      </div>

      {/* TANDAS ACTIVAS */}
      <div className="bg-white shadow p-4 rounded-xl">
        <h3 className="font-bold mb-3">Tus tandas</h3>

        {tandas.length === 0 && (
          <p className="text-slate-500 text-sm">No participas en ninguna tanda.</p>
        )}

        {tandas.map((t) => (
          <div
            key={t.id}
            className="border-b py-2 flex justify-between items-center"
          >
            <div>
              <p className="font-semibold">{t.name}</p>
              <p className="text-slate-500 text-xs">Ronda actual: {t.current_round}</p>
            </div>
            <button
              className="px-3 py-1 bg-indigo-600 text-white rounded"
              onClick={() => onNavigate("TandaDetalle", t)}
            >
              Ver
            </button>
          </div>
        ))}
      </div>

      {/* HISTORIAL DE PAGOS */}
      <div className="bg-white shadow p-4 rounded-xl">
        <h3 className="font-bold mb-3">Pagos recientes</h3>

        {payments.length === 0 && (
          <p className="text-slate-500 text-sm">No tienes pagos aún.</p>
        )}

        {payments.map((p) => (
          <div key={p.id} className="border-b py-2 text-sm">
            <p>Monto: ${p.amount}</p>
            <p className="text-slate-500 text-xs">Ronda {p.round_number}</p>
          </div>
        ))}
      </div>

      {/* DONACIONES */}
      <div className="bg-white shadow p-4 rounded-xl mb-8">
        <h3 className="font-bold mb-3">Tus donaciones</h3>

        {donations.length === 0 && (
          <p className="text-slate-500 text-sm">Aún no has donado.</p>
        )}

        {donations.map((d) => (
          <div key={d.id} className="border-b py-2 text-sm">
            <p>Monto: ${d.amount}</p>
            <p className="text-xs text-slate-500">A: {d.receiver_name}</p>
          </div>
        ))}
      </div>

      {/* NAVEGACIÓN RÁPIDA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white shadow-xl p-4 flex justify-between">
        <button onClick={() => onNavigate("Tandas")}>Tandas</button>
        <button onClick={() => onNavigate("VoteTanda")}>Votar</button>
        <button onClick={() => onNavigate("Projects")}>Proyectos</button>
        <button onClick={() => onNavigate("Profile")}>Perfil</button>
      </div>
    </div>
  );
}
