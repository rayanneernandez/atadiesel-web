import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import logoSmall from './assets/logoso.png';
import logoFull from './assets/logo.png';
import { 
  LayoutDashboard, 
  Package, 
  Star, 
  Users, 
  Truck, 
  Bell, 
  Search, 
  Menu,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  MoreVertical,
  LogOut,
  Plus,
  Edit,
  Trash2,
  Filter as FilterIcon,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  FileText,
  FileSpreadsheet,
  X,
  Camera,
  Info,
  MoreHorizontal,
  Eye,
  MapPin,
  Clock,
  CheckCircle,
  Award,
  Download,
  Upload
} from 'lucide-react';
import LoginScreen from './login';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

// --- DADOS MOCKADOS ---
const topProducts = [
  { id: 1, name: 'Óleo Motor 5W30', sales: 120, price: 4800, growth: '+12%' },
  { id: 2, name: 'Filtro de Ar Esportivo', sales: 85, price: 2125, growth: '+5%' },
  { id: 3, name: 'Kit Pastilha de Freio', sales: 60, price: 5400, growth: '-2%' },
  { id: 4, name: 'Amortecedor Traseiro', sales: 45, price: 11250, growth: '+8%' },
  { id: 5, name: 'Bateria 60Ah', sales: 32, price: 4500, growth: '+15%' },
];

const salesData = [
  { name: 'Jan', vendas: 4000, lucro: 2400 },
  { name: 'Fev', vendas: 3000, lucro: 1398 },
  { name: 'Mar', vendas: 2000, lucro: 9800 },
  { name: 'Abr', vendas: 2780, lucro: 3908 },
  { name: 'Mai', vendas: 1890, lucro: 4800 },
  { name: 'Jun', vendas: 2390, lucro: 3800 },
  { name: 'Jul', vendas: 3490, lucro: 4300 },
];

const categoryData = [
  { name: 'Motor', value: 400 },
  { name: 'Freios', value: 300 },
  { name: 'Suspensão', value: 300 },
  { name: 'Elétrica', value: 200 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const mockDeliveries = [
  { 
    id: 1, 
    client: 'Oficina do Pedro', 
    items: 'Kit Embreagem', 
    itemsList: [
      { name: 'Kit Embreagem Luk', quantity: 1, unitPrice: 450.00 }
    ],
    distance: '2.5km', 
    status: 'Pendente', 
    date: '2024-03-10', 
    value: 450.00, 
    time: 'Há 5 min' 
  },
  { 
    id: 2, 
    client: 'Auto Center Silva', 
    items: '4x Pneus 175/70', 
    itemsList: [
      { name: 'Pneu Pirelli 175/70 R13', quantity: 4, unitPrice: 300.00 }
    ],
    distance: '5.1km', 
    status: 'Em Trânsito', 
    date: '2024-03-09', 
    value: 1200.00, 
    time: 'Há 25 min' 
  },
  { 
    id: 3, 
    client: 'Mecânica Rápida', 
    items: 'Óleo + Filtros', 
    itemsList: [
      { name: 'Óleo Motor 5W30', quantity: 4, unitPrice: 35.00 },
      { name: 'Filtro de Óleo', quantity: 1, unitPrice: 40.00 },
      { name: 'Filtro de Ar', quantity: 1, unitPrice: 70.00 }
    ],
    distance: '1.2km', 
    status: 'Entregue', 
    date: '2024-03-08', 
    value: 250.00, 
    time: 'Há 1 hora' 
  },
  { 
    id: 4, 
    client: 'Posto Ipiranga', 
    items: 'Aditivos', 
    itemsList: [
      { name: 'Aditivo Radiador', quantity: 3, unitPrice: 40.00 },
      { name: 'Limpa Bico', quantity: 2, unitPrice: 30.00 }
    ],
    distance: '8.0km', 
    status: 'Entregue', 
    date: '2024-03-08', 
    value: 180.00, 
    time: 'Ontem' 
  },
  { 
    id: 5, 
    client: 'Oficina Central', 
    items: 'Pastilhas de Freio', 
    itemsList: [
      { name: 'Pastilha Dianteira', quantity: 1, unitPrice: 180.00 },
      { name: 'Pastilha Traseira', quantity: 1, unitPrice: 140.00 }
    ],
    distance: '3.4km', 
    status: 'Pendente', 
    date: '2024-03-10', 
    value: 320.00, 
    time: 'Há 2 horas' 
  },
];

// --- UTILS ---
const HighlightText = ({ text, highlight }) => {
  if (!highlight || !text) return <>{text}</>;
  
  const parts = text.toString().split(new RegExp(`(${highlight})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === highlight.toLowerCase() ? (
          <span key={i} className="bg-yellow-300 text-slate-900 font-bold px-0.5 rounded-sm">{part}</span>
        ) : (
          part
        )
      )}
    </>
  );
};

// --- SUB-TELAS ---

const DashboardScreen = ({ globalSearchTerm, deliveries = [], products = [] }) => {
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10)
  });

  // Cálculos em Tempo Real
  const activeClients = new Set(deliveries.map(d => d.client)).size;
  const totalOrders = deliveries.length;
  const monthlyRevenue = deliveries.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
  const netProfit = monthlyRevenue * 0.30; // Estimativa de 30% de margem

  // Formatação de Moeda
  const formatCurrency = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportConfig, setReportConfig] = useState({
    overview: true,
    products: false,
    deliveries: false,
    deliveriesCompleted: true,
    deliveriesInProgress: true
  });

  const searchTerm = globalSearchTerm?.trim().toLowerCase() || '';

  const filteredTopProducts = topProducts.filter(p =>
    !searchTerm || p.name.toLowerCase().includes(searchTerm)
  );

  const toggleReport = (key) => {
    setReportConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString('pt-BR');

    // Header
    doc.setFillColor(0, 71, 171); // Primary Blue
    doc.rect(0, 0, 210, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text('ATADIESEL - Relatório Gerencial', 14, 13);
    
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${today}`, 14, 30);

    let yPos = 40;

    if (reportConfig.overview) {
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Visão Geral (KPIs)', 14, yPos);
      yPos += 5;
      
      const kpiData = [
        ['Métrica', 'Valor', 'Tendência'],
        ['Clientes Ativos', '1.250', '+12.5%'],
        ['Total de Pedidos', '450', '+8.2%'],
        ['Receita Mensal', 'R$ 125.000,00', '-2.4%'],
        ['Lucro Líquido', 'R$ 32.500,00', '+15.3%']
      ];
      
      autoTable(doc, {
        startY: yPos,
        head: [kpiData[0]],
        body: kpiData.slice(1),
        theme: 'grid',
        headStyles: { fillColor: [0, 71, 171] },
        styles: { fontSize: 10 }
      });
      
      yPos = doc.lastAutoTable.finalY + 15;
    }

    if (reportConfig.products) {
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Estoque e Vendas', 14, yPos);
      yPos += 5;
      
      const productData = topProducts.map(p => [p.name, p.sales, `R$ ${p.price}`, p.growth]);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Produto', 'Vendas', 'Preço', 'Crescimento']],
        body: productData,
        theme: 'striped',
        headStyles: { fillColor: [0, 71, 171] },
        styles: { fontSize: 10 }
      });
      
      yPos = doc.lastAutoTable.finalY + 15;
    }

    if (reportConfig.deliveries) {
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Relatório de Entregas', 14, yPos);
      yPos += 5;
      
      const filteredDeliveries = deliveries.filter(d => {
        if (reportConfig.deliveriesCompleted && d.status === 'Entregue') return true;
        if (reportConfig.deliveriesInProgress && (d.status === 'Em Trânsito' || d.status === 'Pendente' || d.status === 'Em Preparação')) return true;
        return false;
      });

      const deliveryRows = filteredDeliveries.map(d => [d.client, d.items, d.status, d.date, `R$ ${d.value}`]);

      autoTable(doc, {
        startY: yPos,
        head: [['Cliente', 'Itens', 'Status', 'Data', 'Valor']],
        body: deliveryRows,
        theme: 'striped',
        headStyles: { fillColor: [0, 71, 171] },
        styles: { fontSize: 10 }
      });
    }

    doc.save(`relatorio_atadiesel_${today.replace(/\//g, '-')}.pdf`);
  };

  const generateExcel = () => {
    const wb = XLSX.utils.book_new();
    const today = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');

    if (reportConfig.overview) {
      const kpiData = [
        { Metrica: 'Clientes Ativos', Valor: '1.250', Tendencia: '+12.5%' },
        { Metrica: 'Total de Pedidos', Valor: '450', Tendencia: '+8.2%' },
        { Metrica: 'Receita Mensal', Valor: 125000, Tendencia: '-2.4%' },
        { Metrica: 'Lucro Líquido', Valor: 32500, Tendencia: '+15.3%' }
      ];
      const ws = XLSX.utils.json_to_sheet(kpiData);
      XLSX.utils.book_append_sheet(wb, ws, "Visão Geral");
    }

    if (reportConfig.products) {
      const productData = topProducts.map(p => ({
        Produto: p.name,
        Vendas: p.sales,
        Preco: p.price,
        Crescimento: p.growth
      }));
      const ws = XLSX.utils.json_to_sheet(productData);
      XLSX.utils.book_append_sheet(wb, ws, "Produtos");
    }

    if (reportConfig.deliveries) {
      const filteredDeliveries = deliveries.filter(d => {
        if (reportConfig.deliveriesCompleted && d.status === 'Entregue') return true;
        if (reportConfig.deliveriesInProgress && (d.status === 'Em Trânsito' || d.status === 'Pendente' || d.status === 'Em Preparação')) return true;
        return false;
      });

      const deliveryData = filteredDeliveries.map(d => ({
        Cliente: d.client,
        Itens: d.items,
        Status: d.status,
        Data: d.date,
        Valor: d.value
      }));
      const ws = XLSX.utils.json_to_sheet(deliveryData);
      XLSX.utils.book_append_sheet(wb, ws, "Entregas");
    }

    XLSX.writeFile(wb, `relatorio_atadiesel_${today}.xlsx`);
  };

  const handleDownload = (type) => {
    try {
      if (type === 'PDF') {
        generatePDF();
      } else {
        generateExcel();
      }
      setIsReportModalOpen(false);
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      alert("Erro ao gerar relatório. Verifique se as bibliotecas (jspdf, xlsx) estão instaladas.");
    }
  };

  return (
  <div className="space-y-8 animate-fade-in relative">
    {/* Modal de Relatórios */}
    {isReportModalOpen && (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up">
           <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">Gerar Relatórios</h3>
              <button onClick={() => setIsReportModalOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 p-1 rounded-full transition-colors">
                 <X size={20} />
              </button>
           </div>
           
           <div className="p-6 space-y-4">
              <p className="text-sm text-slate-500 mb-2">Selecione os dados que deseja incluir:</p>
              
              <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${reportConfig.overview ? 'border-primary bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50'}`}>
                 <input type="checkbox" checked={reportConfig.overview} onChange={() => toggleReport('overview')} className="rounded text-primary focus:ring-primary w-4 h-4" />
                 <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <LayoutDashboard size={18} className="text-slate-400" /> Visão Geral (KPIs)
                 </div>
              </label>

              <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${reportConfig.products ? 'border-primary bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50'}`}>
                 <input type="checkbox" checked={reportConfig.products} onChange={() => toggleReport('products')} className="rounded text-primary focus:ring-primary w-4 h-4" />
                 <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <Package size={18} className="text-slate-400" /> Estoque de Produtos
                 </div>
              </label>

              <div className={`border rounded-xl p-3 transition-all ${reportConfig.deliveries ? 'border-primary bg-blue-50/50' : 'border-slate-200'}`}>
                 <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={reportConfig.deliveries} onChange={() => toggleReport('deliveries')} className="rounded text-primary focus:ring-primary w-4 h-4" />
                    <div className="flex items-center gap-2 text-slate-700 font-medium">
                       <Truck size={18} className="text-slate-400" /> Relatório de Entregas
                    </div>
                 </label>
                 
                 {reportConfig.deliveries && (
                   <div className="pl-8 mt-3 space-y-2 animate-fade-in border-t border-blue-100/50 pt-2">
                      <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-slate-900">
                         <input type="checkbox" checked={reportConfig.deliveriesCompleted} onChange={() => toggleReport('deliveriesCompleted')} className="rounded text-primary w-3.5 h-3.5" />
                         Concluídas
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-slate-900">
                         <input type="checkbox" checked={reportConfig.deliveriesInProgress} onChange={() => toggleReport('deliveriesInProgress')} className="rounded text-primary w-3.5 h-3.5" />
                         Em Andamento
                      </label>
                   </div>
                 )}
              </div>
           </div>

           <div className="p-6 pt-0 flex gap-3">
              <button onClick={() => handleDownload('PDF')} className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 hover:scale-[1.02] py-3 rounded-xl font-medium transition-all border border-red-100 shadow-sm">
                 <FileText size={20} /> Gerar PDF
              </button>
              <button onClick={() => handleDownload('Excel')} className="flex-1 flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:scale-[1.02] py-3 rounded-xl font-medium transition-all border border-emerald-100 shadow-sm">
                 <FileSpreadsheet size={20} /> Gerar Excel
              </button>
           </div>
        </div>
      </div>
    )}

    {/* Cabeçalho do Dashboard */}
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight font-parkinsans">
          <HighlightText text="Visão Geral" highlight={globalSearchTerm} />
        </h1>
        <p className="text-slate-500 mt-1">
          <HighlightText text="Bem-vindo ao painel de controle da Atadiesel." highlight={globalSearchTerm} />
        </p>
      </div>
      <div className="flex gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm hover:shadow-md transition-all">
             <Calendar size={18} className="text-slate-500" />
             <span className="text-sm font-medium text-slate-600">Período:</span>
             
             <input 
               type="date" 
               value={dateRange.start}
               onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
               className="bg-transparent outline-none text-sm text-slate-600 font-medium cursor-pointer border-b border-transparent hover:border-slate-300 transition-colors"
             />
             <span className="text-slate-400 text-sm">até</span>
             <input 
               type="date" 
               value={dateRange.end}
               onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
               className="bg-transparent outline-none text-sm text-slate-600 font-medium cursor-pointer border-b border-transparent hover:border-slate-300 transition-colors"
             />
          </div>

          <button 
            onClick={() => setIsReportModalOpen(true)}
            className="bg-primary text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 active:scale-95"
          >
            <TrendingUp size={18} /> Relatórios
          </button>
      </div>
    </div>

    {/* Grid de Estatísticas Premium */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard 
        icon={Users} 
        label={<HighlightText text="Clientes Ativos" highlight={globalSearchTerm} />}
        value={<HighlightText text={activeClients.toString()} highlight={globalSearchTerm} />}
        trend="+12.5%" 
        trendUp={true}
        color="blue" 
      />
      <StatCard 
        icon={ShoppingBag} 
        label={<HighlightText text="Total de Pedidos" highlight={globalSearchTerm} />}
        value={<HighlightText text={totalOrders.toString()} highlight={globalSearchTerm} />}
        trend="+8.2%" 
        trendUp={true}
        color="emerald" 
      />
      <StatCard 
        icon={DollarSign} 
        label={<HighlightText text="Receita Total" highlight={globalSearchTerm} />}
        value={<HighlightText text={formatCurrency(monthlyRevenue)} highlight={globalSearchTerm} />}
        trend="-2.4%" 
        trendUp={false}
        color="amber" 
      />
      <StatCard 
        icon={TrendingUp} 
        label={<HighlightText text="Lucro Estimado" highlight={globalSearchTerm} />}
        value={<HighlightText text={formatCurrency(netProfit)} highlight={globalSearchTerm} />}
        trend="+15.3%" 
        trendUp={true}
        color="indigo" 
      />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Gráfico Principal (Area Chart) */}
      <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Fluxo de Caixa</h2>
            <p className="text-sm text-slate-400">Receita vs Lucro nos últimos 7 meses</p>
          </div>
          <button className="p-2 hover:bg-slate-50 rounded-lg transition-colors">
            <MoreVertical size={20} className="text-slate-400" />
          </button>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={salesData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0047AB" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#0047AB" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} tickFormatter={(value) => `R${value/1000}k`} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Area type="monotone" dataKey="vendas" stroke="#0047AB" strokeWidth={3} fillOpacity={1} fill="url(#colorVendas)" />
              <Area type="monotone" dataKey="lucro" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorLucro)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico Secundário (Pie Chart) */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
        <h2 className="text-lg font-bold text-slate-800 mb-6">Categorias</h2>
        <div className="flex-1 min-h-[200px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          {/* Centro do Donut */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <span className="block text-2xl font-bold text-slate-800">1.2k</span>
              <span className="text-xs text-slate-400">Itens</span>
            </div>
          </div>
        </div>
        <div className="mt-6 space-y-3">
          {categoryData.map((item, index) => (
            <div key={item.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                <span className="text-slate-600">{item.name}</span>
              </div>
              <span className="font-semibold text-slate-900">{((item.value / 1200) * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Lista de Produtos Top */}
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">Produtos Mais Vendidos</h2>
        <button className="text-primary text-sm font-medium hover:underline">Ver todos</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold">
            <tr>
              <th className="px-6 py-4">Produto</th>
              <th className="px-6 py-4">Vendas</th>
              <th className="px-6 py-4">Crescimento</th>
              <th className="px-6 py-4">Preço</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTopProducts.map((product) => (
              <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-400">
                    <Package size={16} />
                  </div>
                  {product.name}
                </td>
                <td className="px-6 py-4 text-slate-600">{product.sales} un.</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 ${product.growth.startsWith('+') ? 'text-emerald-600' : 'text-red-600'}`}>
                    {product.growth.startsWith('+') ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {product.growth}
                  </span>
                </td>
                <td className="px-6 py-4 font-medium text-slate-900">
                  R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4">
                  <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md text-xs font-medium border border-emerald-100">
                    Em Estoque
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
  );
};

const ProductsScreen = ({ globalSearchTerm, products, onRefresh }) => {
  const [isCreateProductModalOpen, setIsCreateProductModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  
  // products agora vem das props

  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    promotionalPrice: '',
    stock: '',
    category: '',
    sku: '',
    image: null,
    imageFile: null
  });

  const uniqueCategories = React.useMemo(() => {
    return [...new Set(products.map(p => p.category).filter(Boolean))].sort();
  }, [products]);

  const filteredProducts = products.filter(product => {
    const term = globalSearchTerm?.trim().toLowerCase() || '';
    const matchesSearch =
      !term ||
      (product.name || '').toLowerCase().includes(term) ||
      (product.category || '').toLowerCase().includes(term) ||
      (product.sku || '').toLowerCase().includes(term);

    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(product.category);

    return matchesSearch && matchesCategory;
  });

  const toggleCategory = (category) => {
    setSelectedCategories(prev => {
      const newCategories = prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category];
      return newCategories;
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewProduct(prev => ({ ...prev, [name]: value }));
  };

  const handlePriceChange = (e) => {
    const { name, value } = e.target;
    const rawValue = value.replace(/\D/g, '');

    if (!rawValue) {
      setNewProduct(prev => ({ ...prev, [name]: '' }));
      return;
    }

    const amount = parseFloat(rawValue) / 100;
    const formatted = amount.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    setNewProduct(prev => ({ ...prev, [name]: formatted }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProduct(prev => ({ ...prev, image: reader.result, imageFile: file }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProduct = async () => {
    try {
      let imageUrl = newProduct.image;
      
      // Upload de imagem se houver novo arquivo
      if (newProduct.imageFile) {
        const fileExt = newProduct.imageFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('produtos')
          .upload(fileName, newProduct.imageFile);
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('produtos')
          .getPublicUrl(fileName);
          
        imageUrl = publicUrl;
      }

      const productData = {
        nome: newProduct.name,
        descricao: newProduct.description,
        preco: parseFloat(newProduct.price.replace(/\./g, '').replace(',', '.')),
        preco_promocional: newProduct.promotionalPrice ? parseFloat(newProduct.promotionalPrice.replace(/\./g, '').replace(',', '.')) : null,
        estoque: parseInt(newProduct.stock),
        categoria: newProduct.category,
        sku: newProduct.sku,
        imagem_url: imageUrl
      };

      if (isEditing) {
        const { error } = await supabase.from('produtos').update(productData).eq('id', newProduct.id);
        if (error) throw error;
        alert("Produto atualizado com sucesso!");
      } else {
        const { error } = await supabase.from('produtos').insert([productData]);
        if (error) throw error;
        alert("Produto cadastrado com sucesso!");
      }

      onRefresh(); // Chama atualização no pai
      setIsCreateProductModalOpen(false);
      setIsEditing(false);
      setNewProduct({
          name: '',
          description: '',
          price: '',
          promotionalPrice: '',
          stock: '',
          category: '',
          sku: '',
          image: null,
          imageFile: null
      });

    } catch (error) {
      console.error("Erro ao salvar produto:", error);
      alert(`Erro ao salvar: ${error.message || JSON.stringify(error)}`);
    }
  };

  const handleExportProducts = () => {
    const ws = XLSX.utils.json_to_sheet(products);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produtos");
    XLSX.writeFile(wb, "produtos.xlsx");
  };

  const handleImportProducts = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        const newProducts = data.map((item, index) => ({
             id: Date.now() + index, // Gera novos IDs para evitar conflitos
             name: item.name || item.Nome || '',
             description: item.description || item.Descricao || '',
             price: item.price || item.Preco || 0,
             promotionalPrice: item.promotionalPrice || item.PrecoPromocional || '',
             stock: item.stock || item.Estoque || 0,
             category: item.category || item.Categoria || '',
             sku: item.sku || item.SKU || '',
             image: null // Importação de imagem via excel é complexa, deixamos nulo por enquanto
        }));

        // setProducts(prev => [...prev, ...newProducts]); // Comentado pois state é global
        alert(`${newProducts.length} produtos importados! (Salvar no banco pendente)`);
      };
      reader.readAsBinaryString(file);
    }
  };

  const handleEditProduct = (product) => {
    setNewProduct(product);
    setIsEditing(true);
    setIsCreateProductModalOpen(true);
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este produto?')) {
      const { error } = await supabase.from('produtos').delete().eq('id', id);
      if (error) {
        console.error("Erro ao excluir:", error);
        alert("Erro ao excluir produto.");
      } else {
        onRefresh();
      }
    }
  };

  const handleNewProduct = () => {
    setIsEditing(false);
    setNewProduct({
        name: '',
        description: '',
        price: '',
        promotionalPrice: '',
        stock: '',
        category: '',
        sku: '',
        image: null
    });
    setIsCreateProductModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Modal de Cadastro de Produto */}
      {isCreateProductModalOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsCreateProductModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-up max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                   {isEditing ? 'Editar Produto' : 'Cadastro de Produto'}
                </h3>
                <button onClick={() => setIsCreateProductModalOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 p-1 rounded-full transition-colors">
                   <X size={20} />
                </button>
             </div>
             
             <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                {/* Image Upload */}
                <div className="relative">
                   <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageChange} 
                      className="hidden" 
                      id="product-image-upload"
                   />
                   <label 
                      htmlFor="product-image-upload"
                      className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer group relative overflow-hidden ${newProduct.image ? 'border-primary bg-blue-50/30' : 'border-slate-300 bg-slate-50 hover:border-primary hover:bg-blue-50/50 hover:text-primary text-slate-400'}`}
                   >
                      {newProduct.image ? (
                        <>
                          <img src={newProduct.image} alt="Preview" className="h-48 w-full object-contain mb-4 rounded-lg" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                             <span className="text-white font-bold flex items-center gap-2"><Camera size={20} /> Alterar Imagem</span>
                          </div>
                        </>
                      ) : (
                        <>
                           <Camera size={48} className="mb-2 opacity-50 group-hover:opacity-100 transition-opacity" />
                           <span className="text-sm font-medium">Adicionar Imagem do Produto</span>
                        </>
                      )}
                   </label>
                </div>

                {/* Name */}
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1.5">Nome do Produto</label>
                   <input 
                      type="text" 
                      name="name"
                      value={newProduct.name}
                      onChange={handleInputChange}
                      placeholder="Ex: Óleo Motor 5W30"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-700 placeholder:text-slate-400"
                   />
                </div>

                {/* Description */}
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1.5">Descrição</label>
                   <textarea 
                      name="description"
                      value={newProduct.description}
                      onChange={handleInputChange}
                      placeholder="Detalhes do produto..."
                      rows="3"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-700 resize-none placeholder:text-slate-400"
                   />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {/* Price */}
                   <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Preço Atual</label>
                      <div className="relative">
                         <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">R$</span>
                         <input 
                            type="text" 
                            name="price"
                            value={newProduct.price}
                            onChange={handlePriceChange}
                            placeholder="0,00"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-700 placeholder:text-slate-400"
                         />
                      </div>
                   </div>
                   {/* Promo Price */}
                   <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Preço Promocional</label>
                      <div className="relative">
                         <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">R$</span>
                         <input 
                            type="text" 
                            name="promotionalPrice"
                            value={newProduct.promotionalPrice}
                            onChange={handlePriceChange}
                            placeholder="0,00"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-700 placeholder:text-slate-400"
                         />
                      </div>
                   </div>
                </div>

                {/* Stock */}
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1.5">Estoque</label>
                   <input 
                      type="number" 
                      name="stock"
                      value={newProduct.stock}
                      onChange={handleInputChange}
                      placeholder="0"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-700 placeholder:text-slate-400"
                   />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {/* Category */}
                   <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Categoria</label>
                      <input 
                         type="text" 
                         name="category"
                         value={newProduct.category}
                         onChange={handleInputChange}
                         placeholder="Ex: Óleos"
                         className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-700 placeholder:text-slate-400"
                      />
                   </div>
                   {/* SKU */}
                   <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Código (SKU)</label>
                      <input 
                         type="text" 
                         name="sku"
                         value={newProduct.sku}
                         onChange={handleInputChange}
                         placeholder="XYZ-123"
                         className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-700 placeholder:text-slate-400"
                      />
                   </div>
                </div>
             </div>

             <div className="p-6 border-t border-slate-100 bg-white shrink-0">
                <button 
                   onClick={handleSaveProduct}
                   className="w-full bg-primary text-white font-bold py-4 rounded-xl hover:bg-blue-800 transition-all shadow-lg shadow-blue-500/20 active:scale-[0.99] flex items-center justify-center gap-2 text-lg"
                >
                   Salvar Produto
                </button>
             </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-slate-900 font-parkinsans">Gerenciar Produtos</h1>
        <div className="flex gap-2">
            <button 
                onClick={handleExportProducts} 
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/30 text-sm font-medium"
            >
                <Download size={18} /> Exportar
            </button>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="p-4 border-b border-slate-100 flex justify-end gap-4">
          <div className="relative">
             <button 
                type="button"
                onClick={(e) => {
                   e.stopPropagation();
                   setIsFilterMenuOpen(!isFilterMenuOpen);
                }}
                className={`p-2 border rounded-lg hover:bg-slate-50 transition-colors ${isFilterMenuOpen || selectedCategories.length > 0 ? 'border-primary text-primary bg-blue-50' : 'border-slate-200 text-slate-600'}`}
             >
                <FilterIcon size={20} />
             </button>
             
             {isFilterMenuOpen && (
                <div 
                  className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 z-[100] overflow-hidden animate-fade-in"
                  onClick={(e) => e.stopPropagation()}
                >
                   <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                      <h4 className="font-bold text-slate-700">Filtrar por</h4>
                      {selectedCategories.length > 0 && (
                        <button onClick={() => setSelectedCategories([])} className="text-xs text-red-500 hover:underline">
                           Limpar
                        </button>
                      )}
                   </div>
                   <div className="p-2 max-h-64 overflow-y-auto custom-scrollbar">
                      <p className="px-2 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Categorias</p>
                      {uniqueCategories.length === 0 ? (
                        <div className="p-3 text-sm text-slate-500 text-center">Nenhuma categoria encontrada</div>
                      ) : (
                        uniqueCategories.map(category => (
                           <label key={category} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                              <input 
                                 type="checkbox" 
                                 checked={selectedCategories.includes(category)}
                                 onChange={() => toggleCategory(category)}
                                 className="rounded text-primary focus:ring-primary w-4 h-4"
                              />
                              <span className="text-sm text-slate-700">{category}</span>
                           </label>
                        ))
                      )}
                   </div>
                </div>
             )}
          </div>
        </div>
        <div className="overflow-x-auto rounded-b-xl">
          <table className="w-full text-sm text-left text-slate-500">
          <thead className="text-xs text-slate-700 uppercase bg-slate-50">
            <tr>
              <th className="px-6 py-3">Nome do Produto</th>
              <th className="px-6 py-3">Categoria</th>
              <th className="px-6 py-3">Preço</th>
              <th className="px-6 py-3">Estoque</th>
              <th className="px-6 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => (
              <tr key={product.id} className="bg-white border-b hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-900"><HighlightText text={product.name} highlight={globalSearchTerm} /></td>
                <td className="px-6 py-4"><HighlightText text={product.category} highlight={globalSearchTerm} /></td>
                <td className="px-6 py-4">R$ {product.price}</td>
                <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded ${parseInt(product.stock) > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {parseInt(product.stock) > 0 ? `${product.stock} em Estoque` : 'Sem Estoque'}
                    </span>
                </td>
                <td className="px-6 py-4 flex gap-2">
                  <button onClick={() => handleEditProduct(product)} className="text-blue-600 hover:text-blue-900"><Edit size={18} /></button>
                  <button onClick={() => handleDeleteProduct(product.id)} className="text-red-600 hover:text-red-900"><Trash2 size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};

const HighlightsScreen = ({ globalSearchTerm }) => {
  const [highlights, setHighlights] = useState([]);

  useEffect(() => {
    fetchHighlights();
  }, []);

  const fetchHighlights = async () => {
    const { data, error } = await supabase.from('destaques').select('*').order('criado_em', { ascending: false });
    if (!error) {
      setHighlights(data.map(h => ({
        id: h.id,
        title: h.titulo,
        description: h.descricao,
        expiration: h.valido_ate,
        image: h.banner_url
      })));
    }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [highlightToDelete, setHighlightToDelete] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newHighlight, setNewHighlight] = useState({
    id: null,
    title: '',
    description: '',
    expiration: '',
    image: null,
    imageFile: null
  });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewHighlight(prev => ({ ...prev, image: reader.result, imageFile: file }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveHighlight = async () => {
    try {
      let imageUrl = newHighlight.image;
      
      if (newHighlight.imageFile) {
        const fileExt = newHighlight.imageFile.name.split('.').pop();
        const fileName = `banner_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('banners')
          .upload(fileName, newHighlight.imageFile);
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('banners')
          .getPublicUrl(fileName);
          
        imageUrl = publicUrl;
      }

      const highlightData = {
        titulo: newHighlight.title,
        descricao: newHighlight.description,
        valido_ate: newHighlight.expiration,
        banner_url: imageUrl
      };

      if (isEditing) {
        const { error } = await supabase.from('destaques').update(highlightData).eq('id', newHighlight.id);
        if (error) throw error;
        alert("Destaque atualizado com sucesso!");
      } else {
        const { error } = await supabase.from('destaques').insert([highlightData]);
        if (error) throw error;
        alert("Destaque criado com sucesso!");
      }
      
      fetchHighlights();
      closeModal();
    } catch (error) {
      console.error("Erro ao salvar destaque:", error);
      alert("Erro ao salvar destaque.");
    }
  };

  const handleDeleteHighlight = (id) => {
    setHighlightToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (highlightToDelete) {
      const { error } = await supabase.from('destaques').delete().eq('id', highlightToDelete);
      if (!error) {
         fetchHighlights();
      }
      setIsDeleteModalOpen(false);
      setHighlightToDelete(null);
    }
  };

  const openModal = (highlight = null) => {
    if (highlight) {
      setNewHighlight(highlight);
      setIsEditing(true);
    } else {
      setNewHighlight({ id: null, title: '', description: '', expiration: '', image: null });
      setIsEditing(false);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setNewHighlight({ id: null, title: '', description: '', expiration: '', image: null });
  };

  const filteredHighlights = highlights.filter(h => 
    globalSearchTerm ? h.title.toLowerCase().includes(globalSearchTerm.toLowerCase()) : true
  );

  return (
    <div className="space-y-6">
      {isDeleteModalOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsDeleteModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-up p-6"
            onClick={(e) => e.stopPropagation()}
          >
             <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
                   <Trash2 size={24} />
                </div>
                <h3 className="font-bold text-lg text-slate-800 mb-2">Excluir Destaque</h3>
                <p className="text-slate-500 text-sm mb-6">
                   Tem certeza que deseja remover este destaque? Esta ação não pode ser desfeita.
                </p>
                <div className="flex gap-3 w-full">
                   <button 
                      onClick={() => setIsDeleteModalOpen(false)}
                      className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                   >
                      Cancelar
                   </button>
                   <button 
                      onClick={confirmDelete}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-500/30"
                   >
                      Sim, Excluir
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
          onClick={closeModal}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-lg text-slate-800">
                   {isEditing ? 'Editar Destaque' : 'Novo Destaque'}
                </h3>
                <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 p-1 rounded-full transition-colors">
                   <X size={20} />
                </button>
             </div>
             
             <div className="p-6 space-y-4">
                {/* Image Upload */}
                <div className="relative">
                   <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageChange} 
                      className="hidden" 
                      id="highlight-image-upload"
                   />
                   <label 
                      htmlFor="highlight-image-upload"
                      className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer group relative overflow-hidden ${newHighlight.image ? 'border-primary bg-blue-50/30' : 'border-slate-300 bg-slate-50 hover:border-primary hover:bg-blue-50/50 hover:text-primary text-slate-400'}`}
                   >
                      {newHighlight.image ? (
                        <>
                          <img src={newHighlight.image} alt="Preview" className="h-32 w-full object-cover rounded-lg mb-2" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                             <span className="text-white font-bold flex items-center gap-2"><Camera size={20} /> Alterar Imagem</span>
                          </div>
                        </>
                      ) : (
                        <>
                           <Camera size={32} className="mb-2 opacity-50 group-hover:opacity-100 transition-opacity" />
                           <span className="text-sm font-medium">Imagem do Banner</span>
                        </>
                      )}
                   </label>
                </div>

                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1.5">Título da Promoção</label>
                   <input 
                      type="text" 
                      value={newHighlight.title}
                      onChange={(e) => setNewHighlight({...newHighlight, title: e.target.value})}
                      placeholder="Ex: Promoção de Natal"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-700 placeholder:text-slate-400"
                   />
                </div>

                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1.5">Descrição</label>
                   <textarea 
                      value={newHighlight.description}
                      onChange={(e) => setNewHighlight({...newHighlight, description: e.target.value})}
                      placeholder="Detalhes da promoção..."
                      rows="3"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-700 resize-none placeholder:text-slate-400"
                   />
                </div>

                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1.5">Válido até</label>
                   <input 
                      type="date" 
                      value={newHighlight.expiration}
                      onChange={(e) => setNewHighlight({...newHighlight, expiration: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-700"
                   />
                </div>
             </div>

             <div className="p-6 border-t border-slate-100 bg-white">
                <button 
                   onClick={handleSaveHighlight}
                   className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-blue-800 transition-all shadow-lg shadow-blue-500/20 active:scale-[0.99]"
                >
                   Salvar Destaque
                </button>
             </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 font-parkinsans">Destaques da Loja</h1>
        <button 
          onClick={() => openModal()}
          className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
        >
          <Plus size={20} /> Adicionar Destaque
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {filteredHighlights.map(highlight => (
           <div key={highlight.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden group hover:shadow-md transition-shadow">
              <div className="h-40 bg-slate-200 flex items-center justify-center text-slate-400 overflow-hidden relative">
                {highlight.image ? (
                  <img src={highlight.image} alt={highlight.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <span>Imagem do Banner</span>
                )}
              </div>
              <div className="p-4">
                 <h3 className="font-bold text-slate-900 line-clamp-1">
                   <HighlightText text={highlight.title} highlight={globalSearchTerm} />
                 </h3>
                 <p className="text-xs text-slate-500 mt-1 mb-2 line-clamp-2">{highlight.description}</p>
                 <p className="text-sm text-slate-500 mt-1">Ativo até {new Date(highlight.expiration).toLocaleDateString('pt-BR')}</p>
                 <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
                    <button 
                      onClick={() => openModal(highlight)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                    >
                      <Edit size={14} /> Editar
                    </button>
                    <button 
                      onClick={() => handleDeleteHighlight(highlight.id)}
                      className="text-sm font-medium text-red-600 hover:text-red-800 hover:underline flex items-center gap-1"
                    >
                      <Trash2 size={14} /> Remover
                    </button>
                 </div>
              </div>
           </div>
         ))}
      </div>
    </div>
  );
};

const UsersScreen = ({ globalSearchTerm, session }) => {
  const [users, setUsers] = useState([]);

  // Buscar usuários reais do banco
  useEffect(() => {
    fetchUsers();
  }, [session]);

  const fetchUsers = async () => {
    try {
      // Buscar apenas usuários com role 'admin' na tabela profiles
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'admin')
        .order('name');
        
      if (error) throw error;
      
      const formatted = data.map(u => ({
        id: u.id,
        name: u.name || 'Sem Nome',
        email: u.email,
        role: u.role || 'admin',
        // Status: Só é 'Ativo' se for o usuário logado atual (simplificação visual)
        status: (session?.user?.email === u.email) ? 'Ativo' : 'Inativo', 
        visits: 0, 
        totalSpent: 0,
        lastVisit: '-'
      }));
      setUsers(formatted);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
    }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Administrador'
  });

  const handleSaveUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      alert("Por favor, preencha todos os campos.");
      return;
    }

    try {
      // 1. Criar usuário no Auth (Para permitir login)
      // Nota: Isso pode enviar um email de confirmação dependendo da configuração do Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            full_name: newUser.name,
            role: newUser.role
          }
        }
      });

      if (authError) throw authError;

      // 2. Criar registro na tabela profiles com role 'admin'
      // Usamos upsert para garantir que se o trigger já criou, apenas atualizamos a role
      const { error: dbError } = await supabase.from('profiles').upsert([{
        id: authData.user.id, // Garante vínculo correto com o Auth
        name: newUser.name,
        email: newUser.email,
        role: 'admin'
      }]);

      if (dbError) throw dbError;

      alert("Administrador cadastrado com sucesso!");
      fetchUsers();
      setIsModalOpen(false);
      setNewUser({ name: '', email: '', password: '', role: 'Administrador' });

    } catch (error) {
      console.error("Erro ao criar usuário:", error);
      alert("Erro ao criar administrador: " + (error.message || error.error_description || JSON.stringify(error)));
    }
  };

  const handleViewDetails = (user) => {
    setSelectedUser(user);
    setIsDetailsModalOpen(true);
    setActiveMenuId(null);
  };

  const filteredUsers = users.filter(user => 
    globalSearchTerm ? 
    user.name.toLowerCase().includes(globalSearchTerm.toLowerCase()) || 
    user.email.toLowerCase().includes(globalSearchTerm.toLowerCase()) 
    : true
  );

  return (
    <div className="space-y-6">
      {/* Modal de Criação de Administrador */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-lg text-slate-800">
                   Novo Administrador
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 p-1 rounded-full transition-colors">
                   <X size={20} />
                </button>
             </div>
             
             <div className="p-6 space-y-4">
                <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm flex items-start gap-2">
                   <div className="mt-0.5" title="Use este formulário apenas para novos administradores do painel.">
                     <Info size={16} className="cursor-help" />
                   </div>
                   <p>Este formulário é exclusivo para cadastro de novos administradores. Clientes devem se cadastrar pelo aplicativo.</p>
                </div>

                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1.5">Nome Completo</label>
                   <input 
                      type="text" 
                      value={newUser.name}
                      onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                      placeholder="Ex: Ana Pereira"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-700 placeholder:text-slate-400"
                   />
                </div>

                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1.5">E-mail</label>
                   <input 
                      type="email" 
                      value={newUser.email}
                      onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                      placeholder="Ex: ana@admin.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-700 placeholder:text-slate-400"
                   />
                </div>

                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1.5">Senha Provisória</label>
                   <input 
                      type="password" 
                      value={newUser.password}
                      onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                      placeholder="******"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-700 placeholder:text-slate-400"
                   />
                </div>
                
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1.5">Cargo</label>
                   <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-slate-500 cursor-not-allowed">
                      Administrador
                   </div>
                </div>
             </div>

             <div className="p-6 border-t border-slate-100 bg-white">
                <button 
                   onClick={handleSaveUser}
                   className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-blue-800 transition-all shadow-lg shadow-blue-500/20 active:scale-[0.99]"
                >
                   Criar Administrador
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Usuário */}
      {isDetailsModalOpen && selectedUser && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsDetailsModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                   <Users size={20} className="text-primary" />
                   Detalhes do Usuário
                </h3>
                <button onClick={() => setIsDetailsModalOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 p-1 rounded-full transition-colors">
                   <X size={20} />
                </button>
             </div>
             
             <div className="p-6">
                <div className="flex items-center gap-4 mb-8">
                   <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-2xl border-4 border-white shadow-lg">
                      {selectedUser.name.charAt(0)}
                   </div>
                   <div>
                      <h2 className="text-xl font-bold text-slate-900">{selectedUser.name}</h2>
                      <p className="text-slate-500">{selectedUser.email}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-xs font-medium ${selectedUser.role === 'Administrador' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                         {selectedUser.role}
                      </span>
                   </div>
                </div>

                <div className="space-y-4">
                   <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between group hover:border-blue-200 transition-colors">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-white rounded-lg text-blue-600 shadow-sm">
                            <ShoppingBag size={20} />
                         </div>
                         <span className="text-slate-600 font-medium">Total de Visitas</span>
                      </div>
                      <span className="text-xl font-bold text-slate-900">{selectedUser.visits}</span>
                   </div>

                   <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between group hover:border-emerald-200 transition-colors">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-white rounded-lg text-emerald-600 shadow-sm">
                            <DollarSign size={20} />
                         </div>
                         <span className="text-slate-600 font-medium">Total Gasto</span>
                      </div>
                      <span className="text-xl font-bold text-slate-900">
                         {selectedUser.totalSpent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                   </div>

                   <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between group hover:border-amber-200 transition-colors">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-white rounded-lg text-amber-600 shadow-sm">
                            <Calendar size={20} />
                         </div>
                         <span className="text-slate-600 font-medium">Última Visita</span>
                      </div>
                      <span className="text-lg font-bold text-slate-900">
                         {selectedUser.lastVisit === '-' ? '-' : new Date(selectedUser.lastVisit).toLocaleDateString('pt-BR')}
                      </span>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-900 font-parkinsans">Gestão de Usuários</h1>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
          >
              <Plus size={20} /> Novo Administrador
          </button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-visible">
         <div className="overflow-visible">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm">
                     <th className="px-6 py-4 font-semibold">Nome</th>
                     <th className="px-6 py-4 font-semibold">Email</th>
                     <th className="px-6 py-4 font-semibold">Cargo</th>
                     <th className="px-6 py-4 font-semibold">Status</th>
                     <th className="px-6 py-4 font-semibold text-right">Ações</th>
                  </tr>
               </thead>
               <tbody className="text-sm text-slate-600 divide-y divide-slate-100">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors relative">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs">
                              {user.name.charAt(0)}
                           </div>
                           <HighlightText text={user.name} highlight={globalSearchTerm} />
                        </div>
                      </td>
                      <td className="px-6 py-4"><HighlightText text={user.email} highlight={globalSearchTerm} /></td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${user.role === 'Administrador' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                           {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`flex items-center gap-1.5 ${user.status === 'Ativo' ? 'text-emerald-600' : 'text-slate-400'}`}>
                           <div className={`w-1.5 h-1.5 rounded-full ${user.status === 'Ativo' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                           {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right relative">
                         <div className="relative inline-block text-left">
                           <button 
                             onClick={(e) => {
                               e.stopPropagation();
                               setActiveMenuId(activeMenuId === user.id ? null : user.id);
                             }}
                             className={`p-2 rounded-lg transition-colors ${activeMenuId === user.id ? 'bg-slate-100 text-primary' : 'text-slate-400 hover:text-primary hover:bg-slate-50'}`}
                           >
                              <MoreHorizontal size={20} />
                           </button>

                           {/* Menu Dropdown */}
                           {activeMenuId === user.id && (
                             <>
                               <div 
                                 className="fixed inset-0 z-10" 
                                 onClick={() => setActiveMenuId(null)}
                               ></div>
                               <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-20 overflow-hidden animate-scale-up origin-top-right">
                                  <div className="py-1">
                                     <button
                                       onClick={() => handleViewDetails(user)}
                                       className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                                     >
                                        <Eye size={16} className="text-slate-400" /> 
                                        Ver Detalhes
                                     </button>
                                  </div>
                               </div>
                             </>
                           )}
                         </div>
                      </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
         {filteredUsers.length === 0 && (
            <div className="p-12 text-center text-slate-400">
               <Users size={48} className="mx-auto mb-3 opacity-20" />
               <p>Nenhum usuário encontrado.</p>
            </div>
         )}
      </div>
    </div>
  );
};

const DeliveriesScreen = ({ globalSearchTerm, deliveries = mockDeliveries, onUpdateStatus }) => {
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const statusPriority = {
    'Pendente': 1,
    'Em Preparação': 2,
    'Em Trânsito': 3,
    'Entregue': 4
  };

  const filteredDeliveries = deliveries
    .filter(d => {
      const term = globalSearchTerm?.trim().toLowerCase() || '';
      if (!term) return true;

      return (
        d.client.toLowerCase().includes(term) ||
        d.items.toLowerCase().includes(term) ||
        d.id.toString().includes(term)
      );
    })
    .sort((a, b) => {
      const priorityA = statusPriority[a.status] || 99;
      const priorityB = statusPriority[b.status] || 99;
      return priorityA - priorityB;
    });

  const handleOpenDetails = (delivery) => {
    setSelectedDelivery(delivery);
    setIsDetailsModalOpen(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Entregue': return 'bg-green-100 text-green-800 border-green-200';
      case 'Em Trânsito': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Em Preparação': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'Pendente': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Cancelado': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 font-parkinsans">Controle de Entregas</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDeliveries.map((delivery) => (
           <div key={delivery.id} className={`bg-white p-6 rounded-xl shadow-sm border border-slate-100 border-l-4 ${
             delivery.status === 'Entregue' ? 'border-l-green-500' : 
             delivery.status === 'Em Trânsito' ? 'border-l-amber-500' : 
             delivery.status === 'Em Preparação' ? 'border-l-indigo-500' : 
             'border-l-blue-500'
           }`}>
              <div className="flex justify-between items-start mb-4">
                 <h3 className="font-bold text-slate-900">
                    <HighlightText text={`Pedido #${delivery.id}`} highlight={globalSearchTerm} />
                 </h3>
                 <span className={`text-xs px-2 py-1 rounded border ${getStatusColor(delivery.status)}`}>
                    {delivery.status}
                 </span>
              </div>
              <div className="space-y-2 mb-4">
                <p className="text-sm text-slate-600">
                   <span className="font-medium text-slate-700">Cliente:</span> <HighlightText text={delivery.client} highlight={globalSearchTerm} />
                </p>
                <p className="text-sm text-slate-600">
                   <span className="font-medium text-slate-700">Itens:</span> <HighlightText text={delivery.items} highlight={globalSearchTerm} />
                </p>
                <p className="text-sm text-slate-500">
                   <span className="font-medium text-slate-700">Distância:</span> {delivery.distance}
                </p>
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-50 flex flex-col gap-3">
                 <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900">
                        R$ {delivery.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <button 
                        onClick={() => handleOpenDetails(delivery)}
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                        <Eye size={16} /> Ver Detalhes
                    </button>
                 </div>
                 
                 {/* Action Buttons */}
                 {(delivery.status === 'Pendente' || delivery.status === 'Em Preparação') && (
                    <div className="flex gap-2 w-full">
                       <button 
                           onClick={() => {
                             if(window.confirm('Tem certeza que deseja recusar este pedido?')) {
                               onUpdateStatus(delivery.id, 'Cancelado');
                             }
                           }}
                           className="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-lg transition-colors shadow-sm text-sm border border-red-100"
                       >
                           Recusar
                       </button>
                       <button 
                           onClick={() => onUpdateStatus(delivery.id, 'Em Trânsito')}
                           className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm text-sm"
                       >
                           Enviar para Entrega
                       </button>
                    </div>
                 )}
                 {delivery.status === 'Em Trânsito' && (
                    <div className="w-full py-2 bg-slate-100 text-slate-500 text-xs font-medium rounded-lg text-center italic border border-slate-200">
                        Aguardando confirmação do cliente...
                    </div>
                 )}
                 {delivery.status === 'Cancelado' && (
                    <div className="w-full py-2 bg-red-50 text-red-500 text-xs font-medium rounded-lg text-center border border-red-100">
                        Pedido Recusado
                    </div>
                 )}
              </div>
           </div>
        ))}
      </div>

      {/* Modal de Detalhes */}
      {isDetailsModalOpen && selectedDelivery && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Truck className="text-primary" />
                Detalhes da Entrega #{selectedDelivery.id}
              </h2>
              <button 
                onClick={() => setIsDetailsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Status Banner */}
              <div className={`p-4 rounded-xl border ${getStatusColor(selectedDelivery.status)} flex items-center justify-between`}>
                 <div className="flex items-center gap-3">
                    {selectedDelivery.status === 'Entregue' ? <CheckCircle size={24} /> : <Clock size={24} />}
                    <div>
                       <p className="font-bold text-sm uppercase tracking-wider opacity-80">Status Atual</p>
                       <p className="font-bold text-lg">{selectedDelivery.status}</p>
                    </div>
                 </div>
                 <div className="text-right">
                    <p className="text-xs opacity-80">Atualizado</p>
                    <p className="font-semibold">{selectedDelivery.time}</p>
                 </div>
              </div>

              {/* Informações do Cliente */}
              <div>
                 <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Users size={16} className="text-primary" /> Informações do Cliente
                 </h3>
                 <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-100">
                    <div className="flex justify-between">
                       <span className="text-slate-500 text-sm">Cliente</span>
                       <span className="font-medium text-slate-900">{selectedDelivery.client}</span>
                    </div>
                    <div className="flex justify-between">
                       <span className="text-slate-500 text-sm">Endereço</span>
                       <span className="font-medium text-slate-900 text-right">Rua Exemplo, {selectedDelivery.id}00<br/>Centro, Cidade - UF</span>
                    </div>
                    <div className="flex justify-between">
                       <span className="text-slate-500 text-sm">Distância</span>
                       <span className="font-medium text-slate-900">{selectedDelivery.distance}</span>
                    </div>
                 </div>
              </div>

              {/* Detalhes do Pedido */}
              <div>
                 <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Package size={16} className="text-primary" /> Itens do Pedido
                 </h3>
                 <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                    <div className="max-h-48 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100 text-slate-500 font-medium">
                          <tr>
                            <th className="px-4 py-2 text-left">Item</th>
                            <th className="px-4 py-2 text-center">Qtd</th>
                            <th className="px-4 py-2 text-right">Unit.</th>
                            <th className="px-4 py-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {selectedDelivery.itemsList?.map((item, index) => (
                            <tr key={index} className="hover:bg-slate-100/50">
                              <td className="px-4 py-2 text-slate-900">{item.name}</td>
                              <td className="px-4 py-2 text-center text-slate-600">{item.quantity}</td>
                              <td className="px-4 py-2 text-right text-slate-600">R$ {item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              <td className="px-4 py-2 text-right font-medium text-slate-900">R$ {(item.quantity * item.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="bg-slate-100/50 px-4 py-3 border-t border-slate-200 flex justify-between items-center">
                       <span className="text-slate-600 font-medium">Total do Pedido</span>
                       <span className="text-xl font-bold text-primary">R$ {selectedDelivery.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                 </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end shrink-0 gap-3">
              <button 
                onClick={() => setIsDetailsModalOpen(false)}
                className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium rounded-xl transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- COMPONENTES AUXILIARES ---

const SidebarItem = ({ icon: Icon, label, active, onClick, isOpen }) => (
  <button 
    onClick={onClick}
    title={!isOpen ? label : ''}
    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group relative
    ${active 
      ? 'bg-primary text-white shadow-lg shadow-blue-900/50 font-medium' 
      : 'text-slate-400 hover:bg-white/10 hover:text-white'}
    ${!isOpen ? 'justify-center px-2' : ''} 
    `}
  >
    <Icon size={20} className={`shrink-0 ${active ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
    
    <span className={`tracking-wide whitespace-nowrap overflow-hidden transition-all duration-300 
      ${isOpen ? 'w-auto opacity-100 ml-3' : 'w-0 opacity-0 ml-0 hidden md:block'}`}>
      {label}
    </span>

    {!isOpen && (
      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl">
        {label}
      </div>
    )}
  </button>
);

const StatCard = ({ icon: Icon, label, value, trend, trendUp, color }) => {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  
  const activeColor = colorMap[color] || colorMap.blue;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300 group">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${activeColor} group-hover:scale-110 transition-transform`}>
          <Icon size={24} />
        </div>
        <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
          {trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {trend}
        </div>
      </div>
      <div>
        <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{value}</h3>
        <p className="text-slate-500 text-sm font-medium mt-1">{label}</p>
      </div>
    </div>
  );
};

const LoyaltyScreen = ({ globalSearchTerm }) => {
  const [fidelityType, setFidelityType] = useState('cashback'); // 'cashback' | 'points'
  const [activeTab, setActiveTab] = useState('config'); // 'config' | 'limits' | 'incentives'

  const [config, setConfig] = useState({
    calculationType: 'percentual',
    cashbackValue: 1,
    signupBonus: 0,
    birthdayBonus: 0,
    validityMonths: 117,
    enableAccumulationLock: true,
    accumulationLockLimit: 101,
    minRedemption: 3,
    maxRedemption: 100,
    maxRedemptionsPerDay: 1,
    enableAvailabilityDelay: false,
    availabilityDelayUnit: 'immediate', // 'immediate' | 'hours' | 'days'
    availabilityDelayValue: 0,
    accumulationDuringRedemption: 'no_accumulation', // 'no_accumulation' | 'total' | 'difference'
    enableRetentionProgram: false,
    retentionMultiplier6Months: 10,
    retentionMultiplier9Months: 15,
    retentionMultiplier12Months: 20,
    retentionBonus6Months: 0.50,
    retentionBonus9Months: 0.75,
    retentionBonus12Months: 1.00,
    enableReferralProgram: true,
    referralBonusIndicador: 10,
    referralBonusIndicado: 10,
    fuelTypes: [
      { id: 1, name: 'GASOLINA A COMUM', code: '00001', cashbackPercent: 0, active: true }
    ],
    enableEvaluationBonus: false,
    evaluationBonusType: 'fixed',
    evaluationBonusValue: 5.00,
    evaluationMinStars: 'any'
  });

  const [showToast, setShowToast] = useState(false);

  const handleSave = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-parkinsans">Programa de Fidelidade</h1>
          <p className="text-slate-500 mt-1">Configure como os clientes acumularão benefícios no programa de fidelidade</p>
        </div>
      </div>

      {/* Type Selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button 
          onClick={() => setFidelityType('cashback')}
          className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 ${
            fidelityType === 'cashback' 
              ? 'bg-blue-50 border-blue-500 text-blue-600' 
              : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
          }`}
        >
          <div className={`p-4 rounded-full ${fidelityType === 'cashback' ? 'bg-blue-100' : 'bg-slate-100'}`}>
            <DollarSign size={32} />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-bold mb-1 text-slate-800">Cashback</h3>
            <p className="text-sm opacity-80">Dinheiro de volta</p>
          </div>
        </button>

        <button 
          onClick={() => setFidelityType('points')}
          className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 ${
            fidelityType === 'points' 
              ? 'bg-blue-50 border-blue-500 text-blue-600' 
              : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
          }`}
        >
          <div className={`p-4 rounded-full ${fidelityType === 'points' ? 'bg-blue-100' : 'bg-slate-100'}`}>
            <Star size={32} />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-bold mb-1 text-slate-800">Pontuação</h3>
            <p className="text-sm opacity-80">Sistema de pontos</p>
          </div>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto bg-white rounded-t-xl px-2 pt-2">
        {['Configurações', 'Limites de Resgate', 'Programas de Incentivo'].map((tab) => {
           const key = tab === 'Configurações' ? 'config' : tab === 'Limites de Resgate' ? 'limits' : 'incentives';
           return (
             <button
               key={key}
               onClick={() => setActiveTab(key)}
               className={`px-6 py-3 font-medium text-sm transition-all border-b-2 whitespace-nowrap ${
                 activeTab === key 
                   ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
                   : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
               }`}
             >
               {tab}
             </button>
           );
        })}
      </div>

      {/* Content */}
      <div className="space-y-6 animate-in fade-in duration-300">
        
        {/* Configurações Tab */}
        {activeTab === 'config' && (
          <>
            {/* Configuração de Cashback */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                Configuração de Cashback 
                <Info size={16} className="text-slate-400" />
              </h3>
              <p className="text-slate-500 text-sm mb-6">Defina como o cashback será calculado e distribuído</p>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">Tipo de Cálculo</label>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${config.calculationType === 'percentual' ? 'border-blue-600' : 'border-slate-300 group-hover:border-blue-400'}`}>
                        {config.calculationType === 'percentual' && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                      </div>
                      <input 
                        type="radio" 
                        name="calcType" 
                        checked={config.calculationType === 'percentual'}
                        onChange={() => setConfig({...config, calculationType: 'percentual'})}
                        className="hidden"
                      />
                      <span className="text-slate-700">Percentual</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${config.calculationType === 'fixed' ? 'border-blue-600' : 'border-slate-300 group-hover:border-blue-400'}`}>
                        {config.calculationType === 'fixed' && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                      </div>
                      <input 
                        type="radio" 
                        name="calcType" 
                        checked={config.calculationType === 'fixed'}
                        onChange={() => setConfig({...config, calculationType: 'fixed'})}
                        className="hidden"
                      />
                      <span className="text-slate-700">Valor Fixo</span>
                    </label>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Escolha entre percentual sobre o valor gasto ou valor fixo por compra</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {config.calculationType === 'percentual' ? 'Percentual de Cashback (%)' : 'Valor do Cashback (R$)'}
                  </label>
                  <input 
                    type="number" 
                    value={config.cashbackValue}
                    onChange={(e) => setConfig({...config, cashbackValue: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                  <p className="text-xs text-slate-400 mt-2">
                    {config.calculationType === 'percentual' ? 'Percentual do valor da compra que retorna como cashback' : 'Valor fixo devolvido em cada compra'}
                  </p>
                </div>
              </div>
            </section>

            {/* Bônus */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
               <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                Bônus de Cashback
                <Info size={16} className="text-slate-400" />
              </h3>
              <p className="text-slate-500 text-sm mb-6">Configure bônus especiais em cashback</p>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Bônus de Cadastro (R$)</label>
                  <input 
                    type="number" 
                    value={config.signupBonus}
                    onChange={(e) => setConfig({...config, signupBonus: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                  <p className="text-xs text-slate-400 mt-2">Cashback dado ao cliente no primeiro cadastro</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Bônus de Aniversário (R$)</label>
                  <input 
                    type="number" 
                    value={config.birthdayBonus}
                    onChange={(e) => setConfig({...config, birthdayBonus: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                  <p className="text-xs text-slate-400 mt-2">Cashback dado ao cliente no mês do aniversário</p>
                </div>
              </div>
            </section>

            {/* Validade */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
               <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                Validade do Cashback
                <Info size={16} className="text-slate-400" />
              </h3>
              <p className="text-slate-500 text-sm mb-6">Por quanto tempo o cashback fica disponível</p>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Validade (meses)</label>
                <input 
                  type="number" 
                  value={config.validityMonths}
                  onChange={(e) => setConfig({...config, validityMonths: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
                <p className="text-xs text-slate-400 mt-2">Após este período, o cashback não resgatado expira</p>
              </div>
            </section>

            {/* Trava */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
               <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                Trava de Acúmulo
                <Info size={16} className="text-slate-400" />
              </h3>
              <p className="text-slate-500 text-sm mb-6">Limite para forçar resgate antes de continuar acumulando</p>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-sm font-medium text-slate-800 block">Habilitar Trava</span>
                    <span className="text-xs text-slate-500">Cliente precisa resgatar para continuar acumulando</span>
                  </div>
                  <button 
                    onClick={() => setConfig({...config, enableAccumulationLock: !config.enableAccumulationLock})}
                    className={`w-12 h-6 rounded-full transition-colors relative ${config.enableAccumulationLock ? 'bg-blue-600' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${config.enableAccumulationLock ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                {config.enableAccumulationLock && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Limite para Trava (R$)</label>
                    <input 
                      type="number" 
                      value={config.accumulationLockLimit}
                      onChange={(e) => setConfig({...config, accumulationLockLimit: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                    <p className="text-xs text-slate-400 mt-2">Ao atingir este valor, novas acumulações serão bloqueadas</p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {/* Limites Tab */}
        {activeTab === 'limits' && (
           <>
             {/* Limites de Resgate */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                Limites de Resgate
                <Info size={16} className="text-slate-400" />
              </h3>
              <p className="text-slate-500 text-sm mb-6">Defina valores mínimos e máximos para resgate</p>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Valor Mínimo de Resgate (R$)</label>
                  <input 
                    type="number" 
                    value={config.minRedemption}
                    onChange={(e) => setConfig({...config, minRedemption: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                  <p className="text-xs text-slate-400 mt-2">Valor mínimo de cashback para realizar um resgate</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Valor Máximo de Resgate (R$)</label>
                  <input 
                    type="number" 
                    value={config.maxRedemption}
                    onChange={(e) => setConfig({...config, maxRedemption: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                  <p className="text-xs text-slate-400 mt-2">Valor máximo de cashback por resgate</p>
                </div>
              </div>
            </section>

            {/* Limite de Resgates (24h) */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                Limite de Resgates (24h)
              </h3>
              <p className="text-slate-500 text-sm mb-6">Controle quantos resgates podem ser feitos por dia</p>

              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Máximo de Resgates em 24h</label>
                  <input 
                    type="number" 
                    value={config.maxRedemptionsPerDay}
                    onChange={(e) => setConfig({...config, maxRedemptionsPerDay: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                  <p className="text-xs text-slate-400 mt-2">Número máximo de resgates que um cliente pode fazer em 24 horas</p>
              </div>
            </section>

            {/* Prazo para Disponibilização */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
               <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                Prazo para Disponibilização
               </h3>
               <p className="text-slate-500 text-sm mb-6">Tempo de espera para o saldo ficar disponível para resgate</p>

               <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-sm font-medium text-slate-800 block">Habilitar Prazo</span>
                    <span className="text-xs text-slate-500">Adicionar tempo de espera antes do resgate</span>
                  </div>
                  <button 
                    onClick={() => setConfig({...config, enableAvailabilityDelay: !config.enableAvailabilityDelay})}
                    className={`w-12 h-6 rounded-full transition-colors relative ${config.enableAvailabilityDelay ? 'bg-blue-600' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${config.enableAvailabilityDelay ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                {config.enableAvailabilityDelay && (
                   <div className="animate-in fade-in slide-in-from-top-2 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Unidade de Tempo</label>
                        <select 
                          value={config.availabilityDelayUnit}
                          onChange={(e) => setConfig({...config, availabilityDelayUnit: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none cursor-pointer"
                        >
                          <option value="immediate">Imediato</option>
                          <option value="hours">Horas</option>
                          <option value="days">Dias</option>
                        </select>
                      </div>

                      {config.availabilityDelayUnit !== 'immediate' && (
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                             {config.availabilityDelayUnit === 'hours' ? 'Quantidade de Horas' : 'Quantidade de Dias'}
                          </label>
                          <input 
                            type="number" 
                            min="1"
                            value={config.availabilityDelayValue}
                            onChange={(e) => setConfig({...config, availabilityDelayValue: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                          />
                        </div>
                      )}
                   </div>
                )}
            </section>

             {/* Acúmulo Durante Resgate */}
             <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                Acúmulo Durante Resgate
                <Info size={16} className="text-slate-400" />
              </h3>
              <p className="text-slate-500 text-sm mb-6">Como funciona o acúmulo quando o cliente está usando cashback</p>

              <div className="space-y-4">
                <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:border-blue-500/50 transition-colors group">
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${config.accumulationDuringRedemption === 'no_accumulation' ? 'border-blue-600' : 'border-slate-300 group-hover:border-blue-400'}`}>
                    {config.accumulationDuringRedemption === 'no_accumulation' && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                  </div>
                  <input 
                    type="radio" 
                    name="accumulationRule" 
                    checked={config.accumulationDuringRedemption === 'no_accumulation'}
                    onChange={() => setConfig({...config, accumulationDuringRedemption: 'no_accumulation'})}
                    className="hidden"
                  />
                  <div>
                    <span className="text-slate-800 block font-medium">Sem Acúmulo</span>
                    <span className="text-xs text-slate-500">Cliente não acumula durante o resgate</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:border-blue-500/50 transition-colors group">
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${config.accumulationDuringRedemption === 'total' ? 'border-blue-600' : 'border-slate-300 group-hover:border-blue-400'}`}>
                    {config.accumulationDuringRedemption === 'total' && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                  </div>
                  <input 
                    type="radio" 
                    name="accumulationRule" 
                    checked={config.accumulationDuringRedemption === 'total'}
                    onChange={() => setConfig({...config, accumulationDuringRedemption: 'total'})}
                    className="hidden"
                  />
                   <div>
                    <span className="text-slate-800 block font-medium">Acúmulo Total</span>
                    <span className="text-xs text-slate-500">Acumula normalmente sobre o valor total</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:border-blue-500/50 transition-colors group">
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${config.accumulationDuringRedemption === 'difference' ? 'border-blue-600' : 'border-slate-300 group-hover:border-blue-400'}`}>
                    {config.accumulationDuringRedemption === 'difference' && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                  </div>
                  <input 
                    type="radio" 
                    name="accumulationRule" 
                    checked={config.accumulationDuringRedemption === 'difference'}
                    onChange={() => setConfig({...config, accumulationDuringRedemption: 'difference'})}
                    className="hidden"
                  />
                   <div>
                    <span className="text-slate-800 block font-medium">Acúmulo sobre Diferença</span>
                    <span className="text-xs text-slate-500">Acumula apenas sobre o valor pago (total - resgate)</span>
                  </div>
                </label>
              </div>
            </section>
           </>
        )}

        {/* Programas de Incentivo Tab */}
        {activeTab === 'incentives' && (
           <div className="space-y-6">
              
              {/* Programa de Retenção */}
              <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-full bg-red-500/20 text-red-500">
                      <Award size={16} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Programa de Retenção</h3>
                    <span className="inline-flex items-center" title="Oferece multiplicadores de cashback para clientes que mantêm relacionamento por 6, 9 ou 12 meses.">
                      <Info size={16} className="text-slate-400 cursor-help" />
                    </span>
                  </div>
                  <button 
                    onClick={() => setConfig({...config, enableRetentionProgram: !config.enableRetentionProgram})}
                    className={`w-12 h-6 rounded-full transition-colors relative ${config.enableRetentionProgram ? 'bg-blue-600' : 'bg-slate-200'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${config.enableRetentionProgram ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
                <p className="text-slate-500 text-sm">Ofereça multiplicadores de cashback para clientes que se comprometerem com sua rede</p>

                {config.enableRetentionProgram && (
                  <div className="mt-6 animate-in fade-in slide-in-from-top-4 duration-300">
                    <label className="block text-sm font-medium text-slate-800 mb-3">Multiplicadores de Cashback (%)</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <span className="text-xs text-slate-500 mb-1 block">6 meses</span>
                        <input 
                          type="number" 
                          value={config.retentionMultiplier6Months}
                          onChange={(e) => setConfig({...config, retentionMultiplier6Months: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                        />
                        <p className="text-xs text-slate-500 mt-1">+{config.retentionMultiplier6Months}% de bônus</p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 mb-1 block">9 meses</span>
                        <input 
                          type="number" 
                          value={config.retentionMultiplier9Months}
                          onChange={(e) => setConfig({...config, retentionMultiplier9Months: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                        />
                        <p className="text-xs text-slate-500 mt-1">+{config.retentionMultiplier9Months}% de bônus</p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 mb-1 block">12 meses</span>
                        <input 
                          type="number" 
                          value={config.retentionMultiplier12Months}
                          onChange={(e) => setConfig({...config, retentionMultiplier12Months: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                        />
                        <p className="text-xs text-slate-500 mt-1">+{config.retentionMultiplier12Months}% de bônus</p>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Benefícios de Renovação */}
              <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                   <div className="p-1 rounded-full bg-blue-500/20 text-blue-500">
                      <FileText size={16} />
                   </div>
                   <h3 className="text-lg font-bold text-slate-800">Benefícios de Renovação</h3>
                   <span className="inline-flex items-center" title="Defina bônus extras para clientes que renovarem o compromisso no programa de retenção.">
                     <Info size={16} className="text-slate-400 cursor-help" />
                   </span>
                </div>
                <p className="text-slate-500 text-sm mb-6">Bônus para clientes que renovarem o compromisso de retenção</p>
                
                <label className="block text-sm font-medium text-slate-800 mb-3">Bônus de Renovação em R$</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-xs text-slate-500 mb-1 block">6 meses</span>
                    <input 
                      type="number" 
                      step="0.01"
                      value={config.retentionBonus6Months}
                      onChange={(e) => setConfig({...config, retentionBonus6Months: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    />
                    <p className="text-xs text-slate-500 mt-1">R$ {Number(config.retentionBonus6Months).toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 mb-1 block">9 meses</span>
                    <input 
                      type="number" 
                      step="0.01"
                      value={config.retentionBonus9Months}
                      onChange={(e) => setConfig({...config, retentionBonus9Months: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    />
                    <p className="text-xs text-slate-500 mt-1">R$ {Number(config.retentionBonus9Months).toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 mb-1 block">12 meses</span>
                    <input 
                      type="number" 
                      step="0.01"
                      value={config.retentionBonus12Months}
                      onChange={(e) => setConfig({...config, retentionBonus12Months: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    />
                    <p className="text-xs text-slate-500 mt-1">R$ {Number(config.retentionBonus12Months).toFixed(2)}</p>
                  </div>
                </div>
              </section>

              {/* Programa de Indicação */}
              <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-full bg-purple-500/20 text-purple-500">
                      <Users size={16} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Programa de Indicação</h3>
                    <span className="inline-flex items-center" title="Configure os bônus para quem indica novos clientes e para quem é indicado.">
                      <Info size={16} className="text-slate-400 cursor-help" />
                    </span>
                  </div>
                  <button 
                    onClick={() => setConfig({...config, enableReferralProgram: !config.enableReferralProgram})}
                    className={`w-12 h-6 rounded-full transition-colors relative ${config.enableReferralProgram ? 'bg-blue-600' : 'bg-slate-200'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${config.enableReferralProgram ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
                <p className="text-slate-500 text-sm">Recompense clientes que indicarem novos usuários</p>

                {config.enableReferralProgram && (
                  <div className="mt-6 animate-in fade-in slide-in-from-top-4 duration-300 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-800 mb-2">Bônus Indicador (R$)</label>
                      <input 
                        type="number" 
                        value={config.referralBonusIndicador}
                        onChange={(e) => setConfig({...config, referralBonusIndicador: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      />
                      <p className="text-xs text-slate-500 mt-1">Quem indica recebe</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-800 mb-2">Bônus Indicado (R$)</label>
                      <input 
                        type="number" 
                        value={config.referralBonusIndicado}
                        onChange={(e) => setConfig({...config, referralBonusIndicado: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                      />
                      <p className="text-xs text-slate-500 mt-1">Quem foi indicado recebe</p>
                    </div>
                  </div>
                )}
              </section>

              <h2 className="text-lg font-bold text-slate-800 mt-8">Configurações Avançadas</h2>

              {/* Bonificação por Avaliação */}
              <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                   <div className="p-1 rounded-full bg-blue-500/20 text-blue-500">
                      <Star size={16} />
                   </div>
                   <h3 className="text-lg font-bold text-slate-800">Bonificação por Avaliação</h3>
                </div>
                <p className="text-slate-500 text-sm mb-6">Recompense seus clientes por deixarem avaliações</p>
                
                <div className="space-y-6">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                    <div>
                       <span className="text-slate-800 font-medium block text-sm">Ativar Bonificação</span>
                       <span className="text-xs text-slate-500">Sistema de bonificação {config.enableEvaluationBonus ? 'ativado' : 'desativado'}</span>
                    </div>
                    <button 
                      onClick={() => setConfig({...config, enableEvaluationBonus: !config.enableEvaluationBonus})}
                      className={`w-12 h-6 rounded-full transition-colors relative ${config.enableEvaluationBonus ? 'bg-blue-600' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${config.enableEvaluationBonus ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Modo de Cálculo</label>
                    <select 
                      value={config.evaluationBonusType}
                      onChange={(e) => setConfig({...config, evaluationBonusType: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="fixed">Cashback - Valor Fixo</option>
                      <option value="percentual">Cashback - Percentual</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Valor do Cashback (R$)</label>
                    <input 
                      type="number" 
                      value={config.evaluationBonusValue}
                      onChange={(e) => setConfig({...config, evaluationBonusValue: e.target.value})}
                      placeholder="Ex: 5.00"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Estrelas Mínimas (Opcional)</label>
                    <select 
                      value={config.evaluationMinStars}
                      onChange={(e) => setConfig({...config, evaluationMinStars: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="any">Qualquer avaliação</option>
                      <option value="1">1 estrela ou mais</option>
                      <option value="2">2 estrelas ou mais</option>
                      <option value="3">3 estrelas ou mais</option>
                      <option value="4">4 estrelas ou mais</option>
                      <option value="5">Apenas 5 estrelas</option>
                    </select>
                    <p className="text-xs text-slate-500 mt-2">Bonificação será aplicada para {config.evaluationMinStars === 'any' ? 'qualquer avaliação' : `avaliações com ${config.evaluationMinStars} ou mais estrelas`}, independente das estrelas</p>
                  </div>

                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold text-sm transition-colors w-full md:w-auto">
                    Salvar Configuração
                  </button>
                </div>
              </section>
           </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex justify-end pt-4 border-t border-slate-200">
        <button 
          onClick={handleSave}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
        >
             <CheckCircle size={24} /> Salvar Alterações
        </button>
      </div>

      {/* Toast */}
       {showToast && (
        <div className="fixed top-8 right-8 bg-white border-l-4 border-emerald-500 shadow-2xl rounded-lg p-4 flex items-center gap-4 z-50 animate-in fade-in slide-in-from-top-4 duration-300 max-w-md">
          <div className="bg-emerald-100 p-2 rounded-full text-emerald-600">
            <CheckCircle size={24} />
          </div>
          <div>
            <h4 className="font-bold text-slate-800">Sucesso!</h4>
            <p className="text-sm text-slate-600">Configurações salvas com sucesso.</p>
          </div>
          <button 
            onClick={() => setShowToast(false)} 
            className="text-slate-400 hover:text-slate-600 ml-2 p-1 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
};

// --- APP PRINCIPAL ---

function App() {
  const [session, setSession] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [deliveries, setDeliveries] = useState(mockDeliveries); // Inicializa com mock, depois carrega do Supabase
  const [products, setProducts] = useState([]);

  // Autenticação Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsAuthenticated(!!session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Buscar Entregas do Supabase
  const fetchDeliveries = async () => {
    const { data, error } = await supabase
      .from('entregas')
      .select(`
        *,
        itens_entrega (
          produto_nome,
          quantidade,
          preco_unitario
        )
      `)
      .order('criado_em', { ascending: false });
      
    if (error) {
       console.error('Erro ao buscar entregas:', error);
    } else {
       const formatted = data.map(d => ({
          id: d.id,
          client: d.cliente_nome || 'Cliente',
          items: d.itens_entrega.map(i => i.produto_nome).join(', '),
          itemsList: d.itens_entrega.map(i => ({
              name: i.produto_nome,
              quantity: i.quantidade,
              unitPrice: i.preco_unitario
          })),
          distance: d.distancia || '0km',
          status: d.status,
          date: new Date(d.criado_em).toLocaleDateString('pt-BR'),
          value: d.valor_total,
          time: new Date(d.criado_em).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}),
          statusTimestamp: new Date(d.atualizado_em).getTime()
       }));
       setDeliveries(formatted.length > 0 ? formatted : mockDeliveries);
    }
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase.from('produtos').select('*').order('criado_em', { ascending: false });
    if (error) {
      console.error("Erro ao buscar produtos:", error);
    } else {
      setProducts(data.map(p => ({
        id: p.id,
        name: p.nome,
        description: p.descricao,
        price: p.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        promotionalPrice: p.preco_promocional ? p.preco_promocional.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '',
        stock: p.estoque,
        category: p.categoria,
        sku: p.sku,
        image: p.imagem_url
      })));
    }
  };

  useEffect(() => {
    if (session) {
      fetchDeliveries();
      fetchProducts();
      
      const channel = supabase
        .channel('entregas_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'entregas' }, () => {
           fetchDeliveries();
        })
        .subscribe();
      
      const productsChannel = supabase
        .channel('produtos_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'produtos' }, () => {
           fetchProducts();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(productsChannel);
      }
    }
  }, [session]);

  const handleUpdateDeliveryStatus = async (id, newStatus) => {
    // Atualização Otimista
    setDeliveries(prev => prev.map(d => d.id === id ? { 
      ...d, 
      status: newStatus,
      statusTimestamp: newStatus === 'Em Trânsito' ? Date.now() : d.statusTimestamp 
    } : d));

    const { error } = await supabase
      .from('entregas')
      .update({ 
        status: newStatus,
        atualizado_em: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error("Erro ao atualizar status:", error);
      fetchDeliveries(); // Reverte em caso de erro
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const TWO_HOURS = 2 * 60 * 60 * 1000;
      
      setDeliveries(prev => {
        const hasUpdates = prev.some(d => 
          d.status === 'Em Trânsito' && 
          d.statusTimestamp && 
          (now - d.statusTimestamp > TWO_HOURS)
        );

        if (!hasUpdates) return prev;

        return prev.map(d => {
          if (d.status === 'Em Trânsito' && d.statusTimestamp && (now - d.statusTimestamp > TWO_HOURS)) {
            return { ...d, status: 'Entregue' };
          }
          return d;
        });
      });
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const deliveryRequests = deliveries.filter(d => d.status === 'Pendente' || d.status === 'Em Preparação' || d.status === 'Em Trânsito');

  const renderContent = () => {
    switch (activeTab) {
      case 'Dashboard': return <DashboardScreen globalSearchTerm={globalSearchTerm} deliveries={deliveries} products={products} />;
      case 'Produtos': return <ProductsScreen globalSearchTerm={globalSearchTerm} products={products} onRefresh={fetchProducts} />;
      case 'Destaques': return <HighlightsScreen globalSearchTerm={globalSearchTerm} />;
      case 'Usuários': return <UsersScreen globalSearchTerm={globalSearchTerm} session={session} />;
      case 'Entregas': return <DeliveriesScreen globalSearchTerm={globalSearchTerm} deliveries={deliveries} onUpdateStatus={handleUpdateDeliveryStatus} />;
      case 'Fidelidade': return <LoyaltyScreen globalSearchTerm={globalSearchTerm} />;
      default: return <DashboardScreen globalSearchTerm={globalSearchTerm} deliveries={deliveries} products={products} />;
    }
  };

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      
      {/* Sidebar Escura */}
      <aside 
        className={`fixed md:relative z-30 h-full bg-slate-900 border-r border-slate-800 transition-all duration-300 flex flex-col shadow-2xl
        ${isSidebarOpen ? 'w-72 translate-x-0' : 'w-72 -translate-x-full md:w-20 md:translate-x-0'}`}
      >
        <div className="h-24 flex items-center justify-center border-b border-slate-800/50 p-4">
          <div className="flex items-center gap-3 text-white font-bold text-xl overflow-hidden w-full">
             <div className="flex items-center justify-center w-full transition-all duration-300">
                {isSidebarOpen ? (
                  <img src={logoFull} alt="Atadiesel" className="h-14 w-auto object-contain transition-all hover:scale-105" />
                ) : (
                  <img src={logoSmall} alt="Atadiesel" className="h-10 w-auto object-contain transition-all hover:scale-110" />
                )}
             </div>
          </div>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-700">
          <SidebarItem icon={LayoutDashboard} label="Visão Geral" active={activeTab === 'Dashboard'} onClick={() => setActiveTab('Dashboard')} isOpen={isSidebarOpen} />
          <SidebarItem icon={Package} label="Produtos" active={activeTab === 'Produtos'} onClick={() => setActiveTab('Produtos')} isOpen={isSidebarOpen} />
          <SidebarItem icon={Star} label="Destaques" active={activeTab === 'Destaques'} onClick={() => setActiveTab('Destaques')} isOpen={isSidebarOpen} />
          <SidebarItem icon={Award} label="Fidelidade" active={activeTab === 'Fidelidade'} onClick={() => setActiveTab('Fidelidade')} isOpen={isSidebarOpen} />
          <SidebarItem icon={Users} label="Usuários" active={activeTab === 'Usuários'} onClick={() => setActiveTab('Usuários')} isOpen={isSidebarOpen} />
          <SidebarItem icon={Truck} label="Entregas" active={activeTab === 'Entregas'} onClick={() => setActiveTab('Entregas')} isOpen={isSidebarOpen} />
        </nav>

        <div className="p-4 border-t border-slate-800/50">
           <button className={`flex items-center gap-3 text-slate-400 hover:text-red-400 hover:bg-white/5 px-4 py-3 w-full transition-colors rounded-xl ${!isSidebarOpen && 'justify-center'}`}>
              <LogOut size={20} />
              <span className={`${isSidebarOpen ? 'block' : 'hidden'} font-medium`}>Sair</span>
           </button>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-100">
        
        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-8 shrink-0 shadow-sm z-20">
          <div className="flex items-center gap-4">
            <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
            >
                <Menu size={24} />
            </button>
            
            {/* Logo Header */}
            <div className="ml-2">
              <img src={logoSmall} alt="Atadiesel" className="h-10 w-auto object-contain" />
            </div>
            
            <div className="hidden md:flex items-center bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 w-64 lg:w-96 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                <Search size={20} className="text-slate-400 mr-2" />
                <input 
                type="text" 
                placeholder="Buscar..." 
                value={globalSearchTerm}
                onChange={(e) => setGlobalSearchTerm(e.target.value)}
                className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400"
                />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <Bell size={20} className="text-slate-600" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white animate-pulse"></span>
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-full mt-4 w-80 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-fade-in origin-top-right ring-1 ring-black/5">
                   <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <h3 className="font-bold text-slate-800 text-sm">Solicitações de Entrega</h3>
                      <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">{deliveryRequests.length} NOVAS</span>
                   </div>
                   <div className="max-h-[350px] overflow-y-auto">
                      {deliveryRequests.map((req) => (
                        <div key={req.id} className="p-4 hover:bg-slate-50 transition-colors border-b border-slate-50 group cursor-pointer relative">
                            <div className="flex justify-between items-start mb-1">
                               <p className="font-semibold text-slate-900 text-sm">{req.client}</p>
                               <span className="text-[10px] text-slate-400 font-medium">{req.time}</span>
                            </div>
                            <p className="text-xs text-slate-500 mb-2">Solicitou: <span className="text-slate-700 font-medium">{req.items}</span></p>
                            <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                               <Truck size={12} />
                               <span>Distância: {req.distance}</span>
                            </div>
                            <div className="flex gap-2">
                               <button className="flex-1 bg-primary text-white text-xs font-semibold py-1.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/30">
                                 Aceitar
                               </button>
                               <button className="flex-1 bg-white border border-slate-200 text-slate-600 text-xs font-semibold py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                                 Recusar
                               </button>
                            </div>
                        </div>
                      ))}
                   </div>
                   <div className="p-3 bg-slate-50 text-center border-t border-slate-100">
                      <button 
                        className="text-xs font-bold text-primary hover:text-blue-700 transition-colors" 
                        onClick={() => { setActiveTab('Entregas'); setShowNotifications(false); }}
                      >
                        Ver Todas as Entregas
                      </button>
                   </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-900">Administrador</p>
                <p className="text-xs text-slate-500">Auto Peças</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg shadow-sm border-2 border-slate-100">
                A
              </div>
            </div>
          </div>
        </header>

        {/* Área de Scroll */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-100">
          <div className="max-w-7xl mx-auto pb-8">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;