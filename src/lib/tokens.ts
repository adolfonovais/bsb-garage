import { createHmac, timingSafeEqual } from "node:crypto";

// Tokens assinados (HMAC-SHA256 com AUTH_SECRET) pra links de e-mail:
// confirmação de cadastro e convite de usuário. Sem tabela no banco — o
// próprio link carrega os dados e a validade; "uso único" vem do estado real
// (e-mail já verificado / usuário já criado).

function segredo() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET não configurado.");
  return s;
}

const assinar = (corpo: string) => createHmac("sha256", segredo()).update(corpo).digest("base64url");

export type PayloadToken =
  | { t: "verificar"; uid: string }
  | { t: "convite"; oid: string; email: string; papel: "ADMIN" | "FUNCIONARIO" };

export function criarToken(payload: PayloadToken, validadeSegundos: number): string {
  const corpo = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + validadeSegundos })).toString("base64url");
  return `${corpo}.${assinar(corpo)}`;
}

/** Devolve o payload se a assinatura é válida e não expirou; senão null. */
export function lerToken<T extends PayloadToken["t"]>(
  token: string | undefined,
  tipo: T
): Extract<PayloadToken, { t: T }> | null {
  if (!token) return null;
  const [corpo, assinatura] = token.split(".");
  if (!corpo || !assinatura) return null;
  const esperada = assinar(corpo);
  const a = Buffer.from(assinatura);
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const dados = JSON.parse(Buffer.from(corpo, "base64url").toString("utf8")) as PayloadToken & { exp: number };
    if (dados.t !== tipo || dados.exp < Math.floor(Date.now() / 1000)) return null;
    return dados as unknown as Extract<PayloadToken, { t: T }>;
  } catch {
    return null;
  }
}
