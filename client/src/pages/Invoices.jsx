// Invoices listing page showing all billing files
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api';
import Sidebar from '../components/Sidebar';

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const response = await api.get('/invoices');
        setInvoices(response.data);
      } catch (err) {
        console.error('Error fetching invoices list:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, []);

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <div className="header-row">
          <div>
            <h1 className="page-title">Invoices</h1>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginTop: '2px' }}>
              Manage all customer bills and payment tracking
            </div>
          </div>
          <Link to="/invoices/new" className="btn btn-primary">
            + New Invoice
          </Link>
        </div>

        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div className="table-responsive">
            <table style={{ margin: '0' }}>
              <thead>
                <tr>
                  <th style={{ paddingLeft: '24px' }}>Invoice Number</th>
                  <th>Client</th>
                  <th>Issue Date</th>
                  <th>Due Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th style={{ paddingRight: '24px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td style={{ paddingLeft: '24px', fontWeight: '700' }}>{inv.invoice_number}</td>
                    <td>{inv.client_name}</td>
                    <td>{new Date(inv.issue_date).toLocaleDateString('en-IN')}</td>
                    <td>{new Date(inv.due_date).toLocaleDateString('en-IN')}</td>
                    <td style={{ fontWeight: '700' }}>₹{Number(inv.total).toFixed(2)}</td>
                    <td>
                      <span className={`badge ${inv.status}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td style={{ paddingRight: '24px', textAlign: 'right' }}>
                      <Link to={`/invoices/${inv.id}`} className="btn btn-secondary btn-small">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && !loading && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-secondary)' }}>
                      No invoices found. Generate a new invoice to begin.
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-secondary)' }}>
                      Loading invoices list...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Invoices;
