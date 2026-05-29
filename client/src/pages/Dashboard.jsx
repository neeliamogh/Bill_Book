// Dashboard home page showing charts and overall metrics
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api';
import Sidebar from '../components/Sidebar';
import MetricCard from '../components/MetricCard';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const statsRes = await api.get('/dashboard/stats');
        setStats(statsRes.data);

        const invoicesRes = await api.get('/invoices');
        // Pull latest 5 invoices
        setRecentInvoices(invoicesRes.data.slice(0, 5));
      } catch (err) {
        console.error('Error fetching dashboard statistics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading || !stats) {
    return (
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <div style={{ textAlign: 'center', marginTop: '100px', fontWeight: 'bold', color: 'var(--color-text-secondary)' }}>
            Loading dashboard data...
          </div>
        </div>
      </div>
    );
  }

  // Chart styling colors (strict flat-theme, no blue/purple)
  const statusColors = {
    'Paid': '#639922',    // Green
    'Sent': '#EF9F27',    // Amber
    'Overdue': '#D85A30', // Coral/Red
    'Draft': '#888780'    // Gray
  };

  const revenueBreakdownData = [
    { name: 'Net Revenue', value: stats.total_revenue },
    { name: 'Tax Collected', value: stats.tax_collected },
    { name: 'Discounts Given', value: stats.total_discounts }
  ];

  const breakdownColors = ['#1D9E75', '#EF9F27', '#D85A30']; // Teal, Amber, Coral

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <div className="header-row">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginTop: '2px' }}>
              Overview of your business billing and collections
            </div>
          </div>
          <Link to="/invoices/new" className="btn btn-primary">
            + New Invoice
          </Link>
        </div>

        {/* 4 Metric Cards */}
        <div className="metrics-grid">
          <MetricCard 
            title="Total Revenue" 
            value={`₹${stats.total_revenue.toFixed(2)}`} 
            type="primary"
          />
          <MetricCard 
            title="Outstanding Amount" 
            value={`₹${stats.outstanding_amount.toFixed(2)}`} 
            type="danger"
          />
          <MetricCard 
            title="Total Invoices" 
            value={String(stats.total_invoices)} 
          />
          <MetricCard 
            title="Overdue Invoices" 
            value={String(stats.overdue_count)} 
            type={stats.overdue_count > 0 ? 'danger' : ''}
          />
        </div>

        {/* Grid for Monthly Revenue Bar Chart & Status Pie Chart */}
        <div className="charts-grid">
          <div className="chart-card">
            <div className="chart-title">Monthly Revenue (Last 6 Months)</div>
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.revenue_by_month} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fill: '#6B6A65', fontSize: 11 }} tickLine={false} />
                  <YAxis tick={{ fill: '#6B6A65', fontSize: 11 }} tickLine={false} />
                  <Tooltip formatter={(value) => `₹${value.toFixed(2)}`} />
                  <Bar dataKey="revenue" fill="#1D9E75" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-title">Invoices by Status</div>
            <div style={{ width: '100%', height: 240, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <ResponsiveContainer width="100%" height="70%">
                <PieChart>
                  <Pie
                    data={stats.status_breakdown.filter(i => i.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {stats.status_breakdown.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={statusColors[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Legend */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '10px' }}>
                {stats.status_breakdown.map((entry, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '700' }}>
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: statusColors[entry.name] }}></span>
                    {entry.name} ({entry.value})
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Second Grid for Revenue Breakdown Pie Chart & Recent Invoices Table */}
        <div className="charts-grid" style={{ gridTemplateColumns: '1.2fr 2fr' }}>
          <div className="chart-card">
            <div className="chart-title">Financial Breakdown</div>
            <div style={{ width: '100%', height: 260, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <ResponsiveContainer width="100%" height="65%">
                <PieChart>
                  <Pie
                    data={revenueBreakdownData.filter(i => i.value > 0)}
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    dataKey="value"
                  >
                    {revenueBreakdownData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={breakdownColors[idx % breakdownColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₹${value.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Value Table Legend */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', marginTop: '5px', fontSize: '11px' }}>
                {revenueBreakdownData.map((entry, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: breakdownColors[idx] }}></span>
                      {entry.name}
                    </div>
                    <div>₹{entry.value.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-title">Recent Invoices</div>
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Invoice No.</th>
                    <th>Client Name</th>
                    <th>Issue Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.map((inv) => (
                    <tr key={inv.id}>
                      <td style={{ fontWeight: '700' }}>{inv.invoice_number}</td>
                      <td>{inv.client_name}</td>
                      <td>{new Date(inv.issue_date).toLocaleDateString('en-IN')}</td>
                      <td style={{ fontWeight: '700' }}>₹{Number(inv.total).toFixed(2)}</td>
                      <td>
                        <span className={`badge ${inv.status}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td>
                        <Link to={`/invoices/${inv.id}`} className="btn btn-secondary btn-small">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {recentInvoices.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '16px', color: 'var(--color-text-secondary)' }}>
                        No invoices generated yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
