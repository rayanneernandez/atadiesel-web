// =============================================================================
// APP: "Minhas compras na loja" — recibos das vendas do ERP do cliente logado
//
// As vendas vêm do ERP (tabela erp_sales, preenchida pela sincronização do painel).
// Cada venda é ligada ao cliente pelo CPF/CNPJ da nota = coluna profiles.cpf.
// A segurança (RLS) já garante que o cliente só recebe as vendas e PDFs dele.
//
// 1. Copie este arquivo para  src/hooks/useMyReceipts.ts
// 2. Use o exemplo de tela do final deste arquivo (ex.: app/(tabs)/minhas-compras.tsx)
//    e coloque um botão "Minhas compras" no Perfil apontando para ela.
// =============================================================================
import { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { supabase } from '@/src/lib/supabase';

export type ReceiptItem = {
  codigo: string; descricao: string; quantidade: number; unidade: string;
  valor_unit: number; desconto: number; total: number;
};

export type Receipt = {
  id: string;
  modelo: string;            // 55 NF-e | 65 NFC-e | 59 CF-e SAT
  numero: string;
  emitted_at: string;
  valor_total: number;
  status_fiscal: string;     // Regular | Cancelado
  itens: ReceiptItem[];
  pagamentos: { forma: string; valor: number }[];
  pdf_path: string | null;
};

export const receiptTypeLabel = (modelo: string) =>
  modelo === '55' ? 'Nota fiscal (NF-e)' : 'Cupom fiscal';

export const money = (v: number) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function useMyReceipts() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('erp_sales')
      .select('id, modelo, numero, emitted_at, valor_total, status_fiscal, itens, pagamentos, pdf_path')
      .order('emitted_at', { ascending: false })
      .limit(100);
    if (error) setError(error.message);
    setReceipts((data as Receipt[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Abre o PDF do recibo (link temporário de 2 minutos)
  const openReceipt = useCallback(async (r: Receipt) => {
    if (!r.pdf_path) return false;
    const { data, error } = await supabase.storage.from('recibos').createSignedUrl(r.pdf_path, 120);
    if (error || !data?.signedUrl) return false;
    await Linking.openURL(data.signedUrl);
    return true;
  }, []);

  return { receipts, loading, error, reload: load, openReceipt };
}

/* =============================================================================
   EXEMPLO DE TELA  (app/(tabs)/minhas-compras.tsx)
   =============================================================================

import React from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useMyReceipts, receiptTypeLabel, money } from '@/src/hooks/useMyReceipts';

export default function MinhasComprasScreen() {
  const { receipts, loading, reload, openReceipt } = useMyReceipts();

  if (loading && !receipts.length) return <ActivityIndicator style={{ marginTop: 40 }} />;

  return (
    <FlatList
      data={receipts}
      keyExtractor={(r) => r.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      ListEmptyComponent={
        <Text style={{ textAlign: 'center', color: '#64748B', marginTop: 40 }}>
          Nenhuma compra encontrada.{'\n'}Informe seu CPF no caixa para seus recibos aparecerem aqui.
        </Text>
      }
      renderItem={({ item }) => (
        <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, opacity: item.status_fiscal === 'Cancelado' ? 0.5 : 1 }}>
          <Text style={{ fontWeight: '700' }}>{receiptTypeLabel(item.modelo)} nº {item.numero}</Text>
          <Text style={{ color: '#64748B' }}>{new Date(item.emitted_at).toLocaleString('pt-BR')}</Text>
          {item.itens.slice(0, 3).map((it, i) => (
            <Text key={i} style={{ color: '#334155' }}>{it.quantidade}x {it.descricao}</Text>
          ))}
          <Text style={{ fontWeight: '700', marginTop: 6 }}>{money(item.valor_total)}</Text>
          {item.status_fiscal === 'Cancelado' && <Text style={{ color: '#C62828' }}>Cancelada</Text>}
          {!!item.pdf_path && (
            <TouchableOpacity onPress={() => openReceipt(item)} style={{ marginTop: 10, backgroundColor: '#0047AB', borderRadius: 8, padding: 10 }}>
              <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>Ver recibo</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    />
  );
}

   O cliente precisa ter o CPF salvo no perfil do app (profiles.cpf) e informar o mesmo
   CPF/CNPJ na hora da compra (cupom com CPF ou NF-e no nome dele).
============================================================================= */
