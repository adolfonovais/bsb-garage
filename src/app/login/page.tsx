import Link from "next/link";
import { MarcaGarageFlow } from "@/components/MarcaGarageFlow";
import { LoginForm } from "@/components/LoginForm";
import { cadastroAberto } from "@/lib/marca";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-dark px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <MarcaGarageFlow className="mb-2 h-16 w-auto" />
          <p className="text-sm text-slate-500">Entre para acessar o sistema</p>
        </div>
        <LoginForm callbackUrl={callbackUrl} />
        {cadastroAberto() && (
        <p className="mt-4 text-center text-sm text-slate-500">
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="font-medium text-brand-700 hover:underline">
            Criar conta grátis
          </Link>
        </p>
        )}
      </div>
    </div>
  );
}
