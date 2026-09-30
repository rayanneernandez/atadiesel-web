// =============================================================================
// APP: tela "Nossa Loja" lendo as configurações do painel (tabela store_settings)
//
// 1. Copie este arquivo para  src/hooks/useStoreSettings.ts  (GTHExpress e AtadieselPreview)
// 2. Em app/(tabs)/contato.tsx faça as trocas do final deste arquivo.
// O painel edita em "Configurações"; o app atualiza ao abrir a tela (e em tempo real).
// =============================================================================
import { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';

export type StoreHour = { label: string; closed: boolean; open: string; close: string };

export type StoreSettings = {
  address_line1: string;
  address_line2: string;
  zip: string;
  latitude: number | null;
  longitude: number | null;
  whatsapp: string;          // só números com DDI: 5518999999999
  email: string;
  hours: StoreHour[];
  autonomous_enabled: boolean;
  autonomous_title: string;
  autonomous_text: string;
};

// Valores usados enquanto carrega ou se estiver sem internet
export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  address_line1: 'Alziro Zarur, 820',
  address_line2: 'Araçatuba - SP',
  zip: '',
  latitude: -21.1903,
  longitude: -50.4362,
  whatsapp: '',
  email: '',
  hours: [],
  autonomous_enabled: true,
  autonomous_title: 'Loja Autônoma 24h',
  autonomous_text: 'Nossa loja autônoma funciona 24 horas por dia! Use o QR Code na seção "Autônoma" para entrar.',
};

export function formatWhatsapp(digits: string) {
  let d = String(digits || '').replace(/\D/g, '');
  if (d.startsWith('55') && d.length > 11) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d;
}

export const hourText = (h: StoreHour) => (h.closed ? 'Fechado' : `${h.open} - ${h.close}`);

export function useStoreSettings() {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase
      .from('store_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data) setSettings({ ...DEFAULT_STORE_SETTINGS, ...data, hours: data.hours ?? [] });
        if (active) setLoading(false);
      });

    // Atualiza na hora quando alguém salvar no painel
    const channel = supabase
      .channel('store_settings')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'store_settings' }, (payload: any) => {
        if (active) setSettings({ ...DEFAULT_STORE_SETTINGS, ...payload.new, hours: payload.new.hours ?? [] });
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { settings, loading };
}

/* =============================================================================
   TROCAS EM app/(tabs)/contato.tsx
   =============================================================================

1) Importar o hook (junto dos outros imports):

   import { useStoreSettings, formatWhatsapp, hourText } from '@/src/hooks/useStoreSettings';

2) Apagar as constantes fixas do topo do arquivo:

   const ADDRESS_LINE_1 = "Alziro Zarur , 820";
   const ADDRESS_LINE_2 = "Araçatuba- SP";
   const ADDRESS_ZIP = "";
   const FULL_ADDRESS = `${ADDRESS_LINE_1}, ${ADDRESS_LINE_2}, ${ADDRESS_ZIP}`;

3) No começo de ContatoScreen():

   const { settings } = useStoreSettings();
   const FULL_ADDRESS = [settings.address_line1, settings.address_line2, settings.zip].filter(Boolean).join(', ');
   const lat = settings.latitude ?? -21.1903;
   const lng = settings.longitude ?? -50.4362;

4) handleOpenWhatsapp:

   Linking.openURL(`https://wa.me/${settings.whatsapp}`);

5) Mapa: trocar -21.1903 por {lat} e -50.4362 por {lng} (initialRegion e Marker).

6) Endereço:

   <Text style={styles.addressText}>{settings.address_line1}</Text>
   <Text style={styles.addressText}>{settings.address_line2}</Text>
   {!!settings.zip && <Text style={styles.addressText}>{settings.zip}</Text>}

7) WhatsApp e e-mail:

   <Text style={styles.contactValue}>{formatWhatsapp(settings.whatsapp)}</Text>
   <Text style={styles.contactValue}>{settings.email}</Text>

8) Horário: trocar as 4 linhas fixas (Segunda a Sexta, Sábado, Domingo, Feriados) por:

   {settings.hours.map((h, i) => (
     <React.Fragment key={i}>
       {i > 0 && <View style={styles.dividerLight} />}
       <View style={styles.scheduleRow}>
         <Text style={styles.dayText}>{h.label}</Text>
         <Text style={[styles.hourText, h.closed && { color: '#C62828' }]}>{hourText(h)}</Text>
       </View>
     </React.Fragment>
   ))}

9) Card Loja Autônoma: envolver o card com  {settings.autonomous_enabled && ( ... )}
   e trocar os textos fixos por  {settings.autonomous_title}  e  {settings.autonomous_text}.

O tempo real já é ativado pelo configuracoes_loja.sql do painel
============================================================================= */
