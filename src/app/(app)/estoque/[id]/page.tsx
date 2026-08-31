import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  atualizarPeca,
  excluirMovimentacao,
  excluirPeca,
  registrarMovimentacao,
} from "@/app/(app)/estoque/actions";
import { Button, Card, EmptyState, Field, Input, PageHeader, Select } from "@/components/ui";
import { BotaoCancelarEdicao, EdicaoInline } from "@/components/EdicaoInline";
import { DetailsForm } from "@/components/DetailsForm";
import { formatarData, formatarMoeda, numeroFormatado, paraNumero } from "@/lib/format";
import { AlertTriangle, Trash2 } from "lucide-react";

const UNIDADES = ["un", "m", "m²", "m³", "vb", "kg", "l"];

export default async function PecaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const peca = await prisma.peca.findUnique({
    where: { id },
    include: {
      movimentacoes: {
        orderBy: { data: "desc" },
        include: { os: true },
      },
    },
  });

  if (!peca) notFound();

  const abaixoDoMinimo = paraNumero(peca.quantidadeAtual) < paraNumero(peca.quantidadeMinima);
  const atualizarComId = atualizarPeca.bind(null, peca.id);
  const registrarComId = registrarMovimentacao.bind(null, peca.id);

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title={peca.nome}
        subtitle={`${paraNumero(peca.quantidadeAtual)} ${peca.unidade} em estoque`}
      />

      {abaixoDoMinimo && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Estoque abaixo da quantidade mínima ({paraNumero(peca.quantidadeMinima)} {peca.unidade}).
        </div>
      )}

      <Card className="p-6">
        <EdicaoInline
          visualizacao={
            <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div className="sm:col-span-2">
                <p className="text-xs uppercase text-slate-500">Nome</p>
                <p className="text-slate-900">{peca.nome}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Unidade</p>
                <p className="text-slate-900">{peca.unidade}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Quantidade mínima</p>
                <p className="text-slate-900">{paraNumero(peca.quantidadeMinima)}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Custo unitário</p>
                <p className="text-slate-900">{peca.custoUnitario ? formatarMoeda(peca.custoUnitario) : "-"}</p>
              </div>
            </div>
          }
          formulario={
            <form action={atualizarComId} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Nome *">
                  <Input name="nome" defaultValue={peca.nome} required />
                </Field>
              </div>
              <Field label="Unidade *">
                <Select name="unidade" defaultValue={peca.unidade} required>
                  {UNIDADES.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Quantidade mínima">
                <Input
                  name="quantidadeMinima"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={String(peca.quantidadeMinima)}
                />
              </Field>
              <Field label="Custo unitário">
                <Input
                  name="custoUnitario"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={peca.custoUnitario ? String(peca.custoUnitario) : ""}
                />
              </Field>
              <div className="sm:col-span-2 flex justify-end gap-2">
                <BotaoCancelarEdicao />
                <Button type="submit">Salvar</Button>
              </div>
            </form>
          }
        />
      </Card>

      <Card>
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Movimentações</h2>
        </div>
        {peca.movimentacoes.length === 0 ? (
          <div className="p-4">
            <EmptyState>Nenhuma movimentação registrada ainda.</EmptyState>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Data</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2">Quantidade</th>
                <th className="px-4 py-2">Observação / OS</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {peca.movimentacoes.map((mov) => (
                <tr key={mov.id}>
                  <td className="px-4 py-2">{formatarData(mov.data)}</td>
                  <td className={`px-4 py-2 ${mov.tipo === "ENTRADA" ? "text-emerald-700" : "text-red-700"}`}>
                    {mov.tipo === "ENTRADA" ? "Entrada" : "Saída"}
                  </td>
                  <td className="px-4 py-2">
                    {mov.tipo === "ENTRADA" ? "+" : "-"}
                    {paraNumero(mov.quantidade)} {peca.unidade}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {mov.os ? (
                      <Link href={`/ordens-servico/${mov.os.id}`} className="text-amber-700 hover:underline">
                        OS {numeroFormatado(mov.os.numero, mov.os.ano)}
                      </Link>
                    ) : (
                      mov.observacao ?? "-"
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <form action={excluirMovimentacao.bind(null, peca.id, mov.id)}>
                      <button type="submit" className="text-slate-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <DetailsForm
          resumo="+ Registrar movimentação"
          detailsClassName="border-t border-slate-200 p-4"
          action={registrarComId}
          formClassName="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4"
          limparAoSalvar
        >
          <Field label="Tipo *">
            <Select name="tipo" defaultValue="ENTRADA">
              <option value="ENTRADA">Entrada (compra)</option>
              <option value="SAIDA">Saída (uso avulso)</option>
            </Select>
          </Field>
          <Field label="Quantidade *">
            <Input name="quantidade" type="number" step="0.01" min="0" required />
          </Field>
          <Field label="Data">
            <Input name="data" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          </Field>
          <Field label="Observação">
            <Input name="observacao" placeholder="Opcional" />
          </Field>
          <div className="col-span-2 sm:col-span-4 flex justify-end">
            <Button type="submit">Registrar</Button>
          </div>
        </DetailsForm>
      </Card>

      {peca.custoUnitario && (
        <Card className="p-4 text-sm text-slate-600">
          Valor em estoque: <strong>{formatarMoeda(paraNumero(peca.quantidadeAtual) * paraNumero(peca.custoUnitario))}</strong>
        </Card>
      )}

      <Card className="flex justify-end p-4">
        <form action={excluirPeca.bind(null, peca.id)}>
          <Button type="submit" variant="ghost">
            <Trash2 className="h-4 w-4" /> Excluir item
          </Button>
        </form>
      </Card>
    </div>
  );
}
