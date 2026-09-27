import Link from "next/link";
import { MarcaGarageFlow } from "@/components/MarcaGarageFlow";
import { CadastroForm } from "@/components/CadastroForm";
import { cadastroAberto, DIAS_DE_TESTE, NOME_PLATAFORMA, SLOGAN_PLATAFORMA } from "@/lib/marca";

export default function CadastroPage() {
  if (!cadastroAberto()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-dark px-4">
        <div className="w-full max-w-sm rounded-xl bg-white p-8 text-center shadow-xl">
          <h1 className="text-lg font-bold text-slate-900">{NOME_PLATAFORMA}</h1>
          <p className="mt-2 text-sm text-slate-500">O cadastro de novas oficinas ainda não está aberto.</p>
          <Link href="/login" className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline">
            Voltar ao login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-dark px-4 py-8">
      <div className="relative w-full max-w-sm overflow-hidden rounded-xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <MarcaGarageFlow className="mb-2 h-16 w-auto" />
          <p className="mt-1 text-sm text-slate-500">{SLOGAN_PLATAFORMA}</p>
          <p className="mt-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-800">
            {DIAS_DE_TESTE} dias grátis, sem cartão
          </p>
        </div>
        <CadastroForm />
        <p className="mt-4 text-center text-sm text-slate-500">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-brand-700 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
