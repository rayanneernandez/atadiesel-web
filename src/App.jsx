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
  Upload,
  AlertCircle,
  Megaphone,
  ClipboardList,
  Settings2,
  Mail,
  Smartphone
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
  { id: 6, name: 'Vela de Ignição Iridium', sales: 28, price: 320, growth: '+4%' },
  { id: 7, name: 'Correia Dentada', sales: 25, price: 180, growth: '-1%' },
  { id: 8, name: 'Bomba de Água', sales: 22, price: 450, growth: '+6%' },
  { id: 9, name: 'Disco de Freio', sales: 20, price: 890, growth: '+3%' },
  { id: 10, name: 'Filtro de Óleo', sales: 18, price: 45, growth: '+2%' },
  { id: 11, name: 'Fluido de Freio DOT4', sales: 15, price: 35, growth: '+1%' },
  { id: 12, name: 'Lâmpada H4 LED', sales: 12, price: 120, growth: '+7%' },
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
  
  const [showAllTopProducts, setShowAllTopProducts] = useState(false);

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
        <button 
          onClick={() => setShowAllTopProducts(!showAllTopProducts)}
          className="text-primary text-sm font-medium hover:underline"
        >
          {showAllTopProducts ? 'Ver menos' : 'Ver todos'}
        </button>
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
            {filteredTopProducts.slice(0, showAllTopProducts ? 10 : 5).map((product) => (
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
            <div className="relative">
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                onChange={handleImportProducts} 
                className="hidden" 
                id="import-products" 
              />
              <label 
                htmlFor="import-products"
                className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm text-sm font-medium cursor-pointer"
              >
                <Upload size={18} /> Importar
              </label>
            </div>
            <button 
                onClick={handleNewProduct}
                className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 text-sm font-medium"
            >
                <Plus size={18} /> Novo Produto
            </button>
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

const HighlightsScreen = ({ globalSearchTerm, products }) => {
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'inactive'
  const [highlights, setHighlights] = useState([]);

  useEffect(() => {
    fetchHighlights();
  }, []);

  const fetchHighlights = async () => {
    const { data, error } = await supabase.from('highlights').select('*').order('created_at', { ascending: false });
    if (!error) {
      setHighlights(data.map(h => ({
        id: h.id,
        title: h.title,
        description: h.subtitle,
        expiration: h.expires_at,
        image: h.image_url
      })));
    }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [highlightToDelete, setHighlightToDelete] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToastMessage = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const handleSaveHighlight = async () => {
    setIsSaving(true);
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
        title: newHighlight.title || '',
        subtitle: newHighlight.description || '',
        expires_at: newHighlight.expiration || null,
        image_url: imageUrl
      };

      console.log("Tentando salvar destaque:", highlightData);

      if (isEditing) {
        if (!newHighlight.id) throw new Error("ID do destaque não encontrado.");
        
        // Adicionado .select() para garantir retorno e confirmar update
        const { data, error } = await supabase
          .from('highlights')
          .update(highlightData)
          .eq('id', newHighlight.id)
          .select();
          
        if (error) throw error;
        
        // Diagnóstico preciso de falha na atualização
        if (!data || data.length === 0) {
            // Verificar se o registro ainda existe para distinguir erro de permissão de erro de registro não encontrado
            const { data: exists } = await supabase
                .from('highlights')
                .select('id')
                .eq('id', newHighlight.id)
                .maybeSingle();
            
            if (exists) {
                // Se existe mas não atualizou, é permissão (RLS)
                console.error("Update bloqueado por RLS. ID:", newHighlight.id);
                throw new Error("Permissão negada pelo banco de dados. Verifique as políticas de segurança (RLS) da tabela 'highlights'.");
            } else {
                throw new Error("O destaque que você está tentando editar não existe mais.");
            }
        }
        
        showToastMessage("Destaque atualizado com sucesso!", 'success');
      } else {
        const { error } = await supabase.from('highlights').insert([highlightData]);
        if (error) throw error;
        showToastMessage("Destaque criado com sucesso!", 'success');
      }
      
      await fetchHighlights();
      
      // Se o destaque salvo for ativo (data futura ou hoje), muda para a aba de ativos
      if (newHighlight.expiration) {
        const expDate = new Date(newHighlight.expiration);
        // Ajuste para garantir comparação correta independente do fuso horário na data selecionada
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Criar data local baseada na string YYYY-MM-DD para comparação justa
        const parts = newHighlight.expiration.split('-');
        const localExpDate = new Date(parts[0], parts[1] - 1, parts[2]);
        
        if (localExpDate >= today) {
          setActiveTab('active');
        }
      } else {
        // Sem validade = sempre ativo
        setActiveTab('active');
      }

      closeModal();
    } catch (error) {
      console.error("Erro ao salvar destaque:", error);
      showToastMessage(error.message || "Erro ao salvar destaque. Tente novamente.", 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteHighlight = (id) => {
    setHighlightToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (highlightToDelete) {
      const { error } = await supabase.from('highlights').delete().eq('id', highlightToDelete);
      if (!error) {
         fetchHighlights();
      }
      setIsDeleteModalOpen(false);
      setHighlightToDelete(null);
    }
  };

  const openModal = (highlight = null) => {
    if (highlight) {
      setNewHighlight({
        id: highlight.id,
        title: highlight.title,
        description: highlight.description,
        expiration: highlight.expiration ? new Date(highlight.expiration).toISOString().split('T')[0] : '',
        image: highlight.image,
        imageFile: null
      });
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

  const activeHighlights = filteredHighlights.filter(h => {
    if (!h.expiration) return true;
    const expDate = new Date(h.expiration);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Converte a data de expiração (UTC do banco) para data local correspondente ao dia
    const localExpDate = new Date(
      expDate.getUTCFullYear(), 
      expDate.getUTCMonth(), 
      expDate.getUTCDate()
    );
    localExpDate.setHours(0, 0, 0, 0);
    
    return localExpDate >= today;
  });

  const inactiveHighlights = filteredHighlights.filter(h => {
    if (!h.expiration) return false;
    const expDate = new Date(h.expiration);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const localExpDate = new Date(
      expDate.getUTCFullYear(), 
      expDate.getUTCMonth(), 
      expDate.getUTCDate()
    );
    localExpDate.setHours(0, 0, 0, 0);
    
    return localExpDate < today;
  });

  const displayHighlights = activeTab === 'active' ? activeHighlights : inactiveHighlights;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-[60] animate-slide-in-right px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 border ${
          toast.type === 'success' 
            ? 'bg-white border-emerald-100 text-slate-800' 
            : 'bg-white border-red-100 text-slate-800'
        }`}>
          <div className={`p-2 rounded-full ${toast.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
            {toast.type === 'success' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
          </div>
          <div>
            <h4 className={`font-bold text-sm ${toast.type === 'success' ? 'text-emerald-700' : 'text-red-700'}`}>
              {toast.type === 'success' ? 'Sucesso!' : 'Atenção!'}
            </h4>
            <p className="text-sm text-slate-600">{toast.message}</p>
          </div>
          <button 
            onClick={() => setToast(prev => ({ ...prev, show: false }))}
            className="ml-4 p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
          >
            <X size={18} />
          </button>
        </div>
      )}

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
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-none">
                <h3 className="font-bold text-lg text-slate-800">
                   {isEditing ? 'Editar Destaque' : 'Novo Destaque'}
                </h3>
                <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 p-1 rounded-full transition-colors">
                   <X size={20} />
                </button>
             </div>
             
             <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                {/* Product Selection */}
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1.5">Importar dados de Produto</label>
                   <select
                      onChange={(e) => {
                         const product = products?.find(p => p.id == e.target.value);
                         if (product) {
                             setNewHighlight(prev => ({
                                 ...prev,
                                 title: product.name,
                                 description: product.description || '',
                                 image: product.image || null
                             }));
                         }
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-700"
                   >
                      <option value="">Selecione para preencher automaticamente...</option>
                      {products?.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                   </select>
                </div>

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

             <div className="p-6 border-t border-slate-100 bg-white flex-none">
                <button 
                   onClick={handleSaveHighlight}
                   disabled={isSaving}
                   className={`w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-blue-800 transition-all shadow-lg shadow-blue-500/20 active:scale-[0.99] flex items-center justify-center gap-2 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                   {isSaving ? (
                     <>
                       <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                       Salvando...
                     </>
                   ) : (
                     'Salvar Destaque'
                   )}
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

      <div className="flex border-b border-slate-200 overflow-x-auto bg-white rounded-t-xl px-2 pt-2">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-6 py-3 font-medium text-sm transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'active' 
              ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          Destaques Ativos
        </button>
        <button
          onClick={() => setActiveTab('inactive')}
          className={`px-6 py-3 font-medium text-sm transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'inactive' 
              ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          Destaques Inativos
        </button>
      </div>

      {displayHighlights.length === 0 ? (
        <div className="col-span-full flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-dashed border-slate-300">
          <div className="bg-slate-50 p-4 rounded-full mb-4">
            <Megaphone size={48} className="text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-1">
            {activeTab === 'active' ? 'Nenhum destaque ativo' : 'Nenhum destaque inativo'}
          </h3>
          <p className="text-slate-500 max-w-sm mx-auto">
            {activeTab === 'active' 
              ? 'Crie novos destaques para promover produtos e ofertas na sua loja.' 
              : 'Destaques expirados aparecerão aqui automaticamente.'}
          </p>
          {activeTab === 'active' && (
             <button 
                onClick={() => openModal()}
                className="mt-6 text-primary font-medium hover:underline"
             >
                Criar novo destaque
             </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {displayHighlights.map(highlight => (
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
                   {highlight.expiration && (
                     <div className="flex items-center gap-1 text-xs text-slate-500 mt-2">
                       <Calendar size={12} />
                       <span>Válido até: {new Date(highlight.expiration).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                     </div>
                   )}
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
      )}
    </div>
  );
};

const ChecklistScreen = () => {
  const [mainTab, setMainTab] = useState('respostas'); // 'respostas' | 'criacoes'
  const [responseTab, setResponseTab] = useState('daily'); // 'daily' | 'monthly'
  const [creationTab, setCreationTab] = useState('daily'); // 'daily' | 'monthly'
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [showDefaultDailyTemplate, setShowDefaultDailyTemplate] = useState(true);
  const [showDefaultMonthlyTemplate, setShowDefaultMonthlyTemplate] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('checklist_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedTemplates(data || []);
    } catch (error) {
      console.error('Erro ao buscar templates:', error);
    }
  };
  
  // Unified template state for editing/creating
  const [currentTemplate, setCurrentTemplate] = useState({
    id: null,
    name: '',
    pdfTitle: '',
    pdfSubtitle: 'FORMULÁRIO DE REGISTRO',
    headerText: 'Nome: _______________________  ID: ______  Data: __/__/____',
    type: 'custom',
    sections: []
  });

  // Dados mockados baseados na imagem enviada
  const dailyChecklistItems = {
    motorista: [
      "1.1 Está se sentindo bem, teve um bom sono?",
      "1.2 Está se sentindo concentrado para iniciar mais um turno de trabalho?",
      "1.3 Está tranquilo, calmo, seu descanso foi adequado?",
      "1.4 Meu descanso foi apropriado e meu sono foi de qualidade...",
      "1.5 CNH, CRLV, CIV, CIPP, Certificado Cronotacógrafo...",
      "1.6 Licenças de Operação Estaduais e Licenças IBAMA (Aplicáveis)"
    ],
    cavaloCarreta: [
      "2.1 Computador de Bordo e Rotograma falado em funcionamento?",
      "2.2 Tacógrafo em funcionamento?",
      "2.3 Sistema elétrico e todas as luzes em funcionamento?",
      "2.4 Buzina funcionando?",
      "2.5 Para-brisas, janelas e Limpador de para-brisas em bom estado?",
      "2.6 Documentação do Veículo dentro do prazo de validade?",
      "2.7 Ficha de emergência e envelope?",
      "2.8 Sistema de freios, conexão de ar, fluido de freio...",
      "2.9 Condição e pressão dos pneus e rodas",
      "2.10 Rodas/parafusos/porcas e suportes dos estepes devidamente fixados",
      "2.11 Baterias protegida com chave geral blindada?",
      "2.12 Guarda-Corpo",
      "2.13 Triângulo de sinalização",
      "2.14 Espelhos retrovisores em perfeito estado?",
      "2.15 Cinto de Segurança 3 pontos em bom estado",
      "2.16 Marcação dos Compartimentos",
      "2.17 Faixas Refletivas Laterais e traseiras",
      "2.18 Pontos de conexão de aterramento e cabo terra em bom estado?",
      "2.19 KIT de Emergência completo?",
      "2.20 Valvula de fundo, fecho rápido e tampa de visita sem vazamento?",
      "2.21 Simbologia de Risco em bom estado e conforme nota fiscal?",
      "2.22 Telefones de Emergência e Adesivo (Tel. Emergencia, 0800)",
      "2.23 Alarme de Ré e Seta",
      "2.24 Nível de água do radiador",
      "2.25 Extintores de Incêndio da cabine e do tanque em conformidade?",
      "2.26 O DVR das câmeras está com a luz azul e verde acesa?",
      "2.27 Limpeza das câmeras embarcadas",
      "2.28 Nível e pressão do óleo",
      "2.29 02 calços de borracha com dimensões mínimas...",
      "2.30 Tanques (Algum Vazamento)?",
      "2.31 Cabine limpa organizada, tanque com pintura sem avarias...",
      "2.32 Logotipo da empresa cavalo e carreta (bom estado...)",
      "2.33 Bottom (Verificar se existe, trincas e se o visor...)",
      "2.34 Valvula de contenção para dreno do cocho..."
    ],
    lacre: [
      "3.1 Quinta-Roda/Pino rei/dolly",
      "3.2 Existência/Integridade dos lacres"
    ],
    equipamentos: [
      "4.1 Mangote",
      "4.2 Placas Perigo afaste-se/Não fume",
      "4.3 Placas de Simbologia Rotulo de Risco/Paineis de Segurança",
      "4.4 Descarga Selada",
      "4.5 Balde Metálico com cabo terra",
      "4.6 Lanterna intrinsecamente segura",
      "4.7 Cones laranja e preto"
    ],
    epis: [
      "5.1 Capacete completo",
      "5.2 Sapato de Segurança",
      "5.3 Uniforme de Algodão sem bolso",
      "5.4 Óculos antiimpacto",
      "5.5 Luvas de Nitrílica/PVC",
      "5.6 Máscara semi facial contra GA/VO",
      "5.7 Cinto tipo para-quedista / Trava queda"
    ]
  };

  const dailySectionTitles = {
    motorista: "1. MOTORISTA",
    cavaloCarreta: "2. CAVALO/CARRETA",
    lacre: "3. LACRE DE SEGURANÇA",
    equipamentos: "4. EQUIPAMENTOS DE ENTREGA",
    epis: "5. EPI's"
  };

  const monthlyChecklistItems = {
    geral: [
      "1. CNH, MOPP e documentos obrigatórios dentro do prazo de validade.",
      "2. Certificado de verificação volumétrica (toco, truck, carreta ou bitrem).",
      "3. CIPP/CIV para transporte de produtos perigosos dentro da validade.",
      "4. CRLV do veículo atualizado.",
      "5. Certificado de aferição do cronotacógrafo.",
      "6. Licenças ambientais aplicáveis.",
      "7. Ficha de emergência e envelope de transporte.",
      "8. Conjunto completo de EPIs (colete, luvas, óculos, máscara, calçado, etc.).",
      "9. Conjunto para situações de emergência (cones, calços, bandeiras, etc.).",
      "10. Pneus em bom estado, sulco mínimo adequado e sem recapagens irregulares.",
      "11. Elementos de fixação das rodas (porcas, prisioneiros, anéis) íntegros.",
      "12. Sistema de freios sem vazamentos e mangueiras em bom estado.",
      "13. Condições físicas do condutor (assento, cinto, ergonomia, etc.).",
      "14. Iluminação do veículo (faróis, lanternas, freio, ré, setas) funcionando.",
      "15. Faixas refletivas e painéis de segurança conforme legislação.",
      "16. Extintores dimensionados, válidos, lacrados e fixados corretamente.",
      "17. Placas de risco, de advertência e identificação legíveis e em bom estado.",
      "18. Válvulas, conexões e dispositivos de carga/descarga em boas condições.",
      "19. Sistema de Bottom Loading e overfill (quando aplicável) operante.",
      "20. Sistema de aterramento (cabos, pontos de conexão e ground ball) adequado.",
      "21. Equipamentos de descarga (mangotes, adaptadores, bocais) íntegros.",
      "22. Sistema pneumático e de suspensão sem vazamentos aparentes.",
      "23. Sistemas embarcados (câmeras, sensores, GPS, etc.) funcionando.",
      "24. Condições gerais de chassi, carroceria, travessas e guarda-corpo.",
      "25. Proteções traseiras e dispositivos anti-encalhe em boas condições.",
      "26. Registro de não conformidades e re-check quando aplicável."
    ]
  };

  const monthlySectionTitles = {
    geral: "CHECKLIST MENSAL / ADEQUAÇÃO"
  };

  const totalDailyQuestions =
    dailyChecklistItems.motorista.length +
    dailyChecklistItems.cavaloCarreta.length +
    dailyChecklistItems.lacre.length +
    dailyChecklistItems.equipamentos.length +
    dailyChecklistItems.epis.length;

  const totalMonthlyQuestions = monthlyChecklistItems.geral.length;

  const openTemplateModal = (mode, templateToEdit = null) => {
    if (mode === 'daily-default') {
      // Checklist Diário padrão (FR MAN 06)
      const sections = [
        { title: dailySectionTitles.motorista, questions: [...dailyChecklistItems.motorista] },
        { title: dailySectionTitles.cavaloCarreta, questions: [...dailyChecklistItems.cavaloCarreta] },
        { title: dailySectionTitles.lacre, questions: [...dailyChecklistItems.lacre] },
        { title: dailySectionTitles.equipamentos, questions: [...dailyChecklistItems.equipamentos] },
        { title: dailySectionTitles.epis, questions: [...dailyChecklistItems.epis] }
      ];
      
      setCurrentTemplate({
        id: 'daily',
        name: 'Checklist Diário',
        pdfTitle: 'CHECKLIST DIÁRIO',
        pdfSubtitle: 'FORMULÁRIO DE REGISTRO',
        headerText: 'Nome: _______________________  ID: ______  Data: __/__/____',
        type: 'daily',
        sections
      });
    } else if (mode === 'monthly-default') {
      // Checklist Mensal/Adequação padrão (FR MAN 07)
      const sections = [
        { title: monthlySectionTitles.geral, questions: [...monthlyChecklistItems.geral] }
      ];

      setCurrentTemplate({
        id: 'monthly',
        name: 'Checklist Mensal / Adequação',
        pdfTitle: 'CHECKLIST MENSAL/ADEQUAÇÃO',
        pdfSubtitle: 'FORMULÁRIO DE REGISTRO',
        headerText: 'Local: __________   Data: __/__/____   Placa: __________',
        type: 'monthly',
        sections
      });
    } else if (mode === 'edit' && templateToEdit) {
      // Editar template salvo (diário ou mensal)
      setCurrentTemplate({
        id: templateToEdit.id,
        name: templateToEdit.name,
        pdfTitle: templateToEdit.pdf_title || '',
        pdfSubtitle: templateToEdit.pdf_subtitle || '',
        headerText: templateToEdit.header_text || '',
        type: templateToEdit.type || 'daily',
        sections: typeof templateToEdit.sections === 'string' 
          ? (templateToEdit.sections ? JSON.parse(templateToEdit.sections) : []) 
          : (templateToEdit.sections || [])
      });
    } else if (mode === 'new-daily') {
      setCurrentTemplate({
        id: null,
        name: 'Novo Checklist Diário',
        pdfTitle: 'CHECKLIST DIÁRIO',
        pdfSubtitle: 'FORMULÁRIO DE REGISTRO',
        headerText: 'Nome: _______________________  ID: ______  Data: __/__/____',
        type: 'daily',
        sections: [
          { title: 'Nova Seção 1', questions: ['Pergunta 1'] }
        ]
      });
    } else if (mode === 'new-monthly') {
      setCurrentTemplate({
        id: null,
        name: 'Novo Checklist Mensal',
        pdfTitle: 'CHECKLIST MENSAL/ADEQUAÇÃO',
        pdfSubtitle: 'FORMULÁRIO DE REGISTRO',
        headerText: 'Local: __________   Data: __/__/____   Placa: __________',
        type: 'monthly',
        sections: [
          { title: 'Nova Seção Mensal', questions: ['Pergunta 1'] }
        ]
      });
    }
    setIsTemplateModalOpen(true);
  };

  const closeTemplateModal = () => {
    setIsTemplateModalOpen(false);
  };

  // Dynamic Editing Functions
  const handleUpdateTemplateName = (name) => {
    // Also update PDF title if it matches the name to be helpful
    setCurrentTemplate(prev => ({ 
        ...prev, 
        name,
        // Optional: keep pdfTitle in sync if user hasn't customized it manually? 
        // For simplicity, let's keep them separate but maybe init same.
        // Or just let user edit them separately.
    }));
  };

  const handleUpdatePdfConfig = (field, value) => {
    setCurrentTemplate(prev => ({ ...prev, [field]: value }));
  };

  const handleUpdateSectionTitle = (sectionIndex, title) => {
    setCurrentTemplate(prev => {
      const newSections = [...prev.sections];
      newSections[sectionIndex].title = title;
      return { ...prev, sections: newSections };
    });
  };

  const handleUpdateQuestion = (sectionIndex, questionIndex, text) => {
    setCurrentTemplate(prev => {
      const newSections = [...prev.sections];
      newSections[sectionIndex].questions[questionIndex] = text;
      return { ...prev, sections: newSections };
    });
  };

  const handleAddSection = () => {
    setCurrentTemplate(prev => ({
      ...prev,
      sections: [...prev.sections, { title: 'Nova Seção', questions: ['Nova Pergunta'] }]
    }));
  };

  const handleRemoveSection = (index) => {
    if (!window.confirm("Tem certeza que deseja remover esta seção inteira?")) return;
    setCurrentTemplate(prev => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index)
    }));
  };

  const handleAddQuestion = (sectionIndex) => {
    setCurrentTemplate(prev => {
      const newSections = [...prev.sections];
      newSections[sectionIndex].questions.push("Nova Pergunta");
      return { ...prev, sections: newSections };
    });
  };

  const handleRemoveQuestion = (sectionIndex, questionIndex) => {
    setCurrentTemplate(prev => {
      const newSections = [...prev.sections];
      newSections[sectionIndex].questions = newSections[sectionIndex].questions.filter((_, i) => i !== questionIndex);
      return { ...prev, sections: newSections };
    });
  };

  const handleSaveTemplate = async () => {
    if (!currentTemplate.name) {
      alert("Por favor, dê um nome ao modelo.");
      return;
    }

    try {
      const templateData = {
        name: currentTemplate.name,
        pdf_title: currentTemplate.pdfTitle,
        pdf_subtitle: currentTemplate.pdfSubtitle,
        header_text: currentTemplate.headerText,
        type: currentTemplate.type || 'daily',
        sections: currentTemplate.sections // Supabase handles JSONB automatically if column type is jsonb
      };

      let error;
      if (currentTemplate.id && currentTemplate.id !== 'daily' && currentTemplate.id !== 'monthly') {
        // Update existing
        const { error: updateError } = await supabase
          .from('checklist_templates')
          .update(templateData)
          .eq('id', currentTemplate.id);
        error = updateError;
      } else {
        // Insert new
        const { error: insertError } = await supabase
          .from('checklist_templates')
          .insert([templateData]);
        error = insertError;
      }

      if (error) throw error;

      alert("Modelo salvo com sucesso!");
      fetchTemplates(); // Refresh list
      setIsTemplateModalOpen(false);
    } catch (error) {
      console.error('Erro ao salvar modelo:', error);
      alert("Erro ao salvar modelo: " + error.message);
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir este modelo permanentemente?")) return;

    try {
      const { error } = await supabase
        .from('checklist_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setSavedTemplates(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error('Erro ao excluir modelo:', error);
      alert("Erro ao excluir: " + error.message);
    }
  };

  const generatePDF = (templateOverride = null) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Use override if provided (for list cards), otherwise current editing, otherwise daily default
    let templateToPrint = templateOverride;
    
    if (!templateToPrint) {
        templateToPrint = isTemplateModalOpen ? currentTemplate : {
            name: "Checklist Diário",
            pdfTitle: "CHECKLIST DIÁRIO",
            pdfSubtitle: "FORMULÁRIO DE REGISTRO",
            headerText: "Nome: _______________________  ID: ______  Data: __/__/____",
            sections: [
                { title: dailySectionTitles.motorista, questions: dailyChecklistItems.motorista },
                { title: dailySectionTitles.cavaloCarreta, questions: dailyChecklistItems.cavaloCarreta },
                { title: dailySectionTitles.lacre, questions: dailyChecklistItems.lacre },
                { title: dailySectionTitles.equipamentos, questions: dailyChecklistItems.equipamentos },
                { title: dailySectionTitles.epis, questions: dailyChecklistItems.epis }
            ]
        };
    }
    
    // Ensure sections is an array (handle JSON string from DB and valores nulos)
    let sectionsToPrint = [];
    try {
        if (Array.isArray(templateToPrint.sections)) {
            sectionsToPrint = templateToPrint.sections;
        } else if (typeof templateToPrint.sections === 'string' && templateToPrint.sections.trim() !== '') {
            sectionsToPrint = JSON.parse(templateToPrint.sections) || [];
        }
    } catch (e) {
        console.error('Erro ao parsear sections para PDF', e, templateToPrint);
        sectionsToPrint = [];
    }

    // Título
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text((templateToPrint.pdfTitle || templateToPrint.pdf_title || templateToPrint.name).toUpperCase(), pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text((templateToPrint.pdfSubtitle || templateToPrint.pdf_subtitle || "FORMULÁRIO DE REGISTRO"), pageWidth / 2, 22, { align: 'center' });
    
    // Cabeçalho Simples
    doc.rect(10, 25, 190, 15);
    doc.text(templateToPrint.headerText || templateToPrint.header_text || "Nome: _______________________  ID: ______  Data: __/__/____", 12, 35);

    let yPos = 50;

    const addSection = (title, items) => {
        if (yPos > 270) {
            doc.addPage();
            yPos = 20;
        }
        
        doc.setFillColor(220, 220, 220);
        doc.rect(10, yPos, 190, 7, 'F');
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text(title, 12, yPos + 5);
        yPos += 10;
        
        doc.setFont(undefined, 'normal');
        items.forEach(item => {
            if (yPos > 280) {
                doc.addPage();
                yPos = 20;
            }
            doc.text(item, 12, yPos);
            // Checkboxes simulados
            doc.rect(170, yPos - 3, 4, 4); // Sim
            doc.rect(180, yPos - 3, 4, 4); // Não
            yPos += 7;
        });
        yPos += 5;
    };

    sectionsToPrint.forEach(section => {
        if (!section || !Array.isArray(section.questions)) return;
        addSection(section.title || 'Seção', section.questions);
    });

    doc.save(`${templateToPrint.name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 font-parkinsans">Checklists</h1>
        
        {/* Toggle Principal: Respostas vs Criações */}
        <div className="bg-slate-200 p-1 rounded-lg flex gap-1">
          <button
            onClick={() => setMainTab('respostas')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
              mainTab === 'respostas' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Respostas
          </button>
          <button
            onClick={() => setMainTab('criacoes')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
              mainTab === 'criacoes' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Criações (Modelos)
          </button>
        </div>
      </div>

      {mainTab === 'respostas' && (
        <div className="space-y-4">
           {/* Sub-abas de Respostas */}
           <div className="flex border-b border-slate-200 overflow-x-auto bg-white rounded-t-xl px-2 pt-2">
            <button
              onClick={() => setResponseTab('daily')}
              className={`px-6 py-3 font-medium text-sm transition-all border-b-2 whitespace-nowrap ${
                responseTab === 'daily' 
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              Checklist Diário
            </button>
            <button
              onClick={() => setResponseTab('monthly')}
              className={`px-6 py-3 font-medium text-sm transition-all border-b-2 whitespace-nowrap ${
                responseTab === 'monthly' 
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              Checklist Mensal
            </button>
          </div>

          <div className="bg-white rounded-b-xl shadow-sm border border-slate-100 p-8 min-h-[400px]">
             {responseTab === 'daily' ? (
               <div className="text-center">
                  <div className="bg-blue-50 p-6 rounded-full inline-flex mb-4 animate-pulse">
                    <ClipboardList size={48} className="text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Nenhuma resposta diária encontrada</h3>
                  <p className="text-slate-500 mb-6">As respostas enviadas pelos motoristas aparecerão aqui.</p>
                  <button className="text-primary hover:underline font-medium">Simular nova resposta</button>
               </div>
             ) : (
                <div className="text-center">
                  <div className="bg-purple-50 p-6 rounded-full inline-flex mb-4 animate-pulse">
                    <ClipboardList size={48} className="text-purple-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Nenhuma resposta mensal encontrada</h3>
                  <p className="text-slate-500">As respostas mensais aparecerão aqui.</p>
               </div>
             )}
          </div>
        </div>
      )}

      {mainTab === 'criacoes' && (
        <div className="space-y-4">
           {/* Sub-abas de Criações */}
           <div className="flex border-b border-slate-200 overflow-x-auto bg-white rounded-t-xl px-2 pt-2">
            <button
              onClick={() => setCreationTab('daily')}
              className={`px-6 py-3 font-medium text-sm transition-all border-b-2 whitespace-nowrap ${
                creationTab === 'daily' 
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              Checklist Diário
            </button>
            <button
              onClick={() => setCreationTab('monthly')}
              className={`px-6 py-3 font-medium text-sm transition-all border-b-2 whitespace-nowrap ${
                creationTab === 'monthly' 
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              Checklist Mensal
            </button>
          </div>

          <div className="bg-white rounded-b-xl shadow-sm border border-slate-100 p-6 relative">
            {creationTab === 'daily' ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Card Criar Novo (Diário) */}
                  <button 
                    onClick={() => openTemplateModal('new-daily')}
                    className="border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-blue-50/50 transition-all group min-h-[160px]"
                  >
                    <div className="bg-slate-100 p-3 rounded-full group-hover:bg-blue-100 transition-colors">
                      <Plus size={24} className="text-slate-400 group-hover:text-primary" />
                    </div>
                    <span className="font-bold text-slate-600 group-hover:text-primary">Criar Novo Modelo</span>
                  </button>

                  {/* Card Daily Padrão */}
                  {showDefaultDailyTemplate && (
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 hover:bg-slate-100/70 transition-shadow shadow-sm hover:shadow-md flex flex-col justify-between relative group/card">
                      <button
                        onClick={() => {
                          if (window.confirm('Tem certeza que deseja remover este modelo padrão da lista?')) {
                            setShowDefaultDailyTemplate(false);
                          }
                        }}
                        className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover/card:opacity-100 transition-opacity p-1"
                        title="Excluir Modelo Padrão"
                      >
                        <Trash2 size={16} />
                      </button>
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2 pr-6">
                          <div>
                            <h2 className="text-base font-bold text-slate-900">Checklist Diário</h2>
                            <p className="text-xs text-slate-500 mt-1">Modelo padrão baseado no formulário FR MAN 06.</p>
                          </div>
                          <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">Padrão</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                          <ClipboardList size={14} className="text-blue-500" />
                          <span>{totalDailyQuestions} perguntas</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-4">
                        <button
                          onClick={() => openTemplateModal('daily-default')}
                          className="flex-1 min-w-[120px] px-3 py-2 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-blue-800 flex items-center justify-center gap-1"
                        >
                          <Eye size={14} /> Visualizar / Editar
                        </button>
                        <button
                          onClick={() => generatePDF()}
                          className="flex-1 min-w-[120px] px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1"
                        >
                          <Download size={14} /> Exportar PDF
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Render Saved Templates (Daily Only) */}
                  {savedTemplates
                    .filter(template => template.type !== 'monthly')
                    .map(template => {
                    let sections = [];
                    try {
                      if (Array.isArray(template.sections)) {
                        sections = template.sections;
                      } else if (typeof template.sections === 'string' && template.sections.trim() !== '') {
                        sections = JSON.parse(template.sections) || [];
                      }
                    } catch (e) {
                      console.error('Erro ao parsear sections do template', template.id, e);
                      sections = [];
                    }

                    const totalQuestions = sections.reduce((acc, curr) => {
                      if (!curr || !Array.isArray(curr.questions)) return acc;
                      return acc + curr.questions.length;
                    }, 0);
                    
                    return (
                      <div key={template.id} className="border border-slate-200 rounded-xl p-4 bg-white hover:bg-slate-50 transition-shadow shadow-sm hover:shadow-md flex flex-col justify-between relative group/card">
                        <button 
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover/card:opacity-100 transition-opacity p-1"
                            title="Excluir Modelo"
                        >
                            <Trash2 size={16} />
                        </button>
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2 pr-6">
                            <div>
                              <h2 className="text-base font-bold text-slate-900 line-clamp-1">{template.name}</h2>
                              <p className="text-xs text-slate-500 mt-1 line-clamp-2">Modelo personalizado</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                            <ClipboardList size={14} className="text-purple-500" />
                            <span>{totalQuestions} perguntas</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-4">
                          <button
                            onClick={() => openTemplateModal('edit', template)}
                            className="flex-1 min-w-[120px] px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 flex items-center justify-center gap-1"
                          >
                            <Edit size={14} /> Editar
                          </button>
                          <button
                            onClick={() => generatePDF(template)}
                            className="flex-1 min-w-[120px] px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1"
                          >
                            <Download size={14} /> PDF
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {isTemplateModalOpen && (
                  <div 
                    className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
                    onClick={closeTemplateModal}
                  >
                    <div 
                      className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-up"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-none">
                        <div className="flex-1 mr-4">
                           <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1 block">Nome do Modelo</label>
                           <input 
                              type="text" 
                              value={currentTemplate.name}
                              onChange={(e) => handleUpdateTemplateName(e.target.value)}
                              className="text-lg font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary focus:outline-none w-full"
                              placeholder="Nome do Checklist"
                           />
                        </div>
                        <button onClick={closeTemplateModal} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 p-1 rounded-full transition-colors">
                          <X size={20} />
                        </button>
                      </div>

                      <div className="p-6 space-y-8 overflow-y-auto flex-1 custom-scrollbar">
                        
                        {/* Configurações do PDF (Cabeçalho) */}
                        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                            <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Settings2 size={14} /> Configuração do Cabeçalho (PDF)
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] text-slate-500 font-bold uppercase mb-1 block">Título no PDF</label>
                                    <input 
                                        value={currentTemplate.pdfTitle}
                                        onChange={(e) => handleUpdatePdfConfig('pdfTitle', e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
                                        placeholder="Ex: CHECKLIST DIÁRIO"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 font-bold uppercase mb-1 block">Subtítulo</label>
                                    <input 
                                        value={currentTemplate.pdfSubtitle}
                                        onChange={(e) => handleUpdatePdfConfig('pdfSubtitle', e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
                                        placeholder="Ex: FORMULÁRIO DE REGISTRO"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-[10px] text-slate-500 font-bold uppercase mb-1 block">Linha de Campos (Nome, ID, Data...)</label>
                                    <input 
                                        value={currentTemplate.headerText}
                                        onChange={(e) => handleUpdatePdfConfig('headerText', e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono text-slate-700 focus:border-blue-500 focus:outline-none"
                                        placeholder="Nome: _________ ID: ____"
                                    />
                                </div>
                            </div>
                        </div>

                        {currentTemplate.sections.map((section, sIndex) => (
                          <div key={sIndex} className="bg-slate-50 p-4 rounded-xl border border-slate-200 relative group/section">
                             <div className="absolute right-2 top-2 opacity-0 group-hover/section:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => handleRemoveSection(sIndex)}
                                  className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                                  title="Remover Seção"
                                >
                                  <Trash2 size={16} />
                                </button>
                             </div>

                             <div className="mb-4 pr-8">
                                <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">Título da Seção</label>
                                <input
                                  value={section.title}
                                  onChange={(e) => handleUpdateSectionTitle(sIndex, e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none"
                                  placeholder="Ex: Motorista"
                                />
                             </div>

                             <div className="space-y-3 pl-2 border-l-2 border-slate-200">
                                {section.questions.map((q, qIndex) => (
                                  <div key={qIndex} className="flex gap-2 items-start group/question">
                                    <span className="mt-2 text-xs text-slate-400 w-6 font-mono text-right">{qIndex + 1}.</span>
                                    <textarea
                                      value={q}
                                      onChange={(e) => handleUpdateQuestion(sIndex, qIndex, e.target.value)}
                                      rows={2}
                                      className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none resize-none"
                                      placeholder="Digite a pergunta..."
                                    />
                                    <button 
                                      onClick={() => handleRemoveQuestion(sIndex, qIndex)}
                                      className="mt-2 text-slate-300 hover:text-red-500 opacity-0 group-hover/question:opacity-100 transition-opacity"
                                      title="Remover Pergunta"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                ))}
                                <button 
                                  onClick={() => handleAddQuestion(sIndex)}
                                  className="ml-8 text-xs font-semibold text-primary hover:text-blue-700 flex items-center gap-1 py-1"
                                >
                                  <Plus size={12} /> Adicionar Pergunta
                                </button>
                             </div>
                          </div>
                        ))}

                        <button 
                          onClick={handleAddSection}
                          className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-semibold hover:border-primary hover:text-primary hover:bg-blue-50/30 transition-all flex items-center justify-center gap-2"
                        >
                          <Plus size={20} /> Adicionar Nova Seção
                        </button>
                      </div>

                      <div className="p-6 border-t border-slate-100 bg-white flex-none flex justify-between gap-3">
                        <button
                          onClick={generatePDF}
                          className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 flex items-center gap-2 text-sm font-medium"
                        >
                          <Download size={16} /> PDF Preview
                        </button>
                        <div className="flex gap-3">
                          <button
                            onClick={closeTemplateModal}
                            className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={handleSaveTemplate}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-800 text-sm font-bold shadow-lg shadow-blue-500/20"
                          >
                            Salvar Modelo
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Card Criar Novo (Mensal) */}
                <button 
                  onClick={() => openTemplateModal('new-monthly')}
                  className="border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-blue-50/50 transition-all group min-h-[160px]"
                >
                  <div className="bg-slate-100 p-3 rounded-full group-hover:bg-blue-100 transition-colors">
                    <Plus size={24} className="text-slate-400 group-hover:text-primary" />
                  </div>
                  <span className="font-bold text-slate-600 group-hover:text-primary">Criar Modelo Mensal</span>
                </button>

                {/* Card Mensal Padrão */}
                {showDefaultMonthlyTemplate && (
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 hover:bg-slate-100/70 transition-shadow shadow-sm hover:shadow-md flex flex-col justify-between relative group/card">
                    <button
                      onClick={() => {
                        if (window.confirm('Tem certeza que deseja remover este modelo padrão da lista?')) {
                          setShowDefaultMonthlyTemplate(false);
                        }
                      }}
                      className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover/card:opacity-100 transition-opacity p-1"
                      title="Excluir Modelo Padrão"
                    >
                      <Trash2 size={16} />
                    </button>
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2 pr-6">
                        <div>
                          <h2 className="text-base font-bold text-slate-900">Checklist Mensal / Adequação</h2>
                          <p className="text-xs text-slate-500 mt-1">Modelo padrão baseado no formulário FR MAN 07.</p>
                        </div>
                        <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">Padrão</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                        <ClipboardList size={14} className="text-purple-500" />
                        <span>{totalMonthlyQuestions} perguntas</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4">
                      <button
                        onClick={() => openTemplateModal('monthly-default')}
                        className="flex-1 min-w-[120px] px-3 py-2 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-blue-800 flex items-center justify-center gap-1"
                      >
                        <Eye size={14} /> Visualizar / Editar
                      </button>
                      <button
                        onClick={() => generatePDF({
                          name: 'Checklist Mensal / Adequação',
                          pdfTitle: 'CHECKLIST MENSAL/ADEQUAÇÃO',
                          pdfSubtitle: 'FORMULÁRIO DE REGISTRO',
                          headerText: 'Local: __________   Data: __/__/____   Placa: __________',
                          sections: [
                            { title: monthlySectionTitles.geral, questions: monthlyChecklistItems.geral }
                          ]
                        })}
                        className="flex-1 min-w-[120px] px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1"
                      >
                        <Download size={14} /> Exportar PDF
                      </button>
                    </div>
                  </div>
                )}

                {/* Modelos Mensais Salvos */}
                {savedTemplates
                  .filter(template => template.type === 'monthly')
                  .map(template => {
                    let sections = [];
                    try {
                      if (Array.isArray(template.sections)) {
                        sections = template.sections;
                      } else if (typeof template.sections === 'string' && template.sections.trim() !== '') {
                        sections = JSON.parse(template.sections) || [];
                      }
                    } catch (e) {
                      console.error('Erro ao parsear sections do template mensal', template.id, e);
                      sections = [];
                    }

                    const totalQuestions = sections.reduce((acc, curr) => {
                      if (!curr || !Array.isArray(curr.questions)) return acc;
                      return acc + curr.questions.length;
                    }, 0);

                    return (
                      <div key={template.id} className="border border-slate-200 rounded-xl p-4 bg-white hover:bg-slate-50 transition-shadow shadow-sm hover:shadow-md flex flex-col justify-between relative group/card">
                        <button 
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover/card:opacity-100 transition-opacity p-1"
                          title="Excluir Modelo Mensal"
                        >
                          <Trash2 size={16} />
                        </button>
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2 pr-6">
                            <div>
                              <h2 className="text-base font-bold text-slate-900 line-clamp-1">{template.name}</h2>
                              <p className="text-xs text-slate-500 mt-1 line-clamp-2">Modelo mensal personalizado</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                            <ClipboardList size={14} className="text-purple-500" />
                            <span>{totalQuestions} perguntas</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-4">
                          <button
                            onClick={() => openTemplateModal('edit', template)}
                            className="flex-1 min-w-[120px] px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 flex items-center justify-center gap-1"
                          >
                            <Edit size={14} /> Editar
                          </button>
                          <button
                            onClick={() => generatePDF(template)}
                            className="flex-1 min-w-[120px] px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1"
                          >
                            <Download size={14} /> PDF
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const UsersScreen = ({ globalSearchTerm, session }) => {
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState('all');

  // Buscar usuários reais do banco
  useEffect(() => {
    fetchUsers();
  }, [session]);

  const fetchUsers = async () => {
    try {
      // Buscar todos os usuários na tabela profiles
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('name');
        
      if (error) throw error;
      
      const formatted = data.map(u => ({
        id: u.id,
        name: u.name || 'Sem Nome',
        email: u.email,
        role: u.role || 'user',
        receives_email: u.receives_email || false,
        app_access: u.app_access || false,
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

  const handleToggleChecklistAccess = async (userId, currentValue) => {
    // Optimistic update
    setUsers(prev => prev.map(u => 
      u.id === userId ? { ...u, app_access: !currentValue, receives_email: !currentValue } : u
    ));

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ app_access: !currentValue, receives_email: !currentValue })
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao atualizar permissão:', error);
      alert('Erro ao atualizar permissão: ' + error.message);
      fetchUsers(); // Revert
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

  const filteredUsers = users.filter(user => {
    const matchesSearch = globalSearchTerm ? 
      user.name.toLowerCase().includes(globalSearchTerm.toLowerCase()) || 
      user.email.toLowerCase().includes(globalSearchTerm.toLowerCase()) 
      : true;

    const matchesRole = (() => {
      if (roleFilter === 'all') return true;
      const r = user.role?.toLowerCase();
      if (roleFilter === 'admin') return r === 'admin' || r === 'administrador';
      if (roleFilter === 'cliente') return r === 'cliente' || r === 'user';
      if (roleFilter === 'entregador') return r === 'entregador';
      if (roleFilter === 'funcionario') return r === 'funcionario' || r === 'funcionário';
      return r === roleFilter;
    })();

    return matchesSearch && matchesRole;
  });

  // Get unique roles for filter options
  const uniqueRoles = ['all', ...new Set(users.map(u => u.role))].filter(Boolean);

  const getRoleBadgeColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin':
      case 'administrador':
        return 'bg-purple-100 text-purple-700';
      case 'entregador':
        return 'bg-orange-100 text-orange-700';
      case 'cliente':
      case 'user':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

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
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-xs font-medium ${getRoleBadgeColor(selectedUser.role)}`}>
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

      <div className="flex justify-between items-center flex-wrap gap-4">
          <h1 className="text-2xl font-bold text-slate-900 font-parkinsans">Gestão de Usuários</h1>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
            >
                <Plus size={20} /> Novo Administrador
            </button>
          </div>
      </div>

      <div className="flex border-b border-slate-200 overflow-x-auto bg-white rounded-t-xl px-2 pt-2">
        {[
          { id: 'all', label: 'Todos os Usuários' },
          { id: 'admin', label: 'Admin' },
          { id: 'cliente', label: 'Cliente' },
          { id: 'entregador', label: 'Entregador' },
          { id: 'funcionario', label: 'Funcionário' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setRoleFilter(tab.id)}
            className={`px-6 py-3 font-medium text-sm transition-all border-b-2 whitespace-nowrap ${
              roleFilter === tab.id 
                ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-b-xl shadow-sm border border-slate-100 overflow-visible border-t-0">
         <div className="overflow-visible">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm">
                     <th className="px-6 py-4 font-semibold">Nome</th>
                     <th className="px-6 py-4 font-semibold">Email</th>
                     <th className="px-6 py-4 font-semibold text-center">
                        <div className="flex flex-col items-center gap-1">
                           <ClipboardList size={16} />
                           <span className="text-[10px] uppercase">Acesso Checklist</span>
                        </div>
                     </th>
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
                      <td className="px-6 py-4 text-center">
                        <button 
                           onClick={(e) => {
                              e.stopPropagation();
                              handleToggleChecklistAccess(user.id, user.app_access);
                           }}
                           className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${user.app_access ? 'bg-primary' : 'bg-slate-300'}`}
                           title={user.app_access ? "Clique para revogar acesso ao checklist" : "Clique para conceder acesso ao checklist"}
                        >
                           <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${user.app_access ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
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
    evaluationMinStars: 'any',
    
    // Configuração de Pontos
    pointsPerCurrency: 1,
    currencyPerPoint: 0.01,
    signupBonusPoints: 0,
    birthdayBonusPoints: 0,
    pointsValidityMonths: 117,
    enablePointsAccumulationLock: false,
    pointsAccumulationLockLimit: 50000,
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
        {activeTab === 'config' && fidelityType === 'cashback' && (
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

        {activeTab === 'config' && fidelityType === 'points' && (
          <>
            {/* Configuração de Pontos */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                Configuração de Pontos
                <Info size={16} className="text-slate-400" />
              </h3>
              <p className="text-slate-500 text-sm mb-6">Defina como os pontos serão acumulados e utilizados</p>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Pontos por Real Gasto</label>
                  <input 
                    type="number" 
                    value={config.pointsPerCurrency}
                    onChange={(e) => setConfig({...config, pointsPerCurrency: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                  <p className="text-xs text-slate-400 mt-2">Quantos pontos o cliente ganha a cada R$ 1,00 gasto</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Valor em Real por Ponto</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={config.currencyPerPoint}
                    onChange={(e) => setConfig({...config, currencyPerPoint: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                  <p className="text-xs text-slate-400 mt-2">Quanto vale cada ponto em reais na hora de trocar</p>
                </div>
              </div>
            </section>

            {/* Bônus de Pontos */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                Bônus de Pontos
                <Info size={16} className="text-slate-400" />
              </h3>
              <p className="text-slate-500 text-sm mb-6">Configure bônus especiais em pontos</p>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Bônus de Cadastro (Pontos)</label>
                  <input 
                    type="number" 
                    value={config.signupBonusPoints}
                    onChange={(e) => setConfig({...config, signupBonusPoints: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                  <p className="text-xs text-slate-400 mt-2">Pontos dados ao cliente no primeiro cadastro</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Bônus de Aniversário (Pontos)</label>
                  <input 
                    type="number" 
                    value={config.birthdayBonusPoints}
                    onChange={(e) => setConfig({...config, birthdayBonusPoints: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                  <p className="text-xs text-slate-400 mt-2">Pontos dados ao cliente no mês do aniversário</p>
                </div>
              </div>
            </section>

            {/* Validade dos Pontos */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
               <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                Validade dos Pontos
                <Info size={16} className="text-slate-400" />
              </h3>
              <p className="text-slate-500 text-sm mb-6">Por quanto tempo os pontos ficam disponíveis</p>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Validade (meses)</label>
                <input 
                  type="number" 
                  value={config.pointsValidityMonths}
                  onChange={(e) => setConfig({...config, pointsValidityMonths: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
                <p className="text-xs text-slate-400 mt-2">Após este período, os pontos não resgatados expiram</p>
              </div>
            </section>

            {/* Trava de Acúmulo */}
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
                    onClick={() => setConfig({...config, enablePointsAccumulationLock: !config.enablePointsAccumulationLock})}
                    className={`w-12 h-6 rounded-full transition-colors relative ${config.enablePointsAccumulationLock ? 'bg-blue-600' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${config.enablePointsAccumulationLock ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                {config.enablePointsAccumulationLock && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Limite para Trava (Pontos)</label>
                    <input 
                      type="number" 
                      value={config.pointsAccumulationLockLimit}
                      onChange={(e) => setConfig({...config, pointsAccumulationLockLimit: e.target.value})}
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
      case 'Destaques': return <HighlightsScreen globalSearchTerm={globalSearchTerm} products={products} />;
      case 'Usuários': return <UsersScreen globalSearchTerm={globalSearchTerm} session={session} />;
      case 'Entregas': return <DeliveriesScreen globalSearchTerm={globalSearchTerm} deliveries={deliveries} onUpdateStatus={handleUpdateDeliveryStatus} />;
      case 'Fidelidade': return <LoyaltyScreen globalSearchTerm={globalSearchTerm} />;
      case 'Checklist': return <ChecklistScreen />;
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
          <SidebarItem icon={ClipboardList} label="Checklist" active={activeTab === 'Checklist'} onClick={() => setActiveTab('Checklist')} isOpen={isSidebarOpen} />
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