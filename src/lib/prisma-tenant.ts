import { prismaBase } from "@/lib/prisma-base";

/**
 * PrismaClient com isolamento multi-tenant (uma organização por cliente da
 * plataforma). Todo acesso passa por aqui e é escopado pela organização da
 * sessão, sem precisar lembrar de filtrar em cada consulta:
 *
 * - leituras/atualizações/exclusões ganham `organizacaoId = <org da sessão>` no where;
 * - criações ganham `organizacaoId` no data;
 * - tabelas-filhas (itens, pagamentos, fotos...) não têm coluna própria e são
 *   filtradas pela organização do pai (ex: pagamento → OS);
 * - ao criar/atualizar apontando pra outro registro por id (clienteId, osId,
 *   oficinaId...), confere que o registro apontado é da mesma organização —
 *   os ids chegam de formulários, então não dá pra confiar neles.
 *
 * Limite conhecido: escritas aninhadas (`itens: { create: [...] }`) não passam
 * por essa conferência de FK — os filhos herdam o pai, que já foi validado.
 *
 * Fora de sessão (login, cadastro, seed) use `prismaBase`.
 */

type Escopo =
  | { tipo: "raiz" } // tem coluna organizacaoId
  | { tipo: "filho"; relacao: string }; // herda a organização do pai

const ESCOPO: Record<string, Escopo> = {
  Usuario: { tipo: "raiz" },
  Cliente: { tipo: "raiz" },
  Veiculo: { tipo: "raiz" },
  TipoServico: { tipo: "raiz" },
  Contador: { tipo: "raiz" },
  Orcamento: { tipo: "raiz" },
  OrdemServico: { tipo: "raiz" },
  OficinaTerceirizada: { tipo: "raiz" },
  RepasseOficina: { tipo: "raiz" },
  Peca: { tipo: "raiz" },
  MovimentacaoEstoque: { tipo: "raiz" },
  ContaFinanceira: { tipo: "raiz" },
  EmpresaConfig: { tipo: "raiz" },
  OrcamentoItem: { tipo: "filho", relacao: "orcamento" },
  OrdemServicoItem: { tipo: "filho", relacao: "os" },
  Pagamento: { tipo: "filho", relacao: "os" },
  FotoOS: { tipo: "filho", relacao: "os" },
  RepasseItem: { tipo: "filho", relacao: "repasse" },
};

// Campos de chave estrangeira (vindos de formulário) que precisam apontar
// pra registros da própria organização: campo → modelo apontado.
const FKS: Record<string, Record<string, string>> = {
  Veiculo: { clienteId: "Cliente" },
  Orcamento: { clienteId: "Cliente", veiculoId: "Veiculo" },
  OrdemServico: {
    clienteId: "Cliente",
    veiculoId: "Veiculo",
    origemOrcamentoId: "Orcamento",
    oficinaTerceirizadaId: "OficinaTerceirizada",
  },
  RepasseOficina: { oficinaId: "OficinaTerceirizada", osId: "OrdemServico" },
  MovimentacaoEstoque: { pecaId: "Peca", osId: "OrdemServico" },
  ContaFinanceira: { osId: "OrdemServico", repasseId: "RepasseOficina" },
  OrcamentoItem: { orcamentoId: "Orcamento", tipoServicoId: "TipoServico" },
  OrdemServicoItem: { osId: "OrdemServico", tipoServicoId: "TipoServico" },
  Pagamento: { osId: "OrdemServico" },
  FotoOS: { osId: "OrdemServico" },
  RepasseItem: { repasseId: "RepasseOficina", itemId: "OrdemServicoItem" },
};

// Nome do delegate no client ("OrdemServico" → "ordemServico").
const delegate = (modelo: string) => modelo.charAt(0).toLowerCase() + modelo.slice(1);

const OPERACOES_COM_WHERE = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "delete",
  "deleteMany",
  "upsert",
]);
const OPERACOES_DE_ESCRITA = new Set([
  "create",
  "createMany",
  "createManyAndReturn",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "upsert",
]);

type Dados = Record<string, unknown>;

function filtroDaOrganizacao(modelo: string, organizacaoId: string): Dados {
  const escopo = ESCOPO[modelo];
  return escopo.tipo === "raiz" ? { organizacaoId } : { [escopo.relacao]: { organizacaoId } };
}

function comOrganizacao(dados: unknown, organizacaoId: string): unknown {
  if (Array.isArray(dados)) return dados.map((d) => ({ ...(d as Dados), organizacaoId }));
  return { ...(dados as Dados), organizacaoId };
}

export function criarPrismaComTenant(organizacaoIdAtual: () => Promise<string>) {
  return prismaBase.$extends({
  name: "isolamento-por-organizacao",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const escopo = ESCOPO[model];
        if (!escopo) {
          throw new Error(`Modelo "${model}" sem regra de isolamento — adicione em src/lib/prisma.ts.`);
        }
        const organizacaoId = await organizacaoIdAtual();
        const a = { ...(args as Dados) };

        if (OPERACOES_COM_WHERE.has(operation)) {
          // Soma o filtro de organização via AND, preservando o where do
          // chamador (inclusive chaves únicas compostas, ex: Contador).
          const whereAtual = (a.where as Dados | undefined) ?? {};
          const andAtual = whereAtual.AND ? (Array.isArray(whereAtual.AND) ? whereAtual.AND : [whereAtual.AND]) : [];
          a.where = { ...whereAtual, AND: [...andAtual, filtroDaOrganizacao(model, organizacaoId)] };
        }

        if (escopo.tipo === "raiz") {
          if (operation === "create" || operation === "createMany" || operation === "createManyAndReturn") {
            a.data = comOrganizacao(a.data, organizacaoId);
          } else if (operation === "upsert") {
            a.create = comOrganizacao(a.create, organizacaoId);
          }
        }

        // Confere as FKs (ids vindos de formulário) antes de escrever.
        if (OPERACOES_DE_ESCRITA.has(operation) && FKS[model]) {
          const fontes: Dados[] = [];
          for (const bloco of [a.data, a.create, a.update]) {
            if (Array.isArray(bloco)) fontes.push(...(bloco as Dados[]));
            else if (bloco) fontes.push(bloco as Dados);
          }
          for (const [campo, modeloAlvo] of Object.entries(FKS[model])) {
            const ids = new Set<string>();
            for (const fonte of fontes) {
              const valor = fonte[campo];
              if (typeof valor === "string") ids.add(valor);
            }
            if (ids.size === 0) continue;
            const encontrados = await (
              prismaBase as unknown as Record<string, { count: (x: unknown) => Promise<number> }>
            )[delegate(modeloAlvo)].count({
              where: { id: { in: [...ids] }, ...filtroDaOrganizacao(modeloAlvo, organizacaoId) },
            });
            if (encontrados !== ids.size) {
              throw new Error(`${campo} não pertence à sua organização.`);
            }
          }
        }

        return query(a);
      },
    },
  },
});
}
