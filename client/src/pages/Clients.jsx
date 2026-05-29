// Clients management portal with phone database searches
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api';
import Sidebar from '../components/Sidebar';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchPhone, setSearchPhone] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  // New client modal fields
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [newClientGstin, setNewClientGstin] = useState('');

  const fetchClients = async () => {
    try {
      const response = await api.get('/clients');
      setClients(response.data);
    } catch (err) {
      console.error('Error fetching client list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!searchPhone) {
      setSearchResult(null);
      setSearchError('');
      return;
    }

    setSearchError('');
    setSearchResult(null);
    setSearchLoading(true);

    try {
      const response = await api.get(`/clients/search?phone=${searchPhone}`);
      setSearchResult(response.data);
    } catch (err) {
      console.error('Client search request failed:', err);
      setSearchError(err.response?.data?.error || 'No customer database records match this number.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    if (!newClientName || !newClientPhone) {
      alert('Please fill in name and mobile number.');
      return;
    }

    try {
      await api.post('/clients', {
        name: newClientName,
        phone: newClientPhone,
        email: newClientEmail,
        address: newClientAddress,
        gstin: newClientGstin
      });

      setNewClientName('');
      setNewClientPhone('');
      setNewClientEmail('');
      setNewClientAddress('');
      setNewClientGstin('');
      setIsModalOpen(false);

      fetchClients();
    } catch (err) {
      console.error('Client creation failed:', err);
      alert(err.response?.data?.error || 'Could not register client.');
    }
  };

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <div className="header-row">
          <div>
            <h1 className="page-title">Clients</h1>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginTop: '2px' }}>
              Register new accounts and review client billing statements
            </div>
          </div>
          
          <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
            + Add Client
          </button>
        </div>

        {/* Customer Search Panel */}
        <div className="card">
          <div className="card-title">Customer History Search</div>
          <form onSubmit={handleSearchSubmit} className="search-container">
            <input 
              type="text" 
              className="search-input"
              placeholder="Enter exact mobile number (e.g. 9876543210)"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" disabled={searchLoading}>
              {searchLoading ? 'Searching...' : 'Search'}
            </button>
            {searchResult && (
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => {
                  setSearchPhone('');
                  setSearchResult(null);
                  setSearchError('');
                }}
              >
                Clear
              </button>
            )}
          </form>

          {searchError && (
            <div style={{ color: 'var(--color-danger)', fontSize: '13px', fontWeight: '700', marginTop: '8px' }}>
              {searchError}
            </div>
          )}

          {/* Searched client history dashboard */}
          {searchResult && (
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '20px', marginTop: '20px' }}>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(4, 1fr)', 
                gap: '16px', 
                backgroundColor: 'var(--color-bg)', 
                padding: '16px', 
                borderRadius: '4px',
                border: '1px solid var(--color-border)',
                marginBottom: '20px'
              }}>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: '700' }}>
                    Customer Name
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '700', marginTop: '2px' }}>{searchResult.client.name}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: '700' }}>
                    Mobile Number
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '700', marginTop: '2px' }}>{searchResult.client.phone}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: '700' }}>
                    Email
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '700', marginTop: '2px' }}>{searchResult.client.email || '-'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: '700' }}>
                    GSTIN
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '700', marginTop: '2px' }}>{searchResult.client.gstin || '-'}</div>
                </div>
              </div>

              <div className="card-title" style={{ fontSize: '14px', marginBottom: '8px' }}>Statement of Account</div>
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>Invoice Number</th>
                      <th>Issue Date</th>
                      <th>Due Date</th>
                      <th>Status</th>
                      <th>Total Paid</th>
                      <th style={{ textAlign: 'right' }}>Grand Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResult.invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td style={{ fontWeight: '700' }}>
                          <Link to={`/invoices/${inv.id}`} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
                            {inv.invoice_number}
                          </Link>
                        </td>
                        <td>{new Date(inv.issue_date).toLocaleDateString('en-IN')}</td>
                        <td>{new Date(inv.due_date).toLocaleDateString('en-IN')}</td>
                        <td>
                          <span className={`badge ${inv.status}`}>{inv.status}</span>
                        </td>
                        <td style={{ color: 'var(--color-success)', fontWeight: '700' }}>₹{inv.total_paid.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontWeight: '700' }}>₹{inv.total.toFixed(2)}</td>
                      </tr>
                    ))}
                    {searchResult.invoices.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '16px' }}>No transaction history found</td>
                      </tr>
                    )}
                    
                    {/* Aggregation summaries */}
                    <tr style={{ backgroundColor: 'var(--color-bg)', fontWeight: '700' }}>
                      <td colSpan="4">Client Totals:</td>
                      <td style={{ color: 'var(--color-success)' }}>Paid: ₹{searchResult.summary.total_paid.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', color: 'var(--color-primary)' }}>Billed: ₹{searchResult.summary.total_billed.toFixed(2)}</td>
                    </tr>
                    <tr style={{ backgroundColor: 'var(--color-bg)', fontWeight: '700' }}>
                      <td colSpan="4"></td>
                      <td colSpan="2" style={{ textAlign: 'right', color: 'var(--color-danger)' }}>
                        Net Outstanding: ₹{searchResult.summary.outstanding.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Master Directory */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--color-border)' }}>
            <h3 className="card-title" style={{ margin: 0 }}>Registered Client Database</h3>
          </div>
          
          <div className="table-responsive">
            <table style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ paddingLeft: '24px' }}>Client Name</th>
                  <th>Mobile Number</th>
                  <th>Email</th>
                  <th>Invoices count</th>
                  <th style={{ paddingRight: '24px', textAlign: 'right' }}>Total Billed</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id}>
                    <td style={{ paddingLeft: '24px', fontWeight: '700' }}>{c.name}</td>
                    <td>{c.phone}</td>
                    <td>{c.email || '-'}</td>
                    <td>{c.invoices_count}</td>
                    <td style={{ paddingRight: '24px', textAlign: 'right', fontWeight: '700' }}>
                      ₹{parseFloat(c.total_billed).toFixed(2)}
                    </td>
                  </tr>
                ))}
                
                {clients.length === 0 && !loading && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-secondary)' }}>
                      No client accounts found. Click "Add Client" to register.
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-secondary)' }}>
                      Loading customer database...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Form */}
        {isModalOpen && (
          <div className="modal-backdrop">
            <div className="modal-content">
              <h3 className="card-title" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginBottom: '16px' }}>
                Add New Client
              </h3>
              
              <form onSubmit={handleCreateClient}>
                <div className="form-group">
                  <label htmlFor="modalName">Client Name *</label>
                  <input 
                    type="text" 
                    id="modalName" 
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Business / Person name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="modalPhone">Mobile Phone *</label>
                  <input 
                    type="text" 
                    id="modalPhone" 
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    placeholder="10-digit number"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="modalEmail">Email Address</label>
                  <input 
                    type="email" 
                    id="modalEmail" 
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="modalGstin">GSTIN Number</label>
                  <input 
                    type="text" 
                    id="modalGstin" 
                    value={newClientGstin}
                    onChange={(e) => setNewClientGstin(e.target.value)}
                    placeholder="15-digit GSTIN ID"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label htmlFor="modalAddr">Billing Address</label>
                  <textarea 
                    id="modalAddr" 
                    value={newClientAddress}
                    onChange={(e) => setNewClientAddress(e.target.value)}
                    placeholder="Full postal address for invoices"
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Register Client
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Clients;
