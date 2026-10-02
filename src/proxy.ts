// Em Next.js 16 o antigo "middleware.ts" passou a se chamar "proxy.ts" — mesma função.
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  // /imprimir fica fora da checagem daqui: cada página de impressão decide
  // sozinha se autoriza (sessão normal OU um token interno de curta duração
  // pro Chromium headless que gera o PDF pra anexar no WhatsApp — ver
  // src/lib/doc-acesso.ts). Sem isso, o Chromium (sem cookie de sessão)
  // cairia num loop de redirecionamento pro login.
  const isPublicRoute =
    pathname === "/login" ||
    pathname === "/cadastro" ||
    pathname === "/verificar-email" ||
    pathname === "/convite" ||
    pathname.startsWith("/imprimir/") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/whatsapp/webhook");

  if (!isLoggedIn && !isPublicRoute) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && (pathname === "/login" || pathname === "/cadastro")) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  // Roda em todas as rotas exceto assets estáticos do Next.js e arquivos
  // públicos (logo em /brand, fotos das OS em /uploads) — sem isso, a
  // própria logo da tela de login era redirecionada pro login (loop).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|brand/|uploads/).*)"],
};
