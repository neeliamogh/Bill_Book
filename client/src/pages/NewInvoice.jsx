// Invoice creator page with dynamic item grids and calculations
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import Sidebar from '../components/Sidebar';

const NewInvoice = () => {
  const navigate = useNavigate();
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientGstin, setClientGstin] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState('draft');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [gstType, setGstType] = useState('cgst_sgst'); // cgst_sgst vs igst
  const [notes, setNotes] = useState('');
  
  // Dynamic line items list
  const [items, setItems] = useState([
    { description: '', quantity: 1, unit: 'pcs', rate: 0 }
  ]);

  // Sync issue date changes with due date (default +14 days)
  useEffect(() => {
    if (issueDate) {
      const dateObj = new Date(issueDate);
      dateObj.setDate(dateObj.getDate() + 14);
      setDueDate(dateObj.toISOString().split('T')[0]);
    }
  }, [issueDate]);

  const handleAddItemRow = () => {
    setItems([...items, { description: '', quantity: 1, unit: 'pcs', rate: 0 }]);
  };

  const handleRemoveItemRow = (idx) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleItemValueChange = (idx, field, value) => {
    const updated = [...items];
    if (field === 'quantity') {
      updated[idx].quantity = parseFloat(value) || 0;
    } else if (field === 'rate') {
      updated[idx].rate = parseFloat(value) || 0;
    } else {
      updated[idx][field] = value;
    }
    setItems(updated);
  };

  // Math aggregates
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  const discountVal = parseFloat(discountPercent) || 0;
  const discountAmount = (subtotal * discountVal) / 100;
  const taxableAmount = subtotal - discountAmount;

  const cgstPercent = gstType === 'cgst_sgst' ? 9 : 0;
  const sgstPercent = gstType === 'cgst_sgst' ? 9 : 0;
  const igstPercent = gstType === 'igst' ? 18 : 0;

  const totalTaxPercent = cgstPercent + sgstPercent + igstPercent;
  const taxAmount = (taxableAmount * totalTaxPercent) / 100;
  const grandTotal = taxableAmount + taxAmount;

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!clientName || !clientPhone) {
      alert('Please enter Client Name and Mobile Number.');
      return;
    }

    if (items.some(item => !item.description || item.quantity <= 0 || item.rate < 0)) {
      alert('Please verify all line items contain a description and valid positive quantity.');
      return;
    }

    try {
      let resolvedClientId = null;

      // 1. Check if client with this phone number already exists
      try {
        const searchRes = await api.get(`/clients/search?phone=${clientPhone}`);
        resolvedClientId = searchRes.data.client.id;
      } catch (searchErr) {
        // If client not found (404), we create a new client
        if (searchErr.response && searchErr.response.status === 404) {
          const createClientRes = await api.post('/clients', {
            name: clientName,
            phone: clientPhone,
            email: clientEmail,
            address: clientAddress,
            gstin: clientGstin
          });
          resolvedClientId = createClientRes.data.id;
        } else {
          throw searchErr; // Re-throw any connection/server error
        }
      }

      // 2. Submit the invoice
      const payload = {
        client_id: resolvedClientId,
        issue_date: issueDate,
        due_date: dueDate,
        status: status,
        discount_percent: discountVal,
        cgst_percent: cgstPercent,
        sgst_percent: sgstPercent,
        igst_percent: igstPercent,
        notes: notes,
        items: items
      };

      const response = await api.post('/invoices', payload);
      navigate(`/invoices/${response.data.id}`);
    } catch (err) {
      console.error('Invoice creation failed:', err);
      alert(err.response?.data?.error || 'Failed to generate invoice.');
    }
  };

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <div className="header-row">
          <div>
            <h1 className="page-title">New Invoice</h1>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginTop: '2px' }}>
              Create a new bill with itemised rows and GST calculations
            </div>
          </div>
        </div>

        <form onSubmit={handleFormSubmit} className="card">
          {/* Client Details Section */}
          <h3 className="card-title" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginBottom: '16px' }}>
            Client Information
          </h3>
          <div className="form-row" style={{ marginBottom: '16px' }}>
            <div className="form-group" style={{ flex: 1.5 }}>
              <label htmlFor="cName">Client Name *</label>
              <input
                type="text"
                id="cName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Business / Person name"
                required
              />
            </div>
            <div className="form-group" style={{ flex: 1.2 }}>
              <label htmlFor="cPhone">Mobile Phone *</label>
              <input
                type="text"
                id="cPhone"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="10-digit number"
                required
              />
            </div>
            <div className="form-group" style={{ flex: 1.5 }}>
              <label htmlFor="cEmail">Email Address</label>
              <input
                type="email"
                id="cEmail"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            <div className="form-group" style={{ flex: 1.2 }}>
              <label htmlFor="cGstin">GSTIN Number</label>
              <input
                type="text"
                id="cGstin"
                value={clientGstin}
                onChange={(e) => setClientGstin(e.target.value)}
                placeholder="15-digit GSTIN ID"
              />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label htmlFor="cAddr">Billing Address</label>
            <textarea
              id="cAddr"
              value={clientAddress}
              onChange={(e) => setClientAddress(e.target.value)}
              placeholder="Full physical billing address"
              rows="2"
            />
          </div>

          {/* Invoice Metadata Section */}
          <h3 className="card-title" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginBottom: '16px' }}>
            Invoice Details
          </h3>
          <div className="form-row" style={{ marginBottom: '24px' }}>
            <div className="form-group">
              <label htmlFor="issue">Issue Date</label>
              <input 
                type="date" 
                id="issue" 
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="due">Due Date</label>
              <input 
                type="date" 
                id="due" 
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="invStatus">Status</label>
              <select 
                id="invStatus" 
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>

          {/* Line Items section */}
          <div style={{ marginTop: '24px', marginBottom: '24px' }}>
            <h3 className="card-title" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginBottom: '16px' }}>
              Line Items
            </h3>

            {items.map((item, idx) => (
              <div className="form-row" key={idx} style={{ marginBottom: '12px', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: 3 }}>
                  {idx === 0 && <label>Description</label>}
                  <input 
                    type="text" 
                    placeholder="Enter item name or details"
                    value={item.description}
                    onChange={(e) => handleItemValueChange(idx, 'description', e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  {idx === 0 && <label>Unit</label>}
                  <input 
                    type="text" 
                    placeholder="pcs"
                    value={item.unit}
                    onChange={(e) => handleItemValueChange(idx, 'unit', e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  {idx === 0 && <label>Quantity</label>}
                  <input 
                    type="number" 
                    step="0.01"
                    min="0.01"
                    value={item.quantity}
                    onChange={(e) => handleItemValueChange(idx, 'quantity', e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ flex: 1.2 }}>
                  {idx === 0 && <label>Rate (₹)</label>}
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    value={item.rate}
                    onChange={(e) => handleItemValueChange(idx, 'rate', e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ flex: 1.2 }}>
                  {idx === 0 && <label>Amount (₹)</label>}
                  <input 
                    type="text" 
                    disabled 
                    value={`₹${(item.quantity * item.rate).toFixed(2)}`}
                    style={{ backgroundColor: 'var(--color-bg)' }}
                  />
                </div>
                <div className="form-group" style={{ flex: 'none', marginBottom: '2px' }}>
                  <button 
                    type="button" 
                    className="btn btn-danger btn-small"
                    style={{ height: '36px' }}
                    onClick={() => handleRemoveItemRow(idx)}
                    disabled={items.length === 1}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}

            <button 
              type="button" 
              className="btn btn-secondary btn-small" 
              onClick={handleAddItemRow}
              style={{ marginTop: '8px' }}
            >
              + Add Item Row
            </button>
          </div>

          {/* Calculations, Discount & Tax Settings */}
          <div className="form-row" style={{ marginTop: '24px', alignItems: 'flex-start' }}>
            <div style={{ flex: 1.5 }}>
              <div className="form-group">
                <label>GST Treatment</label>
                <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'none', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="tax_type"
                      checked={gstType === 'cgst_sgst'}
                      onChange={() => setGstType('cgst_sgst')}
                      style={{ height: 'auto' }}
                    />
                    Intra-state (CGST 9% + SGST 9%)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'none', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="tax_type"
                      checked={gstType === 'igst'}
                      onChange={() => setGstType('igst')}
                      style={{ height: 'auto' }}
                    />
                    Inter-state (IGST 18%)
                  </label>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '20px' }}>
                <label htmlFor="disc">Discount Percentage (%)</label>
                <input 
                  type="number" 
                  id="disc" 
                  min="0"
                  max="100"
                  step="0.1"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                  style={{ width: '180px' }}
                />
              </div>

              <div className="form-group" style={{ marginTop: '20px' }}>
                <label htmlFor="invNotes">Notes / Terms / Banking Details</label>
                <textarea 
                  id="invNotes"
                  placeholder="e.g. Bank Account details, UPI ID, terms of payment, warranty, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Live Totals Card */}
            <div style={{ 
              flex: 'none', 
              width: '320px', 
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: '4px',
              padding: '20px'
            }}>
              <h4 style={{ fontWeight: '700', marginBottom: '14px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
                Total Invoice Value
              </h4>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', fontWeight: '500' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Subtotal:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              
              {discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', fontWeight: '500' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Discount ({discountPercent}%):</span>
                  <span style={{ color: 'var(--color-primary)' }}>-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}

              {gstType === 'cgst_sgst' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', fontWeight: '500' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>CGST (9%):</span>
                    <span>₹{(taxAmount / 2).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', fontWeight: '500' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>SGST (9%):</span>
                    <span>₹{(taxAmount / 2).toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', fontWeight: '500' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>IGST (18%):</span>
                  <span>₹{taxAmount.toFixed(2)}</span>
                </div>
              )}

              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                fontWeight: '700', 
                fontSize: '15px', 
                color: 'var(--color-primary)',
                borderTop: '1px solid var(--color-border)',
                paddingTop: '12px',
                marginTop: '12px'
              }}>
                <span>Grand Total:</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => navigate('/invoices')}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Generate Invoice & PDF
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewInvoice;
