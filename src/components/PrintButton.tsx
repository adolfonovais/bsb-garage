"use client";

import { Printer } from "lucide-react";

export function PrintButton({ inline = false }: { inline?: boolean }) {
  return (
    <button
      onClick={() => window.print()}
      className={
        inline
          ? "print:hidden inline-flex items-center justify-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-amber-400"
          : "print:hidden fixed right-6 top-6 flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg hover:bg-amber-400"
      }
    >
      <Printer className="h-4 w-4" /> Imprimir / Salvar PDF
    </button>
  );
}
