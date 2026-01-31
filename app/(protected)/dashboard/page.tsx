

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/lib/supabase';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

/* ================= TYPES ================= */
type DateFilter = 'today' | 'week' | 'month' | 'year' | 'custom';

/* ================= PAGE ================= */

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  
  // Date Filter State
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  // Sales metrics
  const [totalSO, setTotalSO] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalReturn, setTotalReturn] = useState(0);
  const [returnValue, setReturnValue] = useState(0);
  
  // Delivery metrics
  const [totalDeliveries, setTotalDeliveries] = useState(0);
  const [pendingDeliveries, setPendingDeliveries] = useState(0);
  const [processedDeliveries, setProcessedDeliveries] = useState(0);
  
  // Payment metrics
  const [totalDO, setTotalDO] = useState(0);
  const [doDibayar, setDoDibayar] = useState(0);
  const [doBelumDibayar, setDoBelumDibayar] = useState(0);
  const [overduePayments, setOverduePayments] = useState(0);
  const [totalUnpaid, setTotalUnpaid] = useState(0);
  
  // Master data
  const [totalStaff, setTotalStaff] = useState(0);
  const [totalDrivers, setTotalDrivers] = useState(0);
  const [totalVehicles, setTotalVehicles] = useState(0);
  
  // Charts
  const [soTrend, setSoTrend] = useState<number[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<number[]>([]);
  const [topCustomers, setTopCustomers] = useState<{ name: string; total: number }[]>([]);

  useEffect(() => {
    fetchDashboard();
  }, [dateFilter, customStartDate, customEndDate]);

  // Get date range based on filter
  const getDateRange = (): { startDate: Date; endDate: Date } => {
    const now = new Date();
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    let startDate = new Date();

    switch (dateFilter) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate);
          startDate.setHours(0, 0, 0, 0);
          return { 
            startDate, 
            endDate: new Date(new Date(customEndDate).setHours(23, 59, 59, 999))
          };
        }
        // Fallback to month if custom dates not set
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        break;
    }

    return { startDate, endDate };
  };

  async function fetchDashboard() {
    setLoading(true);
    
    try {
      console.log('🔄 Fetching dashboard data...');

      const { startDate, endDate } = getDateRange();
      const startDateStr = startDate.toISOString();
      const endDateStr = endDate.toISOString();

      console.log('📅 Date range:', { startDate: startDateStr, endDate: endDateStr });

      // Fetch all data in parallel
      const [
        salesOrdersRes,
        allDeliveriesRes,
        returnsRes,
        paymentsRes,
        staffsRes,
        vehiclesRes
      ] = await Promise.all([
        // FIXED: sales_orders table - with date filter for metrics
        supabase
          .from('sales_orders')
          .select('id, so_number, order_date, customer_id')
          .gte('order_date', startDateStr)
          .lte('order_date', endDateStr)
          .order('order_date', { ascending: true }),
        
        // FIXED: delivery_orders table - GET ALL deliveries (no date filter for payments)
        supabase
          .from('delivery_orders')
          .select('id, sj_number, status, delivery_date, created_at, sales_order_id')
          .order('delivery_date', { ascending: false }),
        
        // FIXED: delivery_return_items table (this is the returns table)
        supabase
          .from('delivery_return_items')
          .select('id, return_pcs, created_at, delivery_order_id, product_id')
          .gte('created_at', startDateStr)
          .lte('created_at', endDateStr),
        
        // FIXED: payments table - GET ALL payments (no filter)
        supabase
          .from('payments')
          .select('id, delivery_order_id, status, created_at'),
        
        // Staff (excluding drivers)
        supabase
          .from('staff')
          .select('id, posisi, status'),
        
        // Vehicles
        supabase
          .from('vehicles')
          .select('id, status')
      ]);

      console.log('📊 Data fetched:', {
        salesOrders: salesOrdersRes.data?.length,
        allDeliveries: allDeliveriesRes.data?.length,
        returns: returnsRes.data?.length,
        payments: paymentsRes.data?.length,
        staff: staffsRes.data?.length,
        vehicles: vehiclesRes.data?.length
      });

      // ============ Process Sales Orders ============
      const salesOrders = salesOrdersRes.data || [];
      setTotalSO(salesOrders.length);
      
      // Calculate revenue from sales_order_items
      let totalRev = 0;
      if (salesOrders.length > 0) {
        const soIds = salesOrders.map(so => so.id);
        const { data: soItems } = await supabase
          .from('sales_order_items')
          .select('sales_order_id, total_price')
          .in('sales_order_id', soIds);
        
        totalRev = (soItems || []).reduce((sum, item) => sum + (item.total_price || 0), 0);
      }
      setTotalRevenue(totalRev);

      // ============ Process Deliveries ============
      const allDeliveries = allDeliveriesRes.data || [];

      const { data: deliveryOrdersForPending } = await supabase
  .from('delivery_orders')
  .select('sales_order_id');

const processedSO = new Set(
  (deliveryOrdersForPending ?? []).map(d => d.sales_order_id)
);

const pendingSO = (salesOrders ?? []).filter(
  so => !processedSO.has(so.id)
);


const pendingCount = pendingSO.length;
const processedCount = deliveryOrdersForPending?.length ?? 0;
      
      // Filter deliveries by date range for metrics
      // Filter deliveries by date range for DASHBOARD (pakai created_at)
    const deliveries = (allDeliveries ?? []).filter(d => {
  // ambil tanggal terbaik
  const rawDate = d.delivery_date || d.created_at;

  // kalau dua-duanya null → anggap valid (jangan dibuang)
  if (!rawDate) return true;

  const date = new Date(rawDate);

  // kalau tanggal invalid → jangan dibuang
  if (isNaN(date.getTime())) return true;

  return date >= startDate && date <= endDate;
});
      setTotalDeliveries(deliveries.length);
      
      const pending = deliveries.filter(d => d.status === 'pending' || !d.status).length;
      setPendingDeliveries(pending);
      setProcessedDeliveries(deliveries.length - pending);

      // ============ Process Returns ============
      const returnItems = returnsRes.data || [];
      setTotalReturn(returnItems.length);
      
      // Calculate return value - need to get prices from sales_order_items
     
      let returnVal = 0;

if (returnItems.length > 0) {
  const deliveryIds = [...new Set(returnItems.map(r => r.delivery_order_id))];

  const { data: deliveryOrders } = await supabase
    .from('delivery_orders')
    .select('id, sales_order_id')
    .in('id', deliveryIds);

  if (deliveryOrders?.length) {
    const deliveryMap = new Map(
      deliveryOrders.map(d => [d.id, d.sales_order_id])
    );

    const soIds = [...new Set(
      deliveryOrders
        .map(d => d.sales_order_id)
        .filter((id): id is string => Boolean(id))
    )];

    const { data: soItems } = await supabase
      .from('sales_order_items')
      .select('sales_order_id, product_id, total_price, total_pcs')
      .in('sales_order_id', soIds);

    returnItems.forEach(returnItem => {
      const soId = deliveryMap.get(returnItem.delivery_order_id);
      if (!soId) return;

      const soItem = soItems?.find(
        item =>
          item.sales_order_id === soId &&
          item.product_id === returnItem.product_id
      );

      if (!soItem) return;

      const totalPcs = soItem.total_pcs ?? 0;
      const totalPrice = soItem.total_price ?? 0;
      const returnPcs = returnItem.return_pcs ?? 0;

      if (totalPcs <= 0 || returnPcs <= 0) return;

      const hargaSatuan = totalPrice / totalPcs;
      returnVal += hargaSatuan * returnPcs;
    });
  }
}

setReturnValue(returnVal);

      // ============ Process Payments (like the payment route) ============
      const now = new Date();
      const payments = paymentsRes.data || [];
      
      // Use ALL deliveries for payment metrics (not filtered by date)
      setTotalDO(allDeliveries.length);
      
      // Create a map of delivery_order_id to payment status
      const paymentMap = new Map<string, string>();
      payments.forEach(p => {
        paymentMap.set(p.delivery_order_id, p.status);
      });
      
      // Count paid vs unpaid deliveries
      let paidCount = 0;
      let unpaidCount = 0;
      let overdueCount = 0;
      let totalUnpaidAmount = 0;
      
      for (const delivery of allDeliveries) {
        const paymentStatus = paymentMap.get(delivery.id) ?? 'unpaid';
        
        if (paymentStatus === 'paid') {
          paidCount++;
        } else {
          unpaidCount++;
          
          // Calculate overdue
          const sjDate = delivery.delivery_date ? new Date(delivery.delivery_date) : null;
          const overdueDays = sjDate
            ? Math.max(0, Math.floor((now.getTime() - sjDate.getTime()) / (1000 * 60 * 60 * 24)))
            : 0;
          
          if (overdueDays > 5) {
            overdueCount++;
          }
          
          // Calculate total tagihan (same logic as payment route)
          if (delivery.sales_order_id) {
            const { data: soItems } = await supabase
              .from('sales_order_items')
              .select('total_price, total_pcs')
              .eq('sales_order_id', delivery.sales_order_id);
            
            const subtotal = soItems?.reduce((s, i) => s + (i.total_price ?? 0), 0) ?? 0;
            
            const { data: retur } = await supabase
              .from('delivery_return_items')
              .select('return_pcs')
              .eq('delivery_order_id', delivery.id);
            
            const returPcs = retur?.reduce((s, r) => s + (r.return_pcs ?? 0), 0) ?? 0;
            const totalPcs = soItems?.reduce((s, i) => s + (i.total_pcs ?? 0), 0) ?? 0;
            const hargaSatuan = totalPcs > 0 ? Math.round(subtotal / totalPcs) : 0;
            const totalRetur = returPcs * hargaSatuan;
            const totalTagihan = subtotal - totalRetur;
            
            totalUnpaidAmount += totalTagihan;
          }
        }
      }
      
      setDoDibayar(paidCount);
      setDoBelumDibayar(unpaidCount);
      setOverduePayments(overdueCount);
      setTotalUnpaid(totalUnpaidAmount);

      // ============ Process Staff (exclude drivers) ============
      const staffs = staffsRes.data || [];
      const activeStaff = staffs.filter(s => s.status === 'active');
      
      const drivers = activeStaff.filter(s => 
        s.posisi?.toLowerCase().includes('supir') || 
        s.posisi?.toLowerCase().includes('driver')
      );
      setTotalDrivers(drivers.length);
      
      // Staff excluding drivers
      const nonDriverStaff = activeStaff.filter(s => 
        !(s.posisi?.toLowerCase().includes('supir') || s.posisi?.toLowerCase().includes('driver'))
      );
      setTotalStaff(nonDriverStaff.length);

      // ============ Process Vehicles ============
      const vehicles = vehiclesRes.data || [];
      const activeVehicles = vehicles.filter(v => v.status === 'active');
      setTotalVehicles(activeVehicles.length);

      // ============ Calculate trends (last 12 months) ============
      const monthlyData: Record<string, { count: number; revenue: number }> = {};
      
      // Get all sales orders for trend (last 12 months regardless of filter)
      const trendStartDate = new Date();
      trendStartDate.setMonth(trendStartDate.getMonth() - 11);
      trendStartDate.setDate(1);
      
      const { data: allSalesOrders } = await supabase
        .from('sales_orders')
        .select('id, order_date')
        .gte('order_date', trendStartDate.toISOString())
        .order('order_date', { ascending: true });
      
      // Get sales order items for revenue calculation
      const allSOIds = (allSalesOrders || []).map(so => so.id);
      const { data: allSOItems } = await supabase
        .from('sales_order_items')
        .select('sales_order_id, total_price')
        .in('sales_order_id', allSOIds);
      
      // Map revenue by sales order
      const revenueMap = new Map<string, number>();
      (allSOItems || []).forEach(item => {
        const current = revenueMap.get(item.sales_order_id) || 0;
        revenueMap.set(item.sales_order_id, current + (item.total_price || 0));
      });
      
      (allSalesOrders || []).forEach(so => {
        const date = new Date(so.order_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { count: 0, revenue: 0 };
        }
        
        monthlyData[monthKey].count++;
        monthlyData[monthKey].revenue += (revenueMap.get(so.id) || 0);
      });

      // Get last 12 months
      const months: string[] = [];
      const now2 = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now2.getFullYear(), now2.getMonth() - i, 1);
        months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }

      const soTrendData = months.map(m => monthlyData[m]?.count || 0);
      const revTrendData = months.map(m => monthlyData[m]?.revenue || 0);

      setSoTrend(soTrendData);
      setRevenueTrend(revTrendData);

      // ============ Calculate top 5 customers (suppliers) ============
      const { data: customers } = await supabase
        .from('customers')
        .select('id, name');

      const customerMap: Record<string, { name: string; total: number }> = {};
      
      // Use filtered sales orders for top customers
      salesOrders.forEach(so => {
        const customer = customers?.find(c => c.id === so.customer_id);
        const customerName = customer?.name || 'Unknown';
        
        if (!customerMap[customerName]) {
          customerMap[customerName] = { name: customerName, total: 0 };
        }
      });
      
      // Add revenue to customers
      if (salesOrders.length > 0) {
        const soIds = salesOrders.map(so => so.id);
        const { data: soItems } = await supabase
          .from('sales_order_items')
          .select('sales_order_id, total_price')
          .in('sales_order_id', soIds);
        
        // Map items to sales orders
        const soRevenueMap = new Map<string, number>();
        (soItems || []).forEach(item => {
          const current = soRevenueMap.get(item.sales_order_id) || 0;
          soRevenueMap.set(item.sales_order_id, current + (item.total_price || 0));
        });
        
        salesOrders.forEach(so => {
          const customer = customers?.find(c => c.id === so.customer_id);
          const customerName = customer?.name || 'Unknown';
          customerMap[customerName].total += (soRevenueMap.get(so.id) || 0);
        });
      }

      const top5 = Object.values(customerMap)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
      
      setTopCustomers(top5);

      console.log('✅ Dashboard data loaded successfully');

    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
    }

    setLoading(false);
  }

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Generate month labels
  const getMonthLabels = () => {
    const labels: string[] = [];
    const now = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(months[d.getMonth()]);
    }
    
    return labels;
  };

  // Chart configurations
  const salesTrendChart = {
    labels: getMonthLabels(),
    datasets: [
      {
        label: 'Sales Orders',
        data: soTrend,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5
      }
    ]
  };

  const revenueTrendChart = {
    labels: getMonthLabels(),
    datasets: [
      {
        label: 'Revenue (Millions)',
        data: revenueTrend.map(v => v / 1000000),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: '#22c55e',
        borderWidth: 1
      }
    ]
  };

  const topCustomersChart = {
    labels: topCustomers.map(c => c.name),
    datasets: [
      {
        label: 'Total Orders Value (M)',
        data: topCustomers.map(c => c.total / 1000000),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(249, 115, 22, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(236, 72, 153, 0.8)'
        ],
        borderWidth: 0
      }
    ]
  };

  const deliveryStatusChart = {
    labels: ['Processed', 'Pending'],
    datasets: [
      {
        data: [processedDeliveries, pendingDeliveries],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(249, 115, 22, 0.8)'
        ],
        borderWidth: 0
      }
    ]
  };

  const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#64748b',
          font: {
            size: 12,
            family: "'Inter', sans-serif"
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        cornerRadius: 8
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          color: '#64748b'
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: '#64748b'
        }
      }
    }
  };

  const barChartOptions: any = {
    ...chartOptions,
    indexAxis: 'y'
  };

  const doughnutOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          color: '#64748b',
          padding: 15,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        cornerRadius: 8
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-slate-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Date Filter */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium text-slate-700">Filter Period:</span>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setDateFilter('today')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                dateFilter === 'today'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilter('week')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                dateFilter === 'week'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setDateFilter('month')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                dateFilter === 'month'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setDateFilter('year')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                dateFilter === 'year'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Year
            </button>
            <button
              onClick={() => setDateFilter('custom')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                dateFilter === 'custom'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Custom
            </button>
          </div>

          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2 ml-auto">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-slate-500">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics - Penjualan */}
      <div>
        <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
          <span className="w-1 h-6 bg-blue-600 rounded-full"></span>
          Penjualan
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-linear-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg shadow-blue-500/30">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total SO</p>
                <p className="text-4xl font-bold mt-2">{totalSO}</p>
                <p className="text-blue-100 text-xs mt-2">Sales Orders</p>
              </div>
              <div className="bg-white/20 rounded-lg p-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-linear-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg shadow-green-500/30">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-green-100 text-sm font-medium">Total Revenue</p>
                <p className="text-3xl font-bold mt-2">{formatCurrency(totalRevenue)}</p>
                <p className="text-green-100 text-xs mt-2">Total penjualan</p>
              </div>
              <div className="bg-white/20 rounded-lg p-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-linear-to-br from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg shadow-red-500/30">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-red-100 text-sm font-medium">Total Retur</p>
                <p className="text-4xl font-bold mt-2">{totalReturn} <span className="text-2xl">DO</span></p>
                <p className="text-red-100 text-xs mt-2">Return items</p>
              </div>
              <div className="bg-white/20 rounded-lg p-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-linear-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg shadow-orange-500/30">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-orange-100 text-sm font-medium">Rp Total Jumlah Retur</p>
                <p className="text-3xl font-bold mt-2">{formatCurrency(returnValue)}</p>
                <p className="text-orange-100 text-xs mt-2">Return value</p>
              </div>
              <div className="bg-white/20 rounded-lg p-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pembayaran */}
      <div>
        <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
          <span className="w-1 h-6 bg-orange-600 rounded-full"></span>
          Pembayaran
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium">Total DO</p>
                <p className="text-3xl font-bold text-slate-700 mt-2">{totalDO}</p>
                <p className="text-slate-400 text-xs mt-1">Delivery Orders</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-2">
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-linear-to-br from-green-50 to-green-100 rounded-xl p-6 shadow-sm border border-green-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-green-700 text-sm font-medium">DO Dibayar</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{doDibayar}</p>
                <p className="text-green-600 text-xs mt-1">Paid deliveries</p>
              </div>
              <div className="bg-green-200 rounded-lg p-2">
                <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-linear-to-br from-red-50 to-red-100 rounded-xl p-6 shadow-sm border border-red-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-red-700 text-sm font-medium">DO Belum Dibayar</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{doBelumDibayar}</p>
                <p className="text-red-600 text-xs mt-1">Unpaid deliveries</p>
              </div>
              <div className="bg-red-200 rounded-lg p-2">
                <svg className="w-6 h-6 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-linear-to-br from-orange-50 to-orange-100 rounded-xl p-6 shadow-sm border border-orange-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-orange-700 text-sm font-medium">Overdue &gt; 5 Hari</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">{overduePayments}</p>
                <p className="text-orange-600 text-xs mt-1">Late payments</p>
              </div>
              <div className="bg-orange-200 rounded-lg p-2">
                <svg className="w-6 h-6 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        
        {/* Total Unpaid Amount */}
        <div className="mt-4 bg-linear-to-br from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg shadow-red-500/30">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-red-100 text-sm font-medium">Total Unpaid (Rp)</p>
              <p className="text-4xl font-bold mt-2">{formatCurrency(totalUnpaid)}</p>
              <p className="text-red-100 text-xs mt-2">Outstanding payments</p>
            </div>
            <div className="bg-white/20 rounded-lg p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-700 mb-4">Statistik Sales (12 Bulan)</h3>
          <div className="h-80">
            <Line data={salesTrendChart} options={chartOptions} />
          </div>
        </div>

        {/* Revenue Trend */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-700 mb-4">Revenue Trend (12 Bulan)</h3>
          <div className="h-80">
            <Bar data={revenueTrendChart} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 5 Customers */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-700 mb-4">Top 5 Suppliers</h3>
          <div className="h-80">
            <Bar data={topCustomersChart} options={barChartOptions} />
          </div>
        </div>

        {/* Master Data & Delivery Status */}
        <div className="space-y-6">
          {/* Delivery Status */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-700 mb-4">Delivery Status</h3>
            <div className="h-48">
              <Doughnut data={deliveryStatusChart} options={doughnutOptions} />
            </div>
          </div>

          {/* Master Data Cards */}
          <div className="space-y-3">
            <div className="bg-linear-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white shadow-lg shadow-purple-500/30">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-purple-100 text-xs font-medium">Total Staff</p>
                  <p className="text-3xl font-bold mt-1">{totalStaff}</p>
                </div>
                <div className="bg-white/20 rounded-lg p-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-linear-to-r from-indigo-500 to-indigo-600 rounded-lg p-4 text-white shadow-lg shadow-indigo-500/30">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-indigo-100 text-xs font-medium">Total Supir</p>
                  <p className="text-3xl font-bold mt-1">{totalDrivers}</p>
                </div>
                <div className="bg-white/20 rounded-lg p-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-linear-to-r from-cyan-500 to-cyan-600 rounded-lg p-4 text-white shadow-lg shadow-cyan-500/30">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-cyan-100 text-xs font-medium">Total Mobil</p>
                  <p className="text-3xl font-bold mt-1">{totalVehicles}</p>
                </div>
                <div className="bg-white/20 rounded-lg p-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Deliveries Overview */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-700 mb-4">Deliveries Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-sm font-medium">Total Deliveries</p>
                <p className="text-3xl font-bold text-slate-700 mt-2">{totalDeliveries}</p>
              </div>
              <div className="bg-slate-200 rounded-lg p-2">
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-orange-600 text-sm font-medium">Pending Deliveries</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">{pendingDeliveries}</p>
              </div>
              <div className="bg-orange-200 rounded-lg p-2">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-green-600 text-sm font-medium">Processed Deliveries</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{processedDeliveries}</p>
              </div>
              <div className="bg-green-200 rounded-lg p-2">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        
        body {
          font-family: 'Inter', sans-serif;
        }
      `}</style>
    </div>
  );
}
