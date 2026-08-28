// Lê os itens de serviço enviados pelo componente ItensEditor (campos
// item_desc_N / item_qtd_N / item_valor_N / item_tipo_N + itens_count).

export type ItemParseado = {
  descricao: string;
  quantidade: number;
  valorUnit: number;
  valorTotal: number;
  tipoServicoId: string | null;
  ordem: number;
};

export function parseItens(formData: FormData): ItemParseado[] {
  const count = Number(formData.get("itens_count") ?? 0);
  const itens: ItemParseado[] = [];

  for (let i = 0; i < count; i++) {
    const descricao = String(formData.get(`item_desc_${i}`) ?? "").trim();
    if (!descricao) continue;

    const quantidade = Number(formData.get(`item_qtd_${i}`) ?? 1) || 1;
    const valorUnit = Number(formData.get(`item_valor_${i}`) ?? 0) || 0;
    const tipoServicoId = String(formData.get(`item_tipo_${i}`) ?? "").trim() || null;

    itens.push({
      descricao,
      quantidade,
      valorUnit,
      valorTotal: Math.round(quantidade * valorUnit * 100) / 100,
      tipoServicoId,
      ordem: i,
    });
  }

  if (itens.length === 0) {
    throw new Error("Adicione pelo menos um item de serviço com descrição e valor.");
  }

  return itens;
}

export function somaItens(itens: ItemParseado[]): number {
  return Math.round(itens.reduce((soma, it) => soma + it.valorTotal, 0) * 100) / 100;
}
