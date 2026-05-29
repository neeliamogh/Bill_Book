// Admin portal page displaying database tables of clients, invoices, and payments
import React, { useEffect, useState } from 'react';
import api from '../api/api';
import Sidebar from '../components/Sidebar';

const Admin = () => {
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('clients'); // clients, invoices, payments

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const clientsRes = await api.get('/clients');
        setClients(clientsRes.data);

        const invoicesRes = await api.get('/invoices');
        setInvoices(invoicesRes.data);

        const paymentsRes = await api.get('/payments');
        setPayments(paymentsRes.data);
      } catch (err) {
        console.error('Error fetching admin database snapshot:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllData();
  }, []);

  if (loading) {
    return (
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <div style={{ textAlign: 'center', marginTop: '100px', fontWeight: 'bold', color: 'var(--color-text-secondary)' }}>
            Loading master database snapshot...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <div className="header-row">
          <div>
            <h1 className="page-title">Database Admin</h1>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginTop: '2px' }}>
              Full database snapshot view of all records (Read-Only)
            </div>
          </div>
        </div>

        {/* Tab Toggle Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          marginBottom: '24px', 
          borderBottom: '1px solid var(--color-border)', 
          paddingBottom: '12px' 
        }}>
          <button
            onClick={() => setActiveTab('clients')}
            className={`btn ${activeTab === 'clients' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Clients ({clients.length})
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`btn ${activeTab === 'invoices' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Invoices ({invoices.length})
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`btn ${activeTab === 'payments' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Payments ({payments.length})
          </button>
        </div>

        {/* Tab View Tables */}
        {activeTab === 'clients' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--color-border)' }}>
              <h3 className="card-title" style={{ margin: 0 }}>Clients Master</h3>
            </div>
            
            <div className="table-responsive">
              <table style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th style={{ paddingLeft: '24px' }}>Client ID</th>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Address</th>
                    <th style={{ paddingRight: '24px' }}>GSTIN</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map(c => (
                    <tr key={c.id}>
                      <td style={{ paddingLeft: '24px', color: 'var(--color-text-secondary)' }}>{c.id}</td>
                      <td style={{ fontWeight: '700' }}>{c.name}</td>
                      <td>{c.phone}</td>
                      <td>{c.email || '-'}</td>
                      <td>{c.address || '-'}</td>
                      <td style={{ paddingRight: '24px' }}>{c.gstin || '-'}</td>
                    </tr>
                  ))}
                  {clients.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-secondary)' }}>
                        No client records exist in database.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--color-border)' }}>
              <h3 className="card-title" style={{ margin: 0 }}>Invoices Master</h3>
            </div>
            
            <div className="table-responsive">
              <table style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th style={{ paddingLeft: '24px' }}>Invoice ID</th>
                    <th>Invoice No.</th>
                    <th>Client Name</th>
                    <th>Issue Date</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th style={{ paddingRight: '24px', textAlign: 'right' }}>Grand Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id}>
                      <td style={{ paddingLeft: '24px', color: 'var(--color-text-secondary)' }}>{inv.id}</td>
                      <td style={{ fontWeight: '700' }}>{inv.invoice_number}</td>
                      <td>{inv.client_name}</td>
                      <td>{new Date(inv.issue_date).toLocaleDateString('en-IN')}</td>
                      <td>{new Date(inv.due_date).toLocaleDateString('en-IN')}</td>
                      <td>
                        <span className={`badge ${inv.status}`}>{inv.status}</span>
                      </td>
                      <td style={{ paddingRight: '24px', textAlign: 'right', fontWeight: '700' }}>
                        ₹{Number(inv.total).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {invoices.length === 0 && (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-secondary)' }}>
                        No invoice records exist in database.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--color-border)' }}>
              <h3 className="card-title" style={{ margin: 0 }}>Payments Master</h3>
            </div>
            
            <div className="table-responsive">
              <table style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th style={{ paddingLeft: '24px' }}>Payment ID</th>
                    <th>Invoice No.</th>
                    <th>Client Name</th>
                    <th>Receipt Date</th>
                    <th>Method</th>
                    <th>Reference / Note</th>
                    <th style={{ paddingRight: '24px', textAlign: 'right' }}>Amount Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id}>
                      <td style={{ paddingLeft: '24px', color: 'var(--color-text-secondary)' }}>{p.id}</td>
                      <td style={{ fontWeight: '700' }}>{p.invoice_number}</td>
                      <td>{p.client_name}</td>
                      <td>{new Date(p.payment_date).toLocaleDateString('en-IN')}</td>
                      <td>
                        <span className="badge" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-primary)' }}>
                          {p.method}
                        </span>
                      </td>
                      <td>{p.note || '-'}</td>
                      <td style={{ paddingRight: '24px', textAlign: 'right', fontWeight: '700', color: 'var(--color-success)' }}>
                        ₹{Number(p.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {payments.length === 0 && (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-secondary)' }}>
                        No payment records exist in database.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
