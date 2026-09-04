"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, TX_OPTIONS } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { parseItens, somaItens } from "@/lib/itens";
import { proximoNumero } from "@/lib/numero";
import { dataDoFormulario, formatarMoeda, numeroFormatado, paraNumero } from "@/lib/format";
import { salvarFoto, removerFoto } from "@/lib/storage";
import { notificarClienteOSConcluida } from "@/lib/notificacoes";
import { emitirNFSe } from "@/lib/nfse";

const OSSchema = z.object({
  clienteId: z.string().min(1, "Selecione o cliente."),
  veiculoId: z.string().optional(),
  dataEntrada: z.string().optional(),
  dataSaidaPrevista: z.string().optional(),
  formaPagamento: z.string().optional(),
  observacoes: z.string().optional(),
});

export async function criarOS(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const dados = OSSchema.parse({
    clienteId: formData.get("clienteId"),
    veiculoId: formData.get("veiculoId"),
    dataEntrada: formData.get("dataEntrada"),
    dataSaidaPrevista: formData.get("dataSaidaPrevista"),
    formaPagamento: formData.get("formaPagamento"),
    observacoes: formData.get("observacoes"),
  });
  const itens = parseItens(formData);
  const total = somaItens(itens);
  const ano = new Date().getFullYear();

  const os = await prisma.$transaction(async (tx) => {
    const numero = await proximoNumero("OS", ano, tx);
    return tx.ordemServico.create({
      data: {
        numero,
        ano,
        clienteId: dados.clienteId,
        veiculoId: dados.veiculoId || null,
        dataEntrada: dataDoFormulario(dados.dataEntrada) ?? new Date(),
        dataSaidaPrevista: dataDoFormulario(dados.dataSaidaPrevista),
        formaPagamento: dados.formaPagamento || null,
        observacoes: dados.observacoes || null,
        valorTotal: total,
        criadoPorId: session.user.id,
        itens: {
          create: itens.map((item) => ({
            descricao: item.descricao,
            quantidade: item.quantidade,
            valorUnit: item.valorUnit,
            valorTotal: item.valorTotal,
            ordem: item.ordem,
            tipoServicoId: item.tipoServicoId,
          })),
        },
      },
    });
  }, TX_OPTIONS);

  revalidatePath("/ordens-servico");
  redirect(`/ordens-servico/${os.id}`);
}

export type EstadoAtualizarOS = { sucesso?: boolean; erro?: string } | undefined;

export async function atualizarOS(
  osId: string,
  _estado: EstadoAtualizarOS,
  formData: FormData
): Promise<EstadoAtualizarOS> {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const dados = OSSchema.parse({
    clienteId: formData.get("clienteId"),
    veiculoId: formData.get("veiculoId"),
    dataEntrada: formData.get("dataEntrada"),
    dataSaidaPrevista: formData.get("dataSaidaPrevista"),
    formaPagamento: formData.get("formaPagamento"),
    observacoes: formData.get("observacoes"),
  });
  const itens = parseItens(formData);
  const total = somaItens(itens);

  // Não deixa reduzir o valor total pra menos do que o cliente já pagou —
  // senão a OS fica com "saldo a receber" negativo, sem sentido. Devolve
  // como erro de formulário (não lança) pra não cair na página de erro.
  const somaPagamentos = await prisma.pagamento.aggregate({
    where: { osId },
    _sum: { valor: true },
  });
  const totalRecebido = paraNumero(somaPagamentos._sum.valor);
  if (total < totalRecebido - 0.01) {
    return {
      erro: `O novo valor total (${formatarMoeda(total)}) é menor do que o já recebido do cliente (${formatarMoeda(totalRecebido)}). Ajuste os itens ou exclua o pagamento antes de reduzir o valor.`,
    };
  }

  const orcamentoVinculadoId = await prisma.$transaction(async (tx) => {
    await tx.ordemServicoItem.deleteMany({ where: { osId } });
    const osAtualizada = await tx.ordemServico.update({
      where: { id: osId },
      data: {
        clienteId: dados.clienteId,
        veiculoId: dados.veiculoId || null,
        dataEntrada: dataDoFormulario(dados.dataEntrada) ?? new Date(),
        dataSaidaPrevista: dataDoFormulario(dados.dataSaidaPrevista),
        formaPagamento: dados.formaPagamento || null,
        observacoes: dados.observacoes || null,
        valorTotal: total,
        itens: {
          create: itens.map((item) => ({
            descricao: item.descricao,
            quantidade: item.quantidade,
            valorUnit: item.valorUnit,
            valorTotal: item.valorTotal,
            ordem: item.ordem,
            tipoServicoId: item.tipoServicoId,
          })),
        },
      },
    });

    // Se essa OS veio de um orçamento, propaga a edição pra ele também
    // (cliente/veículo/itens/observações — orçamento não tem os campos
    // específicos de OS, como data de entrada e forma de pagamento).
    if (osAtualizada.origemOrcamentoId) {
      await tx.orcamentoItem.deleteMany({ where: { orcamentoId: osAtualizada.origemOrcamentoId } });
      await tx.orcamento.update({
        where: { id: osAtualizada.origemOrcamentoId },
        data: {
          clienteId: dados.clienteId,
          veiculoId: dados.veiculoId || null,
          observacoes: dados.observacoes || null,
          valorTotal: total,
          itens: {
            create: itens.map((item) => ({
              descricao: item.descricao,
              quantidade: item.quantidade,
              valorUnit: item.valorUnit,
              valorTotal: item.valorTotal,
              ordem: item.ordem,
              tipoServicoId: item.tipoServicoId,
            })),
          },
        },
      });
    }

    return osAtualizada.origemOrcamentoId;
  }, TX_OPTIONS);

  revalidatePath(`/ordens-servico/${osId}`);
  revalidatePath("/ordens-servico");
  if (orcamentoVinculadoId) {
    revalidatePath(`/orcamentos/${orcamentoVinculadoId}`);
    revalidatePath("/orcamentos");
  }
  redirect(`/ordens-servico/${osId}`);
}

export async function atualizarStatusOS(osId: string, status: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const os = await prisma.ordemServico.update({
    where: { id: osId },
    data: {
      status: status as never,
      dataSaidaReal: status === "ENTREGUE" ? new Date() : undefined,
    },
    include: { cliente: true },
  });
  revalidatePath(`/ordens-servico/${osId}`);
  revalidatePath("/ordens-servico");

  // Carro entregue na OS também conta como entregue no(s) repasse(s)
  // vinculados a ela — o contrário não vale: marcar o repasse como
  // entregue não muda o status da OS, que é decidido por conta própria.
  if (status === "ENTREGUE") {
    await prisma.repasseOficina.updateMany({
      where: { osId, status: { notIn: ["ENTREGUE", "CANCELADO"] } },
      data: { status: "ENTREGUE" },
    });
    revalidatePath("/repasses");
  }

  // Avisa o cliente quando o carro fica pronto (e-mail hoje, WhatsApp assim
  // que o Maytra for aprovado — ver src/lib/notificacoes.ts). Não trava a
  // atualização de status caso o aviso falhe.
  if (status === "CONCLUIDA") {
    const empresa = await prisma.empresaConfig.findUnique({ where: { id: 1 } });
    await notificarClienteOSConcluida({
      paraEmail: os.cliente.email,
      paraTelefone: os.cliente.telefone,
      nomeCliente: os.cliente.nome,
      numeroOS: numeroFormatado(os.numero, os.ano),
      nomeEmpresa: empresa?.nome ?? "BSB Garage Martelinho de Ouro",
    });
  }
}

export async function excluirOS(osId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  await prisma.ordemServico.delete({ where: { id: osId } });
  revalidatePath("/ordens-servico");
  redirect("/ordens-servico");
}

const PagamentoSchema = z.object({
  data: z.string().optional(),
  descricao: z.string().optional(),
  valor: z.string().min(1, "Informe o valor recebido."),
  formaPagamento: z.string().optional(),
});

export type EstadoFormulario = { sucesso?: boolean } | undefined;

export async function registrarPagamento(
  osId: string,
  _prevState: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const dados = PagamentoSchema.parse({
    data: formData.get("data"),
    descricao: formData.get("descricao"),
    valor: formData.get("valor"),
    formaPagamento: formData.get("formaPagamento"),
  });

  await prisma.pagamento.create({
    data: {
      osId,
      data: dataDoFormulario(dados.data) ?? new Date(),
      descricao: dados.descricao || null,
      valor: Number(dados.valor),
      formaPagamento: dados.formaPagamento || null,
    },
  });
  revalidatePath(`/ordens-servico/${osId}`);
  return { sucesso: true };
}

export async function excluirPagamento(osId: string, pagamentoId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  await prisma.pagamento.delete({ where: { id: pagamentoId } });
  revalidatePath(`/ordens-servico/${osId}`);
}

export async function adicionarFoto(osId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const arquivo = formData.get("foto");
  const tipo = formData.get("tipo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    throw new Error("Selecione uma foto.");
  }
  if (tipo !== "ANTES" && tipo !== "DEPOIS") {
    throw new Error("Tipo de foto inválido.");
  }

  const url = await salvarFoto(`os/${osId}`, arquivo);
  await prisma.fotoOS.create({ data: { osId, url, tipo } });
  revalidatePath(`/ordens-servico/${osId}`);
}

export async function excluirFoto(osId: string, fotoId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const foto = await prisma.fotoOS.delete({ where: { id: fotoId } });
  await removerFoto(foto.url);
  revalidatePath(`/ordens-servico/${osId}`);
}

const UsoPecaSchema = z.object({
  pecaId: z.string().min(1, "Selecione a peça/material."),
  quantidade: z.string().min(1, "Informe a quantidade."),
  // Este formulário não tem campo de observação — .get() volta `null`, não
  // `undefined`, quando o input simplesmente não existe no form.
  observacao: z.string().trim().nullable().optional(),
});

export async function usarPeca(osId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const dados = UsoPecaSchema.parse({
    pecaId: formData.get("pecaId"),
    quantidade: formData.get("quantidade"),
    observacao: formData.get("observacao"),
  });
  const quantidade = Number(dados.quantidade) || 0;

  await prisma.$transaction([
    prisma.movimentacaoEstoque.create({
      data: {
        pecaId: dados.pecaId,
        osId,
        tipo: "SAIDA",
        quantidade,
        observacao: dados.observacao || null,
      },
    }),
    prisma.peca.update({
      where: { id: dados.pecaId },
      data: { quantidadeAtual: { decrement: quantidade } },
    }),
  ], TX_OPTIONS);

  revalidatePath(`/ordens-servico/${osId}`);
  revalidatePath("/estoque");
}

export type EstadoEmissaoNFSe = { sucesso?: boolean; erro?: string } | undefined;

export async function emitirNfseAction(
  osId: string,
  _prevState: EstadoEmissaoNFSe,
  _formData: FormData
): Promise<EstadoEmissaoNFSe> {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const os = await prisma.ordemServico.findUniqueOrThrow({
    where: { id: osId },
    include: { cliente: true, itens: { orderBy: { ordem: "asc" } }, pagamentos: true },
  });

  if (os.nfseChaveAcesso) {
    return { erro: "Esta OS já tem uma NFS-e emitida." };
  }

  // Só emite depois do cliente já ter pago — evita faturar um serviço que
  // ainda não foi recebido.
  const valorTotalOS = paraNumero(os.valorTotal);
  const totalRecebido = os.pagamentos.reduce((soma, p) => soma + paraNumero(p.valor), 0);
  if (totalRecebido < valorTotalOS - 0.01) {
    return {
      erro: `Ainda falta receber ${formatarMoeda(valorTotalOS - totalRecebido)} do cliente. A NFS-e só pode ser emitida depois do pagamento completo — registre o recebimento antes de emitir.`,
    };
  }

  const ano = new Date().getFullYear();
  const numero = await proximoNumero("NFSE", ano);
  const serie = String(ano);
  // "Intermediação de serviços automotivos" reflete a classificação fiscal
  // real (LC 116 item 10.09 — representação comercial): a Primea intermedia
  // entre o cliente e as oficinas terceirizadas, não executa o reparo ela
  // mesma (ver comentário no topo de src/lib/nfse.ts).
  const itensDescricao = os.itens.map((item) => item.descricao).join("; ");
  const descricaoServico = `Intermediação de serviços automotivos${itensDescricao ? ` - ${itensDescricao}` : ""}`;

  try {
    const resultado = await emitirNFSe({
      serie,
      numero,
      valor: Number(os.valorTotal),
      descricaoServico,
      tomador: {
        cpf: os.cliente.cpf,
        nome: os.cliente.nome,
        endereco:
          os.cliente.logradouro && os.cliente.bairro && os.cliente.cep && os.cliente.cidade && os.cliente.uf
            ? {
                logradouro: os.cliente.logradouro,
                numero: os.cliente.numero || "S/N",
                bairro: os.cliente.bairro,
                cep: os.cliente.cep,
                cidade: os.cliente.cidade,
                uf: os.cliente.uf,
              }
            : null,
      },
    });

    await prisma.ordemServico.update({
      where: { id: osId },
      data: {
        nfseChaveAcesso: resultado.chaveAcesso,
        nfseSerie: serie,
        nfseNumero: numero,
        nfseXml: resultado.xml,
        nfseEmitidaEm: new Date(),
        nfseAmbiente: resultado.ambiente,
        nfseErro: null,
        nfseUrlVisualizacao: resultado.urlVisualizacao,
      },
    });
    revalidatePath(`/ordens-servico/${osId}`);
    return { sucesso: true };
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : "Falha desconhecida ao emitir NFS-e.";
    await prisma.ordemServico.update({
      where: { id: osId },
      data: { nfseErro: mensagem },
    });
    revalidatePath(`/ordens-servico/${osId}`);
    return { erro: mensagem };
  }
}

export async function removerUsoPeca(osId: string, movimentacaoId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");

  const mov = await prisma.movimentacaoEstoque.findUniqueOrThrow({ where: { id: movimentacaoId } });

  await prisma.$transaction([
    prisma.movimentacaoEstoque.delete({ where: { id: movimentacaoId } }),
    prisma.peca.update({
      where: { id: mov.pecaId },
      data: { quantidadeAtual: { increment: Number(mov.quantidade) } },
    }),
  ], TX_OPTIONS);

  revalidatePath(`/ordens-servico/${osId}`);
  revalidatePath("/estoque");
}
