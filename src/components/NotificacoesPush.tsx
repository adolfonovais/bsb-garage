"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";

type Estado = "carregando" | "nao-suportado" | "bloqueado" | "desligado" | "ligado";

function chaveParaUint8(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const bruto = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const saida = new Uint8Array(new ArrayBuffer(bruto.length));
  for (let i = 0; i < bruto.length; i += 1) saida[i] = bruto.charCodeAt(i);
  return saida;
}

/** Liga/desliga as notificações de mensagem nova do WhatsApp neste navegador. */
export function NotificacoesPush() {
  const [estado, setEstado] = useState<Estado>("carregando");
  const [erro, setErro] = useState<string | null>(null);
  const chavePublica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    async function verificar() {
      if (!chavePublica || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setEstado("nao-suportado");
        return;
      }
      if (Notification.permission === "denied") {
        setEstado("bloqueado");
        return;
      }
      const registro = await navigator.serviceWorker.getRegistration("/sw.js");
      const inscricao = await registro?.pushManager.getSubscription();
      setEstado(inscricao && Notification.permission === "granted" ? "ligado" : "desligado");
    }
    void verificar();
  }, [chavePublica]);

  async function ligar() {
    setErro(null);
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") {
        setEstado(permissao === "denied" ? "bloqueado" : "desligado");
        return;
      }
      const registro = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const inscricao =
        (await registro.pushManager.getSubscription()) ??
        (await registro.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: chaveParaUint8(chavePublica!),
        }));

      const resposta = await fetch("/api/push/inscrever", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inscricao.toJSON()),
      });
      if (!resposta.ok) throw new Error("O servidor não aceitou a inscrição.");
      setEstado("ligado");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível ligar as notificações.");
    }
  }

  async function desligar() {
    setErro(null);
    try {
      const registro = await navigator.serviceWorker.getRegistration("/sw.js");
      const inscricao = await registro?.pushManager.getSubscription();
      if (inscricao) {
        await fetch("/api/push/inscrever", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: inscricao.endpoint }),
        });
        await inscricao.unsubscribe();
      }
      setEstado("desligado");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível desligar as notificações.");
    }
  }

  if (estado === "carregando") return null;

  if (estado === "nao-suportado") {
    return <p className="text-xs text-slate-400">Este navegador não suporta notificações.</p>;
  }
  if (estado === "bloqueado") {
    return (
      <p className="flex items-center gap-1 text-xs text-amber-700">
        <BellOff className="h-3.5 w-3.5" /> Notificações bloqueadas — libere nas permissões do navegador.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {estado === "ligado" ? (
        <button
          type="button"
          onClick={desligar}
          className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
        >
          <Bell className="h-3.5 w-3.5" /> Notificações ligadas
        </button>
      ) : (
        <button
          type="button"
          onClick={ligar}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <BellOff className="h-3.5 w-3.5" /> Ativar notificações
        </button>
      )}
      {erro && <p className="max-w-xs text-right text-xs text-red-600">{erro}</p>}
    </div>
  );
}
