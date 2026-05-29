// Detailed invoice bill visualization and payments manager
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/api';
import Sidebar from '../components/Sidebar';

const apiBaseUrl = import.meta.env.VITE_API_URL || (window.location.port === '5173' ? 'http://localhost:5000' : '');

const InvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Recording states
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('UPI');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentNote, setPaymentNote] = useState('');
  const [overridePhone, setOverridePhone] = useState('');
  const [useWhatsappDesktop, setUseWhatsappDesktop] = useState(() => {
    return localStorage.getItem('useWhatsappDesktop') === 'true';
  });

  const handleToggleWhatsappMode = (e) => {
    const newVal = e.target.checked;
    setUseWhatsappDesktop(newVal);
    localStorage.setItem('useWhatsappDesktop', String(newVal));
  };

  const fetchDetails = async () => {
    try {
      const response = await api.get(`/invoices/${id}`);
      setData(response.data);
      
      const totalPaid = response.data.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const outstanding = parseFloat(response.data.invoice.total) - totalPaid;
      setAmount(outstanding > 0 ? outstanding.toFixed(2) : '');
      setOverridePhone(response.data.invoice.client_phone || '');
    } catch (err) {
      console.error('Error retrieving invoice details:', err);
      setError('Invoice not found or server fetch failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    try {
      await api.patch(`/invoices/${id}/status`, { status: newStatus });
      fetchDetails();
    } catch (err) {
      console.error('Failed status patch:', err);
      alert('Error updating status.');
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid positive payment amount.');
      return;
    }

    try {
      await api.post('/payments', {
        invoice_id: parseInt(id),
        amount: parseFloat(amount),
        payment_date: paymentDate,
        method: method,
        note: paymentNote
      });

      setPaymentNote('');
      fetchDetails();
    } catch (err) {
      console.error('Payment recording failed:', err);
      alert(err.response?.data?.error || 'Failed to log transaction.');
    }
  };

  const handleDeleteClick = async () => {
    if (!window.confirm('Confirm delete. This action will permanently remove this invoice and its corresponding PDF.')) {
      return;
    }
    try {
      await api.delete(`/invoices/${id}`);
      navigate('/invoices');
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Could not delete invoice.');
    }
  };

  const triggerPdfDownload = () => {
    window.open(`${apiBaseUrl}/api/invoices/${id}/pdf`, '_blank');
  };

  if (loading) {
    return (
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <div style={{ textAlign: 'center', marginTop: '100px', fontWeight: 'bold', color: 'var(--color-text-secondary)' }}>
            Loading invoice files...
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <div style={{ textAlign: 'center', marginTop: '100px', fontWeight: 'bold', color: 'var(--color-danger)' }}>
            {error || 'Data fetching error.'}
          </div>
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <Link to="/invoices" className="btn btn-secondary">Back to List</Link>
          </div>
        </div>
      </div>
    );
  }

  const { invoice, items, payments } = data;
  const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const outstanding = parseFloat(invoice.total) - totalPaid;

  const formatPhoneForWhatsapp = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return '91' + cleaned;
    }
    return cleaned;
  };

  const handleWhatsappClick = () => {
    // Delay download slightly to let the browser process the new WhatsApp tab first
    setTimeout(() => {
      const link = document.createElement('a');
      link.href = `${apiBaseUrl}/api/invoices/${id}/pdf`;
      link.setAttribute('download', '');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, 300);
  };

  const whatsappPhone = formatPhoneForWhatsapp(overridePhone);
  const whatsappUrl = useWhatsappDesktop
    ? `whatsapp://send?phone=+${whatsappPhone}`
    : `https://api.whatsapp.com/send?phone=${whatsappPhone}`;

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        
        {/* Header Metadata and Controls */}
        <div className="header-row">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 className="page-title">{invoice.invoice_number}</h1>
              <span className={`badge ${invoice.status}`}>{invoice.status}</span>
            </div>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginTop: '4px' }}>
              Client: <strong>{invoice.client_name}</strong> | Created: {new Date(invoice.created_at).toLocaleDateString('en-IN')}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={triggerPdfDownload} className="btn btn-secondary">
              Download PDF
            </button>
            <a 
              href={whatsappUrl} 
              target={useWhatsappDesktop ? undefined : "whatsapp_window"} 
              rel={useWhatsappDesktop ? undefined : "opener"}
              onClick={handleWhatsappClick}
              className="btn" 
              style={{ backgroundColor: '#EAF4DE', color: '#3B6D11', border: '1px solid #3B6D11', fontWeight: '700', textDecoration: 'none' }}
            >
              Send on WhatsApp
            </a>
            <button onClick={handleDeleteClick} className="btn btn-danger">
              Delete Invoice
            </button>
          </div>
        </div>

        {/* Balance Status & Quick State Switcher */}
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="form-group" style={{ margin: 0, flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
            <label htmlFor="stChanger" style={{ margin: 0 }}>Mark Status:</label>
            <select 
              id="stChanger" 
              value={invoice.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              style={{ width: '140px' }}
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          <div className="form-group" style={{ margin: 0, flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
            <label htmlFor="waPhoneInput" style={{ margin: 0 }}>WhatsApp Phone:</label>
            <input 
              type="text" 
              id="waPhoneInput" 
              value={overridePhone}
              onChange={(e) => setOverridePhone(e.target.value)}
              placeholder="WhatsApp Number"
              style={{ width: '160px', height: '36px' }}
            />
          </div>

          <div className="form-group" style={{ margin: 0, flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
            <input 
              type="checkbox" 
              id="waModeCheckbox" 
              checked={useWhatsappDesktop}
              onChange={handleToggleWhatsappMode}
              style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
            />
            <label htmlFor="waModeCheckbox" style={{ margin: 0, cursor: 'pointer', fontWeight: '600', fontSize: '13px', textTransform: 'none', letterSpacing: 'normal' }}>
              Use Desktop App
            </label>
          </div>
          
          <div style={{ fontSize: '14px', fontWeight: '700' }}>
            Remaining Dues: <span style={{ color: outstanding > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
              ₹{outstanding.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Real Invoice Bill Visualizer */}
        <div className="invoice-bill-container">
          <div className="invoice-bill-header">
            <div>
              <div className="invoice-bill-title">BillBook</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontStyle: 'italic', marginTop: '2px' }}>
                Smart Billing for Small Businesses
              </div>
            </div>
            
            <div className="invoice-bill-meta">
              <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>Bill Statement</div>
              <div><strong>Bill Ref:</strong> {invoice.invoice_number}</div>
              <div><strong>Issue Date:</strong> {new Date(invoice.issue_date).toLocaleDateString('en-IN')}</div>
              <div><strong>Due Date:</strong> {new Date(invoice.due_date).toLocaleDateString('en-IN')}</div>
            </div>
          </div>

          <div className="invoice-bill-parties">
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                Billing To:
              </div>
              <div style={{ fontSize: '15px', fontWeight: '700' }}>{invoice.client_name}</div>
              {invoice.client_address && (
                <div style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                  {invoice.client_address}
                </div>
              )}
              <div style={{ fontSize: '13px', marginTop: '4px' }}><strong>Contact:</strong> {invoice.client_phone}</div>
              {invoice.client_gstin && (
                <div style={{ fontSize: '13px', marginTop: '4px' }}><strong>GSTIN:</strong> {invoice.client_gstin}</div>
              )}
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                Billed From:
              </div>
              <div style={{ fontSize: '15px', fontWeight: '700' }}>Your Business Name</div>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginTop: '4px' }}>New Delhi, India</div>
              <div style={{ fontSize: '13px', marginTop: '4px' }}><strong>UPI ID:</strong> yourbusiness@upi</div>
            </div>
          </div>

          {/* Items List */}
          <table style={{ marginTop: '24px' }}>
            <thead>
              <tr>
                <th>Sr.</th>
                <th>Item Details</th>
                <th style={{ textAlign: 'right' }}>Unit</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Rate (₹)</th>
                <th style={{ textAlign: 'right' }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id}>
                  <td>{idx + 1}</td>
                  <td style={{ fontWeight: '700' }}>{item.description}</td>
                  <td style={{ textAlign: 'right', color: 'var(--color-text-secondary)' }}>{item.unit}</td>
                  <td style={{ textAlign: 'right', color: 'var(--color-text-secondary)' }}>{Number(item.quantity).toFixed(2)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--color-text-secondary)' }}>₹{Number(item.rate).toFixed(2)}</td>
                  <td style={{ textAlign: 'right', fontWeight: '700' }}>₹{Number(item.amount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Aggregates Row */}
          <div className="invoice-totals-section">
            <table className="invoice-totals-table">
              <tbody>
                <tr>
                  <td>Subtotal:</td>
                  <td>₹{Number(invoice.subtotal).toFixed(2)}</td>
                </tr>
                
                {Number(invoice.discount_amount) > 0 && (
                  <tr>
                    <td>Discount ({invoice.discount_percent}%):</td>
                    <td style={{ color: 'var(--color-primary)' }}>-₹{Number(invoice.discount_amount).toFixed(2)}</td>
                  </tr>
                )}

                {Number(invoice.igst_percent) > 0 ? (
                  <tr>
                    <td>IGST ({invoice.igst_percent}%):</td>
                    <td>₹{Number(invoice.tax_amount).toFixed(2)}</td>
                  </tr>
                ) : (
                  <>
                    <tr>
                      <td>CGST ({invoice.cgst_percent}%):</td>
                      <td>₹{(Number(invoice.tax_amount) / 2).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td>SGST ({invoice.sgst_percent}%):</td>
                      <td>₹{(Number(invoice.tax_amount) / 2).toFixed(2)}</td>
                    </tr>
                  </>
                )}
                
                <tr className="grand-total">
                  <td>Grand Total:</td>
                  <td>₹{Number(invoice.total).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Notes and UPI payment details */}
          <div style={{ display: 'flex', gap: '30px', marginTop: '40px', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div style={{ flex: 1 }}>
              {invoice.notes && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                    Notes & Payment Terms
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg)', padding: '10px', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                    {invoice.notes}
                  </div>
                </div>
              )}
            </div>

            <div className="upi-box" style={{ flex: 'none', width: '320px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div className="upi-title" style={{ width: '100%', textAlign: 'left' }}>Pay via PhonePe / UPI: yourbusiness@upi</div>
              <div className="upi-desc" style={{ width: '100%', textAlign: 'left', marginBottom: '12px' }}>
                Scan using PhonePe or any UPI App to complete payment. Specify invoice number <strong>{invoice.invoice_number}</strong> in references.
              </div>
              <img 
                src="/phonepe_qr.png" 
                alt="PhonePe QR Code" 
                style={{ width: '150px', height: 'auto', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '4px', backgroundColor: '#fff' }} 
              />
            </div>
          </div>
        </div>

        {/* Payments Ledger & Receipt Entry */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px', marginTop: '24px' }}>
          
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--color-border)' }}>
              <h3 className="card-title" style={{ margin: 0 }}>Payment Ledger</h3>
            </div>
            
            <div className="table-responsive">
              <table style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th style={{ paddingLeft: '24px' }}>Receipt Date</th>
                    <th>Payment Method</th>
                    <th>Reference note</th>
                    <th style={{ paddingRight: '24px', textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td style={{ paddingLeft: '24px' }}>{new Date(p.payment_date).toLocaleDateString('en-IN')}</td>
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
                      <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-secondary)' }}>
                        No transactions registered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title">Record Payment Receipt</h3>
            <form onSubmit={handlePaymentSubmit}>
              <div className="form-group">
                <label htmlFor="pAmount">Received Amount (₹)</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0.01"
                  id="pAmount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  disabled={outstanding <= 0}
                />
              </div>

              <div className="form-group">
                <label htmlFor="pMethod">Method</label>
                <select 
                  id="pMethod" 
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  disabled={outstanding <= 0}
                >
                  <option value="UPI">UPI</option>
                  <option value="bank transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="pDate">Receipt Date</label>
                <input 
                  type="date" 
                  id="pDate" 
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  disabled={outstanding <= 0}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label htmlFor="pNote">Reference / Note</label>
                <input 
                  type="text" 
                  id="pNote" 
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="e.g. Bank UTIB..."
                  disabled={outstanding <= 0}
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%' }}
                disabled={outstanding <= 0}
              >
                {outstanding <= 0 ? 'Paid in Full' : 'Log Transaction'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetail;
