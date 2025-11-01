import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './DriverDashboard.css';

function DriverDashboard() {
  const [rides, setRides] = useState([]);
  const [stats, setStats] = useState({ totalEarnings: 0, totalRides: 0 });
  const [loading, setLoading] = useState(false);
  
  // Demo driver ID (in production, this would come from authentication)
  const driverId = 'driver-demo-456';

  // Messaging state
  const [showMessaging, setShowMessaging] = useState(false);
  const [selectedRideForChat, setSelectedRideForChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  // Withdrawal state
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [showBankAccountModal, setShowBankAccountModal] = useState(false);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [balance, setBalance] = useState({ totalEarnings: 0, totalWithdrawn: 0, availableBalance: 0 });
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [selectedBankAccount, setSelectedBankAccount] = useState('');
  const [newBankAccount, setNewBankAccount] = useState({
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    routingNumber: '',
    accountType: 'checking'
  });

  useEffect(() => {
    loadRides();
    loadStats();
    loadBankAccounts();
    loadWithdrawals();
    loadBalance();
  }, []);

  // Poll for new messages when chat is open
  useEffect(() => {
    let interval;
    if (showMessaging && selectedRideForChat) {
      loadMessages(selectedRideForChat.id);
      interval = setInterval(() => {
        loadMessages(selectedRideForChat.id);
      }, 3000); // Poll every 3 seconds
    }
    return () => clearInterval(interval);
  }, [showMessaging, selectedRideForChat]);

  const loadRides = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/driver/rides/${driverId}`);
      setRides(response.data);
    } catch (error) {
      console.error('Error loading rides:', error);
    }
    setLoading(false);
  };

  const loadStats = async () => {
    try {
      const response = await axios.get(`/api/driver/stats/${driverId}`);
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadBankAccounts = async () => {
    try {
      const response = await axios.get(`/api/bank-accounts/${driverId}`);
      setBankAccounts(response.data);
      if (response.data.length > 0) {
        const primary = response.data.find(acc => acc.is_primary);
        setSelectedBankAccount(primary ? primary.id : response.data[0].id);
      }
    } catch (error) {
      console.error('Error loading bank accounts:', error);
    }
  };

  const loadWithdrawals = async () => {
    try {
      const response = await axios.get(`/api/withdrawals/${driverId}`);
      setWithdrawals(response.data);
    } catch (error) {
      console.error('Error loading withdrawals:', error);
    }
  };

  const loadBalance = async () => {
    try {
      const response = await axios.get(`/api/driver/balance/${driverId}`);
      setBalance(response.data);
    } catch (error) {
      console.error('Error loading balance:', error);
    }
  };

  const handleAddBankAccount = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/bank-accounts', {
        driverId: driverId,
        accountHolderName: newBankAccount.accountHolderName,
        bankName: newBankAccount.bankName,
        accountNumber: newBankAccount.accountNumber,
        routingNumber: newBankAccount.routingNumber,
        accountType: newBankAccount.accountType,
        isPrimary: bankAccounts.length === 0
      });
      
      setNewBankAccount({
        accountHolderName: '',
        bankName: '',
        accountNumber: '',
        routingNumber: '',
        accountType: 'checking'
      });
      setShowBankAccountModal(false);
      loadBankAccounts();
      alert('Bank account added successfully!');
    } catch (error) {
      console.error('Error adding bank account:', error);
      alert('Failed to add bank account. Please try again.');
    }
  };

  const handleRequestWithdrawal = async (e) => {
    e.preventDefault();
    const amount = parseFloat(withdrawalAmount);
    
    if (amount < 10) {
      alert('Minimum withdrawal amount is $10.00');
      return;
    }
    
    if (amount > balance.availableBalance) {
      alert(`Insufficient balance. Available: $${balance.availableBalance.toFixed(2)}`);
      return;
    }
    
    try {
      await axios.post('/api/withdrawals', {
        driverId: driverId,
        bankAccountId: selectedBankAccount,
        amount: amount
      });
      
      setWithdrawalAmount('');
      setShowWithdrawalModal(false);
      loadWithdrawals();
      loadBalance();
      alert('Withdrawal request submitted successfully! Funds will be processed within 1-3 business days.');
    } catch (error) {
      console.error('Error requesting withdrawal:', error);
      alert(error.response?.data?.error || 'Failed to request withdrawal. Please try again.');
    }
  };

  const handleCancelWithdrawal = async (withdrawalId) => {
    if (!window.confirm('Are you sure you want to cancel this withdrawal?')) {
      return;
    }
    
    try {
      await axios.patch(`/api/withdrawals/${withdrawalId}/cancel`);
      loadWithdrawals();
      loadBalance();
      alert('Withdrawal cancelled successfully.');
    } catch (error) {
      console.error('Error cancelling withdrawal:', error);
      alert('Failed to cancel withdrawal. Please try again.');
    }
  };

  const handleAcceptRide = async (rideId) => {
    try {
      await axios.patch(`/api/rides/${rideId}`, {
        status: 'active',
        driverId: driverId
      });
      loadRides();
      alert('Ride accepted! Navigate to pickup location.');
    } catch (error) {
      console.error('Error accepting ride:', error);
      alert('Failed to accept ride. Please try again.');
    }
  };

  const handleCompleteRide = async (rideId) => {
    try {
      await axios.patch(`/api/rides/${rideId}`, {
        status: 'completed'
      });
      loadRides();
      loadStats();
      loadBalance();
      alert('Ride completed! Payment has been processed.');
    } catch (error) {
      console.error('Error completing ride:', error);
      alert('Failed to complete ride. Please try again.');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'badge-pending',
      scheduled: 'badge-scheduled',
      active: 'badge-active',
      completed: 'badge-completed'
    };
    return `badge ${badges[status] || 'badge-pending'}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const loadMessages = async (rideId) => {
    try {
      const response = await axios.get(`/api/messages/${rideId}`);
      setMessages(response.data);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await axios.post('/api/messages', {
        rideId: selectedRideForChat.id,
        senderId: driverId,
        senderType: 'driver',
        message: newMessage.trim()
      });
      
      setNewMessage('');
      loadMessages(selectedRideForChat.id);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  const openChat = (ride) => {
    setSelectedRideForChat(ride);
    setShowMessaging(true);
    setMessages([]);
  };

  const closeChat = () => {
    setShowMessaging(false);
    setSelectedRideForChat(null);
    setMessages([]);
    setNewMessage('');
  };

  const getWithdrawalStatusBadge = (status) => {
    const badges = {
      pending: { class: 'badge-pending', text: 'Pending' },
      processing: { class: 'badge-active', text: 'Processing' },
      completed: { class: 'badge-completed', text: 'Completed' },
      failed: { class: 'badge-cancelled', text: 'Failed' },
      cancelled: { class: 'badge-cancelled', text: 'Cancelled' }
    };
    return badges[status] || badges.pending;
  };

  const availableRides = rides.filter(r => r.status === 'pending' || r.status === 'scheduled');
  const activeRides = rides.filter(r => r.status === 'active');
  const completedRides = rides.filter(r => r.status === 'completed');

  return (
    <div className="container">
      <div className="driver-header">
        <div>
          <h2 className="gradient-text">Driver Dashboard</h2>
          <p className="subtitle">Manage your rides and track earnings</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-details">
            <div className="stat-label">Total Earnings</div>
            <div className="stat-value">${stats.totalEarnings.toFixed(2)}</div>
          </div>
        </div>
        
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setShowWithdrawalModal(true)}>
          <div className="stat-icon">🏦</div>
          <div className="stat-details">
            <div className="stat-label">Available Balance</div>
            <div className="stat-value" style={{ color: '#10b981' }}>${balance.availableBalance.toFixed(2)}</div>
            <div style={{ fontSize: '0.75em', color: '#6b7280', marginTop: '4px' }}>
              Click to withdraw
            </div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-details">
            <div className="stat-label">Average per Ride</div>
            <div className="stat-value">
              ${stats.totalRides > 0 ? (stats.totalEarnings / stats.totalRides).toFixed(2) : '0.00'}
            </div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">⚡</div>
          <div className="stat-details">
            <div className="stat-label">Active Rides</div>
            <div className="stat-value">{activeRides.length}</div>
          </div>
        </div>
      </div>

      {/* Withdrawal Modal */}
      {showWithdrawalModal && (
        <div className="modal-overlay" onClick={() => setShowWithdrawalModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '600px'}}>
            <div className="modal-header">
              <h3>💰 Withdraw Earnings</h3>
              <button className="close-btn" onClick={() => setShowWithdrawalModal(false)}>✕</button>
            </div>
            
            <div style={{ padding: '20px' }}>
              {/* Balance Info */}
              <div style={{
                backgroundColor: '#f0fdf4',
                border: '2px solid #10b981',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '20px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.9em', color: '#059669', marginBottom: '8px' }}>
                  Available Balance
                </div>
                <div style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#10b981' }}>
                  ${balance.availableBalance.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.8em', color: '#6b7280', marginTop: '8px' }}>
                  Total Earned: ${balance.totalEarnings.toFixed(2)} | Withdrawn: ${balance.totalWithdrawn.toFixed(2)}
                </div>
              </div>

              {bankAccounts.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '30px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px'
                }}>
                  <div style={{ fontSize: '3em', marginBottom: '10px' }}>🏦</div>
                  <p style={{ marginBottom: '15px', color: '#6b7280' }}>
                    You need to add a bank account before you can withdraw funds.
                  </p>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setShowWithdrawalModal(false);
                      setShowBankAccountModal(true);
                    }}
                  >
                    Add Bank Account
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRequestWithdrawal}>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                      Select Bank Account
                    </label>
                    <select
                      className="input-field"
                      value={selectedBankAccount}
                      onChange={(e) => setSelectedBankAccount(e.target.value)}
                      required
                    >
                      {bankAccounts.map(account => (
                        <option key={account.id} value={account.id}>
                          {account.bank_name} - ****{account.account_number.slice(-4)} 
                          {account.is_primary ? ' (Primary)' : ''}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      style={{ fontSize: '0.85em', color: '#3b82f6', marginTop: '8px', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => {
                        setShowWithdrawalModal(false);
                        setShowBankAccountModal(true);
                      }}
                    >
                      + Add New Bank Account
                    </button>
                  </div>

                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                      Withdrawal Amount (Minimum: $10.00)
                    </label>
                    <input
                      type="number"
                      className="input-field"
                      placeholder="Enter amount"
                      value={withdrawalAmount}
                      onChange={(e) => setWithdrawalAmount(e.target.value)}
                      min="10"
                      step="0.01"
                      max={balance.availableBalance}
                      required
                    />
                    <button
                      type="button"
                      style={{ fontSize: '0.85em', color: '#10b981', marginTop: '8px', background: 'none', border: 'none', cursor: 'pointer' }}
                      onClick={() => setWithdrawalAmount(balance.availableBalance.toString())}
                    >
                      Withdraw All (${balance.availableBalance.toFixed(2)})
                    </button>
                  </div>

                  <div style={{
                    backgroundColor: '#fef3c7',
                    border: '1px solid #fbbf24',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '15px',
                    fontSize: '0.85em'
                  }}>
                    ⏱️ Processing time: 1-3 business days
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowWithdrawalModal(false)}
                      style={{ flex: 1 }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ flex: 1 }}
                      disabled={!withdrawalAmount || parseFloat(withdrawalAmount) < 10}
                    >
                      Request Withdrawal
                    </button>
                  </div>
                </form>
              )}

              {/* Withdrawal History */}
              {withdrawals.length > 0 && (
                <div style={{ marginTop: '30px' }}>
                  <h4 style={{ marginBottom: '15px' }}>Recent Withdrawals</h4>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {withdrawals.slice(0, 5).map((withdrawal) => (
                      <div
                        key={withdrawal.id}
                        style={{
                          backgroundColor: '#f9fafb',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '12px',
                          marginBottom: '10px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                          <span style={{ fontWeight: '600' }}>${withdrawal.amount.toFixed(2)}</span>
                          <span className={`badge ${getWithdrawalStatusBadge(withdrawal.status).class}`}>
                            {getWithdrawalStatusBadge(withdrawal.status).text}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.85em', color: '#6b7280' }}>
                          {withdrawal.bank_accounts?.bank_name} - ****{withdrawal.bank_accounts?.account_number.slice(-4)}
                        </div>
                        <div style={{ fontSize: '0.75em', color: '#9ca3af', marginTop: '5px' }}>
                          {formatDate(withdrawal.requested_at)}
                        </div>
                        {withdrawal.status === 'pending' && (
                          <button
                            type="button"
                            style={{
                              fontSize: '0.75em',
                              color: '#ef4444',
                              marginTop: '8px',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              textDecoration: 'underline'
                            }}
                            onClick={() => handleCancelWithdrawal(withdrawal.id)}
                          >
                            Cancel Withdrawal
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bank Account Modal */}
      {showBankAccountModal && (
        <div className="modal-overlay" onClick={() => setShowBankAccountModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '600px'}}>
            <div className="modal-header">
              <h3>🏦 Add Bank Account</h3>
              <button className="close-btn" onClick={() => setShowBankAccountModal(false)}>✕</button>
            </div>
            
            <div style={{ padding: '20px' }}>
              <form onSubmit={handleAddBankAccount}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Account Holder Name
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="John Doe"
                    value={newBankAccount.accountHolderName}
                    onChange={(e) => setNewBankAccount({...newBankAccount, accountHolderName: e.target.value})}
                    required
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Bank Name
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Bank of America"
                    value={newBankAccount.bankName}
                    onChange={(e) => setNewBankAccount({...newBankAccount, bankName: e.target.value})}
                    required
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Account Number
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="123456789"
                    value={newBankAccount.accountNumber}
                    onChange={(e) => setNewBankAccount({...newBankAccount, accountNumber: e.target.value})}
                    required
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Routing Number
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="021000021"
                    value={newBankAccount.routingNumber}
                    onChange={(e) => setNewBankAccount({...newBankAccount, routingNumber: e.target.value})}
                    required
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Account Type
                  </label>
                  <select
                    className="input-field"
                    value={newBankAccount.accountType}
                    onChange={(e) => setNewBankAccount({...newBankAccount, accountType: e.target.value})}
                    required
                  >
                    <option value="checking">Checking</option>
                    <option value="savings">Savings</option>
                  </select>
                </div>

                <div style={{
                  backgroundColor: '#fef3c7',
                  border: '1px solid #fbbf24',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '15px',
                  fontSize: '0.85em'
                }}>
                  🔒 Your bank account information is encrypted and secure.
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowBankAccountModal(false)}
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    Add Account
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Messaging Modal */}
      {showMessaging && selectedRideForChat && (
        <div className="modal-overlay" onClick={closeChat}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '600px'}}>
            <div className="modal-header">
              <h3>💬 Chat with Customer</h3>
              <button className="close-btn" onClick={closeChat}>✕</button>
            </div>
            
            <div style={{
              padding: '20px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              marginBottom: '15px'
            }}>
              <div style={{fontSize: '0.9em', color: '#6b7280', marginBottom: '5px'}}>
                Ride Details
              </div>
              <div style={{fontWeight: '600', marginBottom: '5px'}}>
                {selectedRideForChat.pickup_location} → {selectedRideForChat.dropoff_location}
              </div>
              <div style={{fontSize: '0.9em', color: '#6b7280'}}>
                Status: <span className={getStatusBadge(selectedRideForChat.status)} style={{marginLeft: '5px'}}>
                  {selectedRideForChat.status}
                </span>
              </div>
            </div>

            <div style={{
              height: '400px',
              overflowY: 'auto',
              padding: '15px',
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              marginBottom: '15px'
            }}>
              {messages.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  color: '#9ca3af',
                  padding: '40px 20px'
                }}>
                  <div style={{fontSize: '2em', marginBottom: '10px'}}>💬</div>
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      marginBottom: '15px',
                      display: 'flex',
                      justifyContent: msg.sender_type === 'driver' ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <div style={{
                      maxWidth: '70%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      backgroundColor: msg.sender_type === 'driver' ? '#10b981' : '#f3f4f6',
                      color: msg.sender_type === 'driver' ? '#ffffff' : '#1f2937'
                    }}>
                      <div style={{
                        fontSize: '0.75em',
                        opacity: 0.8,
                        marginBottom: '4px'
                      }}>
                        {msg.sender_type === 'driver' ? 'You' : 'Customer'}
                      </div>
                      <div>{msg.message}</div>
                      <div style={{
                        fontSize: '0.7em',
                        opacity: 0.7,
                        marginTop: '4px'
                      }}>
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendMessage} style={{display: 'flex', gap: '10px'}}>
              <input
                type="text"
                className="input-field"
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                style={{flex: 1}}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!newMessage.trim()}
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Available Rides */}
      <div className="rides-section">
        <h3>Available Rides</h3>
        
        {availableRides.length === 0 ? (
          <div className="empty-state">
            <p>No available rides at the moment. Check back soon!</p>
          </div>
        ) : (
          <div className="rides-grid">
            {availableRides.map((ride) => (
              <div key={ride.id} className="card ride-card">
                <div className="ride-header">
                  <span className={getStatusBadge(ride.status)}>
                    {ride.status}
                  </span>
                  <span className="ride-price">${ride.price}</span>
                </div>
                
                <div className="ride-details">
                  <div className="location-row">
                    <span className="location-icon">📍</span>
                    <div>
                      <div className="location-label">Pickup</div>
                      <div className="location-text">{ride.pickup_location}</div>
                    </div>
                  </div>
                  
                  <div className="location-row">
                    <span className="location-icon">🎯</span>
                    <div>
                      <div className="location-label">Dropoff</div>
                      <div className="location-text">{ride.dropoff_location}</div>
                    </div>
                  </div>
                </div>

                <div className="ride-footer">
                  <span className="ride-distance">{ride.distance} miles</span>
                  {ride.scheduled_time && (
                    <span className="ride-time">⏰ {formatDate(ride.scheduled_time)}</span>
                  )}
                  {ride.is_holiday && (
                    <span className="holiday-tag">🎉 Holiday</span>
                  )}
                </div>

                <button 
                  className="btn btn-success"
                  onClick={() => handleAcceptRide(ride.id)}
                  style={{ marginTop: '12px', width: '100%' }}
                >
                  Accept Ride
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Rides */}
      {activeRides.length > 0 && (
        <div className="rides-section">
          <h3>Active Rides</h3>
          <div className="rides-grid">
            {activeRides.map((ride) => (
              <div key={ride.id} className="card ride-card active-ride">
                <div className="ride-header">
                  <span className={getStatusBadge(ride.status)}>
                    {ride.status}
                  </span>
                  <span className="ride-price">${ride.price}</span>
                </div>
                
                <div className="ride-details">
                  <div className="location-row">
                    <span className="location-icon">📍</span>
                    <div>
                      <div className="location-label">Pickup</div>
                      <div className="location-text">{ride.pickup_location}</div>
                    </div>
                  </div>
                  
                  <div className="location-row">
                    <span className="location-icon">🎯</span>
                    <div>
                      <div className="location-label">Dropoff</div>
                      <div className="location-text">{ride.dropoff_location}</div>
                    </div>
                  </div>
                </div>

                <div className="ride-footer">
                  <span className="ride-distance">{ride.distance} miles</span>
                </div>

                <div style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => openChat(ride)}
                    style={{ flex: 1 }}
                  >
                    💬 Chat
                  </button>
                  <button 
                    className="btn btn-primary"
                    onClick={() => handleCompleteRide(ride.id)}
                    style={{ flex: 1 }}
                  >
                    Complete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Completed Rides */}
      <div className="rides-section">
        <h3>Recent Completed Rides</h3>
        
        {completedRides.length === 0 ? (
          <div className="empty-state">
            <p>No completed rides yet.</p>
          </div>
        ) : (
          <div className="rides-grid">
            {completedRides.slice(0, 6).map((ride) => (
              <div key={ride.id} className="card ride-card completed-ride">
                <div className="ride-header">
                  <span className={getStatusBadge(ride.status)}>
                    {ride.status}
                  </span>
                  <span className="ride-price">${ride.price}</span>
                </div>
                
                <div className="ride-details">
                  <div className="location-row">
                    <span className="location-icon">📍</span>
                    <div>
                      <div className="location-label">Pickup</div>
                      <div className="location-text">{ride.pickup_location}</div>
                    </div>
                  </div>
                  
                  <div className="location-row">
                    <span className="location-icon">🎯</span>
                    <div>
                      <div className="location-label">Dropoff</div>
                      <div className="location-text">{ride.dropoff_location}</div>
                    </div>
                  </div>
                </div>

                <div className="ride-footer">
                  <span className="ride-distance">{ride.distance} miles</span>
                  {ride.is_holiday && (
                    <span className="holiday-tag">🎉 Holiday</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DriverDashboard;
