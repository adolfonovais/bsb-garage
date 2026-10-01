import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { formatarData, formatarMoeda, formatarVeiculo } from "@/lib/format";
import { PrintButton } from "@/components/PrintButton";
import type { NfseDados } from "@/lib/nfse-parse";

// Comprovante apresentável da NFS-e pro cliente — o XML oficial (guardado em
// OrdemServico.nfseXml, baixável em "Baixar XML") é o documento fiscal de
// verdade e não muda; esta página só reformata os mesmos dados pra leitura
// humana, no mesmo padrão visual do Orçamento/OS impressos.

type Numerico = number | string | Prisma.Decimal;
type ItemServico = { descricao: string; valorTotal: Numerico };

export function DocumentoNfseImprimivel({
  logoUrl,
  nomeEmpresa,
  enderecoLoja,
  osReferencia,
  chaveAcesso,
  ambiente,
  urlVisualizacao,
  cliente,
  veiculo,
  itens,
  valorTotal,
  dados,
  voltarHref,
}: {
  logoUrl?: string | null;
  nomeEmpresa: string;
  /** Endereço da loja/oficina (Configurações → Dados da empresa) — mostrado no
   * lugar do endereço cadastrado na Receita (geralmente o do escritório), que
   * não é o que o cliente reconhece. Sem CEP: não agrega nada pro cliente aqui. */
  enderecoLoja?: string | null;
  osReferencia: string;
  chaveAcesso: string;
  ambiente: string | null;
  urlVisualizacao: string | null;
  cliente: { nome: string; cpf?: string | null; cnpj?: string | null; telefone?: string | null };
  veiculo?: { modelo: string; placa: string | null } | null;
  itens: ItemServico[];
  valorTotal: number;
  dados: NfseDados;
  voltarHref?: string;
}) {
  const homologacao = ambiente === "homologacao";
  const enderecoPrestador =
    enderecoLoja ||
    [
      dados.prestador.logradouro && `${dados.prestador.logradouro}${dados.prestador.numero ? `, ${dados.prestador.numero}` : ""}`,
      dados.prestador.bairro,
      [dados.prestador.cidade, dados.prestador.uf].filter(Boolean).join(" - "),
    ]
      .filter(Boolean)
      .join(" · ");

  return (
    <div className="relative mx-auto max-w-3xl bg-white p-10 text-slate-900 print:p-0">
      {voltarHref && (
        <Link
          href={voltarHref}
          className="print:hidden fixed left-6 top-6 flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-lg hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
      )}
      <PrintButton />

      {homologacao && (
        <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-center text-xs font-semibold uppercase text-amber-800">
          Ambiente de homologação — documento sem validade fiscal
        </p>
      )}

      <header className="mb-6 flex items-center gap-4 border-b-2 border-slate-900 pb-4">
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- logo, precisa renderizar igual na impressão/PDF
          <img src={logoUrl} alt="" className="h-16 w-auto max-w-[8rem] shrink-0 object-contain" />
        )}
        <div className="flex-1 text-center">
          <h1 className="text-xl font-extrabold tracking-tight">Nota Fiscal de Serviços Eletrônica</h1>
          <p className="text-xs text-slate-500">NFS-e — Padrão Nacional</p>
        </div>
        {logoUrl && <div className="h-16 w-16 shrink-0" aria-hidden />}
      </header>

      <div className="mb-4 flex items-center justify-between text-sm">
        <div>
          <p className="font-semibold">Nº {dados.numero ?? "-"}</p>
          <p className="text-slate-500">
            {dados.dataProcessamento ? `Emitida em ${formatarData(dados.dataProcessamento)}` : ""}
          </p>
        </div>
        <p className="text-right text-slate-500">
          Referente à {osReferencia}
        </p>
      </div>

      <section className="mb-4 rounded-md border border-slate-300 p-3 text-sm">
        <p className="text-xs font-semibold uppercase text-slate-500">Prestador do serviço</p>
        <p className="font-medium">{dados.prestador.nome ?? nomeEmpresa}</p>
        {dados.prestador.cnpj && <p>CNPJ: {dados.prestador.cnpj}</p>}
        {dados.prestador.im && <p>Inscrição Municipal: {dados.prestador.im}</p>}
        {enderecoPrestador && <p className="text-slate-500">{enderecoPrestador}</p>}
      </section>

      <section className="mb-4 rounded-md border border-slate-300 p-3 text-sm">
        <p className="text-xs font-semibold uppercase text-slate-500">Tomador do serviço</p>
        <p className="font-medium">{cliente.nome}</p>
        {cliente.cnpj && <p>CNPJ: {cliente.cnpj}</p>}
        {cliente.cpf && <p>CPF: {cliente.cpf}</p>}
        {cliente.telefone && <p className="text-slate-500">Telefone: {cliente.telefone}</p>}
        {veiculo && <p className="text-slate-500">Veículo: {formatarVeiculo(veiculo)}</p>}
      </section>

      <section className="mb-4 rounded-md border border-slate-300 p-3 text-sm">
        <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Discriminação dos serviços</p>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-left">
              <th className="pb-1">Descrição</th>
              <th className="pb-1 text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="py-1">{item.descricao}</td>
                <td className="py-1 text-right">{formatarMoeda(item.valorTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {dados.tributacaoNacional && (
          <p className="mt-2 text-xs text-slate-500">Tributação nacional: {dados.tributacaoNacional}</p>
        )}
        {dados.tributacaoMunicipal && (
          <p className="text-xs text-slate-500">Tributação municipal: {dados.tributacaoMunicipal}</p>
        )}
      </section>

      <table className="mb-4 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-slate-900 text-left">
            <th className="py-2">Base de cálculo</th>
            <th className="py-2 text-right">Alíquota</th>
            <th className="py-2 text-right">Valor do ISSQN</th>
            <th className="py-2 text-right">Valor líquido</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-slate-200">
            <td className="py-1.5">{dados.valores.baseCalculo != null ? formatarMoeda(dados.valores.baseCalculo) : "-"}</td>
            <td className="py-1.5 text-right">
              {dados.valores.aliquota != null ? `${dados.valores.aliquota.toFixed(2)}%` : "-"}
            </td>
            <td className="py-1.5 text-right">
              {dados.valores.valorIssqn != null ? formatarMoeda(dados.valores.valorIssqn) : "-"}
            </td>
            <td className="py-1.5 text-right">
              {dados.valores.valorLiquido != null ? formatarMoeda(dados.valores.valorLiquido) : "-"}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-900">
            <td className="py-2 font-bold" colSpan={3}>
              VALOR TOTAL DO SERVIÇO
            </td>
            <td className="py-2 text-right font-bold">{formatarMoeda(valorTotal)}</td>
          </tr>
        </tfoot>
      </table>

      {dados.informacoesComplementares && (
        <p className="mb-4 text-xs text-slate-500">{dados.informacoesComplementares}</p>
      )}

      <section className="mt-6 rounded-md border border-slate-300 bg-slate-50 p-3 text-xs">
        <p className="mb-1 flex items-center gap-1.5 font-semibold uppercase text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5" /> Chave de acesso
        </p>
        <p className="break-all font-mono text-sm text-slate-800">{chaveAcesso}</p>
        {urlVisualizacao && (
          <p className="mt-2 text-slate-500">
            Consulte a autenticidade desta NFS-e em:{" "}
            <a href={urlVisualizacao} target="_blank" rel="noopener noreferrer" className="text-brand-700 underline">
              {urlVisualizacao}
            </a>
          </p>
        )}
      </section>
    </div>
  );
}
