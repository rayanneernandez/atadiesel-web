import React, { useState } from 'react';
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
  CheckCircle
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

const DashboardScreen = ({ globalSearchTerm }) => {
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10)
  });
  
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportConfig, setReportConfig] = useState({
    overview: true,
    products: false,
    deliveries: false,
    deliveriesCompleted: true,
    deliveriesInProgress: true
  });

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
      
      const filteredDeliveries = mockDeliveries.filter(d => {
        if (reportConfig.deliveriesCompleted && d.status === 'Entregue') return true;
        if (reportConfig.deliveriesInProgress && (d.status === 'Em Trânsito' || d.status === 'Pendente')) return true;
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
      const filteredDeliveries = mockDeliveries.filter(d => {
        if (reportConfig.deliveriesCompleted && d.status === 'Entregue') return true;
        if (reportConfig.deliveriesInProgress && (d.status === 'Em Trânsito' || d.status === 'Pendente')) return true;
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
        value={<HighlightText text="1.250" highlight={globalSearchTerm} />}
        trend="+12.5%" 
        trendUp={true}
        color="blue" 
      />
      <StatCard 
        icon={ShoppingBag} 
        label={<HighlightText text="Total de Pedidos" highlight={globalSearchTerm} />}
        value={<HighlightText text="450" highlight={globalSearchTerm} />}
        trend="+8.2%" 
        trendUp={true}
        color="emerald" 
      />
      <StatCard 
        icon={DollarSign} 
        label={<HighlightText text="Receita Mensal" highlight={globalSearchTerm} />}
        value={<HighlightText text="R$ 125k" highlight={globalSearchTerm} />}
        trend="-2.4%" 
        trendUp={false}
        color="amber" 
      />
      <StatCard 
        icon={TrendingUp} 
        label={<HighlightText text="Lucro Líquido" highlight={globalSearchTerm} />}
        value={<HighlightText text="R$ 32.5k" highlight={globalSearchTerm} />}
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
            {topProducts.map((product) => (
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

const ProductsScreen = ({ globalSearchTerm }) => {
  const [isCreateProductModalOpen, setIsCreateProductModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [products, setProducts] = useState([
    { id: 1, name: 'Óleo Motor 5W30', description: 'Óleo sintético de alta performance', price: '48,00', promotionalPrice: '', stock: '120', category: 'Óleos', sku: 'OL-5W30', image: null },
    { id: 2, name: 'Filtro de Ar Esportivo', description: 'Filtro lavável de alto fluxo', price: '125,00', promotionalPrice: '110,00', stock: '85', category: 'Filtros', sku: 'FIL-AR-01', image: null },
    { id: 3, name: 'Kit Pastilha de Freio', description: 'Cerâmica, dianteira', price: '180,00', promotionalPrice: '', stock: '60', category: 'Freios', sku: 'FRE-001', image: null },
    { id: 4, name: 'Amortecedor Traseiro', description: 'Gás pressurizado', price: '250,00', promotionalPrice: '', stock: '45', category: 'Suspensão', sku: 'SUS-TR-02', image: null },
    { id: 5, name: 'Bateria 60Ah', description: 'Livre de manutenção', price: '350,00', promotionalPrice: '320,00', stock: '32', category: 'Elétrica', sku: 'BAT-60', image: null },
  ]);

  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    promotionalPrice: '',
    stock: '',
    category: '',
    sku: '',
    image: null
  });

  const uniqueCategories = React.useMemo(() => {
    return [...new Set(products.map(p => p.category).filter(Boolean))].sort();
  }, [products]);

  const filteredProducts = products.filter(product => {
    const term = globalSearchTerm || '';
    const matchesSearch = product.name.toLowerCase().includes(term.toLowerCase()) ||
    product.category.toLowerCase().includes(term.toLowerCase()) ||
    product.sku.toLowerCase().includes(term.toLowerCase());

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
        setNewProduct(prev => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProduct = () => {
    if (isEditing) {
      setProducts(prev => prev.map(p => p.id === newProduct.id ? newProduct : p));
      console.log("Updating product:", newProduct);
      alert("Produto atualizado com sucesso!");
    } else {
      const productWithId = { ...newProduct, id: Date.now() };
      setProducts(prev => [...prev, productWithId]);
      console.log("Creating product:", productWithId);
      alert("Produto cadastrado com sucesso!");
    }
    
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
        image: null
    });
  };

  const handleEditProduct = (product) => {
    setNewProduct(product);
    setIsEditing(true);
    setIsCreateProductModalOpen(true);
  };

  const handleDeleteProduct = (id) => {
    if (window.confirm('Tem certeza que deseja excluir este produto?')) {
      setProducts(prev => prev.filter(p => p.id !== id));
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

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 font-parkinsans">Gerenciar Produtos</h1>
        <button onClick={handleNewProduct} className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30">
          <Plus size={20} /> Novo Produto
        </button>
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
  const [highlights, setHighlights] = useState([
    { id: 1, title: 'Promoção de Freio 1', description: 'Desconto imperdível em todo o setor de freios.', expiration: '2024-12-25', image: null },
    { id: 2, title: 'Promoção de Freio 2', description: 'Compre 2 leve 3 em pastilhas selecionadas.', expiration: '2024-12-25', image: null },
    { id: 3, title: 'Promoção de Freio 3', description: 'Troca de óleo grátis na compra do kit completo.', expiration: '2024-12-25', image: null },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [highlightToDelete, setHighlightToDelete] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newHighlight, setNewHighlight] = useState({
    id: null,
    title: '',
    description: '',
    expiration: '',
    image: null
  });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewHighlight(prev => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveHighlight = () => {
    if (isEditing) {
      setHighlights(prev => prev.map(h => h.id === newHighlight.id ? newHighlight : h));
      alert("Destaque atualizado com sucesso!");
    } else {
      const highlightWithId = { ...newHighlight, id: Date.now() };
      setHighlights(prev => [...prev, highlightWithId]);
      alert("Destaque criado com sucesso!");
    }
    closeModal();
  };

  const handleDeleteHighlight = (id) => {
    setHighlightToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (highlightToDelete) {
      setHighlights(prev => prev.filter(h => h.id !== highlightToDelete));
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

const UsersScreen = ({ globalSearchTerm }) => {
  const [users, setUsers] = useState([
    { id: 1, name: 'João Silva', email: 'joao@example.com', role: 'Cliente', status: 'Ativo', visits: 15, totalSpent: 2450.00, lastVisit: '2024-03-10' },
    { id: 2, name: 'Maria Souza', email: 'maria@example.com', role: 'Administrador', status: 'Ativo', visits: 142, totalSpent: 0.00, lastVisit: '2024-03-12' },
    { id: 3, name: 'Carlos Oliveira', email: 'carlos@example.com', role: 'Cliente', status: 'Inativo', visits: 3, totalSpent: 450.50, lastVisit: '2024-01-15' },
  ]);

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

  const handleSaveUser = () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      alert("Por favor, preencha todos os campos.");
      return;
    }

    const userToAdd = {
      id: Date.now(),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      status: 'Ativo',
      visits: 0,
      totalSpent: 0,
      lastVisit: '-'
    };

    setUsers(prev => [...prev, userToAdd]);
    setIsModalOpen(false);
    setNewUser({ name: '', email: '', password: '', role: 'Administrador' });
    alert("Administrador criado com sucesso!");
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
                   <div className="mt-0.5"><Info size={16} /></div>
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

const DeliveriesScreen = ({ globalSearchTerm }) => {
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const filteredDeliveries = mockDeliveries.filter(d => 
    d.client.toLowerCase().includes(globalSearchTerm.toLowerCase()) ||
    d.items.toLowerCase().includes(globalSearchTerm.toLowerCase()) ||
    d.id.toString().includes(globalSearchTerm)
  );

  const handleOpenDetails = (delivery) => {
    setSelectedDelivery(delivery);
    setIsDetailsModalOpen(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Entregue': return 'bg-green-100 text-green-800 border-green-200';
      case 'Em Trânsito': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Pendente': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 font-parkinsans">Controle de Entregas</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDeliveries.map((delivery) => (
           <div key={delivery.id} className={`bg-white p-6 rounded-xl shadow-sm border border-slate-100 border-l-4 ${delivery.status === 'Entregue' ? 'border-l-green-500' : delivery.status === 'Em Trânsito' ? 'border-l-yellow-400' : 'border-l-blue-500'}`}>
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
              
              <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
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

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end shrink-0">
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

// --- APP PRINCIPAL ---

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');

  const deliveryRequests = mockDeliveries.filter(d => d.status === 'Pendente' || d.status === 'Em Trânsito');

  const renderContent = () => {
    switch (activeTab) {
      case 'Dashboard': return <DashboardScreen globalSearchTerm={globalSearchTerm} />;
      case 'Produtos': return <ProductsScreen globalSearchTerm={globalSearchTerm} />;
      case 'Destaques': return <HighlightsScreen globalSearchTerm={globalSearchTerm} />;
      case 'Usuários': return <UsersScreen globalSearchTerm={globalSearchTerm} />;
      case 'Entregas': return <DeliveriesScreen globalSearchTerm={globalSearchTerm} />;
      default: return <DashboardScreen globalSearchTerm={globalSearchTerm} />;
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
                  <img src="/src/assets/logo.png" alt="Atadiesel" className="h-14 w-auto object-contain transition-all hover:scale-105" />
                ) : (
                  <img src="/src/assets/logoso.png" alt="Atadiesel" className="h-10 w-auto object-contain transition-all hover:scale-110" />
                )}
             </div>
          </div>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-700">
          <SidebarItem icon={LayoutDashboard} label="Visão Geral" active={activeTab === 'Dashboard'} onClick={() => setActiveTab('Dashboard')} isOpen={isSidebarOpen} />
          <SidebarItem icon={Package} label="Produtos" active={activeTab === 'Produtos'} onClick={() => setActiveTab('Produtos')} isOpen={isSidebarOpen} />
          <SidebarItem icon={Star} label="Destaques" active={activeTab === 'Destaques'} onClick={() => setActiveTab('Destaques')} isOpen={isSidebarOpen} />
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