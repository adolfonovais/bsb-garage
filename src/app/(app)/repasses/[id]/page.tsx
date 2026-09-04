import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  atualizarRepasse,
  atualizarStatusPagamentoOficina,
  atualizarStatusRepasse,
  excluirRepasse,
} from "@/app/(app)/repasses/actions";
import { Badge, Card, Field, Input, PageHeader, Textarea } from "@/components/ui";
import { BotaoCancelarEdicao, EdicaoInline } from "@/components/EdicaoInline";
import { RepasseVeiculoCampos } from "@/components/RepasseVeiculoCampos";
import {
  formatarData,
  formatarMoeda,
  numeroFormatado,
  paraInputDate,
  paraNumero,
  STATUS_PAGAMENTO_OFICINA_LABEL,
  STATUS_REPASSE_LABEL,
} from "@/lib/format";
import { Trash2 } from "lucide-react";
import { SubmitButton } from "@/components/SubmitButton";
import { buscarOrdensParaRepasse } from "@/lib/repasse-disponibilidade";

export default async function RepasseDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [repasse, oficinas, itensDoRepasse, ordens] = await Promise.all([
    prisma.repasseOficina.findUnique({
      where: { id },
      include: { oficina: true, os: true },
    }),
    // Sem filtro de ativo — se o repasse já aponta pra uma oficina desativada
    // desde então, ela precisa continuar aparecendo como opção selecionada.
    prisma.oficinaTerceirizada.findMany({ orderBy: { nome: "asc" } }),
    prisma.repasseItem.findMany({ where: { repasseId: id }, select: { itemId: true } }),
    // Exclui o próprio repasse da contagem de "já repassado" — editar não
    // pode fazer os itens que ele mesmo já usa sumirem do formulário.
    buscarOrdensParaRepasse(id),
  ]);

  if (!repasse) notFound();

  const atualizarComId = atualizarRepasse.bind(null, repasse.id);

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title={`Repasse — ${repasse.carro}`}
        subtitle={repasse.oficina.nome}
        actions={
          <>
            <Badge status={repasse.status} label={STATUS_REPASSE_LABEL[repasse.status]} />
            <Badge
              status={repasse.statusPagamentoOficina}
              label={STATUS_PAGAMENTO_OFICINA_LABEL[repasse.statusPagamentoOficina]}
            />
          </>
        }
      />

      {repasse.os && (
        <p className="text-sm text-slate-600">
          Vinculado à{" "}
          <Link href={`/ordens-servico/${repasse.os.id}`} className="font-medium text-amber-700 hover:underline">
            OS {numeroFormatado(repasse.os.numero, repasse.os.ano)}
          </Link>
        </p>
      )}

      <Card className="flex flex-wrap items-center gap-3 p-4">
        <span className="text-sm font-medium text-slate-700">Status do serviço:</span>
        {repasse.status !== "ENTREGUE" && (
          <form action={atualizarStatusRepasse.bind(null, repasse.id, "ENTREGUE")}>
            <SubmitButton variant="secondary">
              Marcar entregue
            </SubmitButton>
          </form>
        )}
        {repasse.status !== "CANCELADO" && (
          <form action={atualizarStatusRepasse.bind(null, repasse.id, "CANCELADO")}>
            <SubmitButton variant="ghost">
              Cancelar
            </SubmitButton>
          </form>
        )}
        <span className="ml-4 text-sm font-medium text-slate-700">Pagamento ao prestador:</span>
        {repasse.statusPagamentoOficina !== "PAGO" ? (
          <form action={atualizarStatusPagamentoOficina.bind(null, repasse.id, "PAGO")}>
            <SubmitButton>Marcar como pago</SubmitButton>
          </form>
        ) : (
          <form action={atualizarStatusPagamentoOficina.bind(null, repasse.id, "PENDENTE")}>
            <SubmitButton variant="secondary">
              Marcar como pendente
            </SubmitButton>
          </form>
        )}
      </Card>

      <Card className="p-6">
        <EdicaoInline
          visualizacao={
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase text-slate-500">Prestador</p>
                  <p className="text-slate-900">{repasse.oficina.nome}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500">Carro</p>
                  <p className="text-slate-900">{repasse.carro}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500">Placa</p>
                  <p className="text-slate-900">{repasse.placa || "-"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500">Data de entrada</p>
                  <p className="text-slate-900">{formatarData(repasse.dataEntrada)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500">Data de saída</p>
                  <p className="text-slate-900">{repasse.dataSaida ? formatarData(repasse.dataSaida) : "-"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500">Qtd. peças</p>
                  <p className="text-slate-900">{repasse.qtdPecas}</p>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Tipo de serviço</p>
                <p className="text-slate-900">{repasse.tipoServico}</p>
              </div>
              {repasse.servicoAdicional && (
                <div>
                  <p className="text-xs uppercase text-slate-500">Serviço adicional</p>
                  <p className="text-slate-900">{repasse.servicoAdicional}</p>
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase text-slate-500">Valor cobrado do cliente</p>
                  <p className="text-slate-900">{formatarMoeda(repasse.valorCobrado)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500">Custo cobrado pelo prestador</p>
                  <p className="text-slate-900">{formatarMoeda(repasse.custoOficina)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500">Outros custos</p>
                  <p className="text-slate-900">{repasse.outrosCustos ? formatarMoeda(repasse.outrosCustos) : "-"}</p>
                </div>
              </div>
              <p className="text-slate-900">Inclui polimento: {repasse.polimento ? "Sim" : "Não"}</p>
              <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                <span>
                  Custo total: <strong>{formatarMoeda(repasse.custoTotal)}</strong> · Lucro:{" "}
                  <strong className="text-emerald-700">{formatarMoeda(repasse.lucro)}</strong>
                </span>
              </div>
            </div>
          }
          formulario={
            <form action={atualizarComId} className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <RepasseVeiculoCampos
                  ordens={ordens}
                  oficinas={oficinas}
                  oficinaIdInicial={repasse.oficinaId}
                  osIdInicial={repasse.osId ?? ""}
                  carroInicial={repasse.carro}
                  placaInicial={repasse.placa ?? ""}
                  tipoServicoInicial={repasse.tipoServico}
                  valorCobradoInicial={String(paraNumero(repasse.valorCobrado))}
                  itensSelecionadosIniciais={itensDoRepasse.map((it) => it.itemId)}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Data de entrada *">
                  <Input name="dataEntrada" type="date" defaultValue={paraInputDate(repasse.dataEntrada)} required />
                </Field>
                <Field label="Data de saída">
                  <Input name="dataSaida" type="date" defaultValue={paraInputDate(repasse.dataSaida)} />
                </Field>
                <Field label="Qtd. peças">
                  <Input name="qtdPecas" type="number" min="1" defaultValue={repasse.qtdPecas} />
                </Field>
              </div>

              <Field label="Serviço adicional">
                <Textarea name="servicoAdicional" rows={2} defaultValue={repasse.servicoAdicional ?? ""} />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Custo cobrado pelo prestador *">
                  <Input
                    name="custoOficina"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={String(repasse.custoOficina)}
                    required
                  />
                </Field>
                <Field label="Outros custos">
                  <Input
                    name="outrosCustos"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={repasse.outrosCustos ? String(repasse.outrosCustos) : ""}
                  />
                </Field>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="polimento"
                  defaultChecked={repasse.polimento}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Inclui polimento
              </label>

              <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-sm">
                <span>
                  Custo total: <strong>{formatarMoeda(repasse.custoTotal)}</strong> · Lucro:{" "}
                  <strong className="text-emerald-700">{formatarMoeda(repasse.lucro)}</strong>
                </span>
                <div className="flex gap-2">
                  <BotaoCancelarEdicao />
                  <SubmitButton>Salvar</SubmitButton>
                </div>
              </div>
            </form>
          }
        />
      </Card>

      <Card className="flex justify-end p-4">
        <form action={excluirRepasse.bind(null, repasse.id)}>
          <SubmitButton variant="ghost">
            <Trash2 className="h-4 w-4" /> Excluir repasse
          </SubmitButton>
        </form>
      </Card>
    </div>
  );
}
