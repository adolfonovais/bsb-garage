import { LoginForm } from "@/components/LoginForm";

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
          {/* eslint-disable-next-line @next/next/no-img-element -- o otimizador de imagem (sharp) não roda nesta arquitetura (Windows ARM64) em dev */}
          <img src="/brand/logo.png" alt="Logo BSB Garage Martelinho de Ouro" width={72} height={72} className="mb-3" />
          <h1 className="text-lg font-bold text-slate-900">BSB Garage Martelinho de Ouro</h1>
          <p className="text-sm text-slate-500">Entre para acessar o sistema</p>
        </div>
        <LoginForm callbackUrl={callbackUrl} />
      </div>
    </div>
  );
}
