import type { Prisma } from "@prisma/client";
import { formatarData, formatarMoeda, paraNumero } from "@/lib/format";
import { PrintButton } from "@/components/PrintButton";

type Numerico = number | string | Prisma.Decimal;

type Empresa = {
  nome: string;
  razaoSocial: string | null;
  cnpj: string | null;
  ie: string | null;
  telefones: string | null;
  cidadeUf: string;
};

type Item = {
  descricao: string;
  quantidade: Numerico;
  valorUnit: Numerico;
  valorTotal: Numerico;
};

export function DocumentoImprimivel({
  empresa,
  titulo,
  numero,
  data,
  cliente,
  veiculo,
  itens,
  total,
  observacoes,
  rodape,
}: {
  empresa: Empresa;
  titulo: string;
  numero: string;
  data: Date | string;
  cliente: { nome: string; telefone?: string | null; email?: string | null; endereco?: string | null };
  veiculo?: { modelo: string; placa?: string | null; cor?: string | null; ano?: number | null } | null;
  itens: Item[];
  total: Numerico;
  observacoes?: string | null;
  rodape?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl bg-white p-10 text-slate-900 print:p-0">
      <PrintButton />

      <header className="mb-6 border-b-2 border-slate-900 pb-4 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight">{empresa.nome}</h1>
        {empresa.razaoSocial && <p className="text-sm">{empresa.razaoSocial}</p>}
        <p className="text-xs text-slate-600">
          {[empresa.cnpj && `CNPJ: ${empresa.cnpj}`, empresa.ie && `IE: ${empresa.ie}`]
            .filter(Boolean)
            .join("   ·   ")}
        </p>
        {empresa.telefones && <p className="text-xs text-slate-600">Telefones: {empresa.telefones}</p>}
      </header>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase">{titulo}</h2>
        <div className="text-right text-sm">
          <p className="font-semibold">Nº {numero}</p>
          <p>{empresa.cidadeUf}, {formatarData(data)}</p>
        </div>
      </div>

      <section className="mb-4 grid grid-cols-2 gap-4 rounded-md border border-slate-300 p-3 text-sm">
        <div>
          <p className="font-semibold uppercase text-xs text-slate-500">Cliente</p>
          <p>{cliente.nome}</p>
          {cliente.telefone && <p>Telefone: {cliente.telefone}</p>}
          {cliente.endereco && <p>Endereço: {cliente.endereco}</p>}
        </div>
        <div>
          <p className="font-semibold uppercase text-xs text-slate-500">Veículo</p>
          {veiculo ? (
            <>
              <p>Modelo: {veiculo.modelo}</p>
              <p>Placa: {veiculo.placa ?? "-"}</p>
              <p>
                {veiculo.cor && `Cor: ${veiculo.cor}`} {veiculo.ano && `· Ano: ${veiculo.ano}`}
              </p>
            </>
          ) : (
            <p>-</p>
          )}
        </div>
      </section>

      <table className="mb-4 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-slate-900 text-left">
            <th className="py-2">Descrição</th>
            <th className="py-2 text-right">Qtd.</th>
            <th className="py-2 text-right">Valor unit.</th>
            <th className="py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item, i) => (
            <tr key={i} className="border-b border-slate-200">
              <td className="py-1.5">{item.descricao}</td>
              <td className="py-1.5 text-right">{paraNumero(item.quantidade)}</td>
              <td className="py-1.5 text-right">{formatarMoeda(item.valorUnit)}</td>
              <td className="py-1.5 text-right">{formatarMoeda(item.valorTotal)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-900">
            <td className="py-2 font-bold" colSpan={3}>
              TOTAL
            </td>
            <td className="py-2 text-right font-bold">{formatarMoeda(total)}</td>
          </tr>
        </tfoot>
      </table>

      {observacoes && (
        <p className="mb-4 text-sm">
          <span className="font-semibold">Observações: </span>
          {observacoes}
        </p>
      )}

      {rodape}

      <footer className="mt-10 grid grid-cols-2 gap-8 pt-10 text-center text-sm">
        <div className="border-t border-slate-400 pt-2">Assinatura do cliente</div>
        <div className="border-t border-slate-400 pt-2">{empresa.nome}</div>
      </footer>
    </div>
  );
}
