import Link from "next/link";
import { Wrench } from "lucide-react";
import { LoginForm } from "@/components/LoginForm";
import { cadastroAberto, NOME_PLATAFORMA } from "@/lib/marca";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500 text-black">
            <Wrench className="h-7 w-7" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">{NOME_PLATAFORMA}</h1>
          <p className="text-sm text-slate-500">Entre para acessar o sistema</p>
        </div>
        <LoginForm callbackUrl={callbackUrl} />
        {cadastroAberto() && (
        <p className="mt-4 text-center text-sm text-slate-500">
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="font-medium text-amber-700 hover:underline">
            Criar conta grátis
          </Link>
        </p>
        )}
      </div>
    </div>
  );
}
