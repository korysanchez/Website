import { useState, useEffect } from 'react';
import './Finance.css';

function Finance({ isDarkMode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState([]);
  const [sortBy, setSortBy] = useState('date');
  const [groupBy, setGroupBy] = useState('none');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedTransaction, setExpandedTransaction] = useState(null);

  const handleLogin = () => {
    setLoading(true);
    setError('');

    fetch('/finance/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(data => {
            throw new Error(data.error || 'Login failed');
          });
        }
        return response.json();
      })
      .then(data => {
        setIsLoggedIn(true);
        setTransactions(data.transactions || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to connect to server');
        setLoading(false);
      });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername('');
    setPassword('');
    setTransactions([]);
    setStartDate('');
    setEndDate('');
    setFilter([]);
    setExpandedTransaction(null);
  };

  const toggleCategory = (category) => {
    setFilter(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category);
      } else {
        return [...prev, category];
      }
    });
  };

  const handleTransactionClick = (transaction) => {
    setExpandedTransaction(transaction);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFilteredTransactions = () => {
    let filtered = [...transactions];
    
    // Filter by categories
    if (filter.length > 0) {
      filtered = filtered.filter(t => filter.includes(t.category));
    }

    // Filter by date range
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0); // start of the day
      filtered = filtered.filter(t => new Date(t.date) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // end of the day
      filtered = filtered.filter(t => new Date(t.date) <= end);
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.date) - new Date(a.date);
      } else if (sortBy === 'amount') {
        return Math.abs(b.amount) - Math.abs(a.amount);
      }
      return 0;
    });

    return filtered;
  };

  const getGroupedTransactions = () => {
    const filtered = getFilteredTransactions();
    
    if (groupBy === 'none') {
      return { 'All Transactions': filtered };
    }

    const grouped = {};
    
    filtered.forEach(transaction => {
      let key;
      
      if (groupBy === 'category') {
        key = transaction.category;
      } else if (groupBy === 'month') {
        const date = new Date(transaction.date);
        key = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      } else if (groupBy === 'year') {
        const date = new Date(transaction.date);
        key = date.getFullYear().toString();
      }
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(transaction);
    });

    return grouped;
  };

  const getTotalAmount = () => {
    return transactions.reduce((sum, t) => sum + t.amount, 0);
  };

  const getFilteredTotal = () => {
    return getFilteredTransactions().reduce((sum, t) => sum + t.amount, 0);
  };

  const getCategoryTotals = () => {
    const totals = {};
    getFilteredTransactions().forEach(t => {
      totals[t.category] = (totals[t.category] || 0) + t.amount;
    });
    return totals;
  };

  const getIncomeExpense = () => {
    const filtered = getFilteredTransactions();
    const income = filtered.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const expense = filtered.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    return { income, expense };
  };




  const [editTransaction, setEditTransaction] = useState(null); // transaction being edited
  const [editForm, setEditForm] = useState({
    title: '',
    amount: '',
    category: '',
    date: '',
    rate: '',
    description: ''
  });
  const handleEdit = (transaction) => {
    openEditModal(transaction);
  };
  const openEditModal = (transaction) => {
    setExpandedTransaction(null); // closes view modal
    setEditTransaction(transaction);
    setEditForm({
      title: transaction.title || '',
      amount: transaction.amount || '',
      category: transaction.category || '',
      date: transaction.date ? transaction.date.slice(0, 16) : '',
      rate: transaction.rate || '',
      description: transaction.description || ''
    });
  };
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };
  const submitEdit = async () => {
    if (!editTransaction) return;
    if (!editTransaction.id) {
      alert("Cannot edit transaction without ID");
      return;
    }
    try {
      const response = await fetch('/finance/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          user: editTransaction.user,
          id: editTransaction.id
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update');

      // Update local state
      setTransactions(prev => prev.map(t => t.id === editTransaction.id ? { ...t, ...editForm } : t));
      closeEditModal();
    } catch (err) {
      alert(err.message);
    }
  };

  const closeEditModal = () => {
    setEditTransaction(null);
  };

  const handleDelete = async (transaction) => {
    if (!window.confirm("Are you sure you want to delete this transaction?")) return;
    console.log("Deleting transaction:", transaction, transaction.id);
    try {
      // Call backend to delete
      const response = await fetch('/finance/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: transaction.id })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete transaction');

      // Remove from local state
      setTransactions(prev => prev.filter(t => t.id !== transaction.id));

      // Close any open modals related to this transaction
      if (editTransaction && editTransaction.id === transaction.id) closeEditModal();
      if (expandedTransaction === transaction.id) setExpandedTransaction(null);
      closeEditModal();
      setExpandedTransaction(null);

    } catch (err) {
      alert(err.message);
    }
  };

  const categories = [...new Set(transactions.map(t => t.category))];
  const groupedTransactions = getGroupedTransactions();
  const categoryTotals = getCategoryTotals();
  const { income, expense } = getIncomeExpense();

  if (!isLoggedIn) {
    return (
      <div className={`finance-container ${isDarkMode ? 'dark' : 'light'}`}>

        
        <div className="login-wrapper">
          <div className="login-card">
            <div className="login-header">
              <h1>Financial Dashboard</h1>
              <p>Sign in to view your finances</p>
            </div>
            
            <div className="login-form">
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter your username"
                  autoFocus
                />
              </div>
              
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter your password"
                />
              </div>

              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              <button
                onClick={handleLogin}
                disabled={loading}
                className="login-button"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`finance-container ${isDarkMode ? 'dark' : 'light'}`}>

      {editTransaction && (
        <div className="edit-modal-overlay">
          <div className="edit-modal">
            <h2>Edit Transaction</h2>

            {/* Row 1: Title, Category, Amount */}
            <div className="grid-row">
              <input name="title" value={editForm.title} onChange={handleEditChange} placeholder="Title" />
              <select name="category" value={editForm.category} onChange={handleEditChange}>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <input type="number" step="0.01" name="amount" value={editForm.amount} onChange={handleEditChange} placeholder="Amount" />
            </div>

            {/* Row 2: Date and Rate */}
            <div className="grid-row">
              <input type="datetime-local" name="date" value={editForm.date} onChange={handleEditChange} />
              <input type="number" step="0.001" name="rate" value={editForm.rate} onChange={handleEditChange} placeholder="Rate" />
            </div>

            {/* Row 3: Description */}
            <textarea
              name="description"
              value={editForm.description}
              onChange={handleEditChange}
              placeholder="Description (optional)"
            />

            {/* Buttons */}
            <div className="modal-buttons">
              <button className="edit-button" onClick={submitEdit}>Save</button>
              <button className="cancel-button" onClick={closeEditModal}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {expandedTransaction && (
          <div className="transaction-modal">
            <div className="modal-content">
              <button className="modal-close" onClick={() => setExpandedTransaction(null)}>×</button>
              <h2>{expandedTransaction.title}</h2>
              <p><strong>Date:</strong> {formatDateTime(expandedTransaction.date)}</p>
              <p><strong>Category:</strong> {expandedTransaction.category}</p>
              <p><strong>Amount:</strong> {formatCurrency(expandedTransaction.amount)}</p>
              <p><strong>Rate:</strong> {expandedTransaction.rate || 'N/A'}</p>
              <p><strong>Unit:</strong> {expandedTransaction.rate ? (expandedTransaction.amount / expandedTransaction.rate).toFixed(2) : 'N/A'}</p>
              <p><strong>Description:</strong> {expandedTransaction.description || 'No description'}</p>
              <div className="modal-actions">
                <button className="edit-button" onClick={() => handleEdit(expandedTransaction)}>Edit</button>
                <button className="delete-button" onClick={() => handleDelete(expandedTransaction)}>Delete</button>
              </div>
            </div>
            <div className="modal-backdrop" onClick={() => setExpandedTransaction(null)} />
          </div>
        )}
      <div className="finance-content">
        
        {/* Header */}
        <div className="finance-header">
          <div className="header-left">
            <h1>Financial Dashboard</h1>
            <p className="username-display">Welcome, {username}</p>
          </div>
          <button onClick={handleLogout} className="logout-button">
            Sign Out
          </button>
        </div>

        {/* Filters and Controls */}
        <div className="controls-section">
          <div className="controls-header">
            <h2>Filters & Controls</h2>
          </div>

          <div className="filters-grid">
            <div className="filter-group full-width">
              <label>Categories</label>
              <div className="category-checkboxes">
                {categories.map(cat => (
                  <label key={cat} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={filter.includes(cat)}
                      onChange={() => toggleCategory(cat)}
                    />
                    <span>{cat}</span>
                  </label>
                ))}
                {filter.length > 0 && (
                  <button
                    className="clear-filters"
                    onClick={() => setFilter([])}
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>
            
            <div className="filter-group">
              <label>Sort By</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="date">Date</option>
                <option value="amount">Amount</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Group By</label>
              <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
                <option value="none">None</option>
                <option value="category">Category</option>
                <option value="month">Month</option>
                <option value="year">Year</option>
              </select>
            </div>
            
            <div className="filter-group">
              <label>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            
            <div className="filter-group">
              <label>End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            {(startDate || endDate) && (
              <div className="filter-group">
                <label>&nbsp;</label>
                <button
                  className="clear-dates"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                >
                  Clear Dates
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="summary-section">
          <div className="section-header">
            <h2>Summary</h2>
          </div>
          <div className="summary-grid">
            <div className="summary-card balance-card">
              <div className="card-header">
                <span className="card-label">Net Balance</span>
              </div>
              <div className={`card-value ${getFilteredTotal() <= 0 ? 'positive' : 'negative'}`}>
                {formatCurrency(Math.abs(getFilteredTotal()))}
              </div>
            </div>
            
            <div className="summary-card income-card">
              <div className="card-header">
                <span className="card-label">Income</span>
              </div>
              <div className="card-value positive">
                {formatCurrency(income)}
              </div>
            </div>
            
            <div className="summary-card expense-card">
              <div className="card-header">
                <span className="card-label">Expenses</span>
              </div>
              <div className="card-value negative">
                {formatCurrency(expense)}
              </div>
            </div>
            
            <div className="summary-card count-card">
              <div className="card-header">
                <span className="card-label">Transactions</span>
              </div>
              <div className="card-value">
                {getFilteredTransactions().length}
              </div>
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        {Object.keys(categoryTotals).length > 0 && (
          <div className="category-section">
            <div className="section-header">
              <h2>Category Breakdown</h2>
            </div>
            <div className="category-grid">
              {Object.entries(categoryTotals)
                .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
                .map(([category, total]) => (
                  <div key={category} className="category-card">
                    <span className="category-name">{category}</span>
                    <span className={`category-amount ${total < 0 ? 'positive' : 'negative'}`}>
                      {formatCurrency(Math.abs(total))}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Transactions Display */}
        <div className="transactions-section">
          {Object.keys(groupedTransactions).length === 0 ? (
            <div className="empty-state">
              <p>No transactions found</p>
              <small>Try adjusting your filters</small>
            </div>
          ) : (
            Object.entries(groupedTransactions).map(([groupName, groupTransactions]) => (
              <div key={groupName} className="transaction-group">
                {groupBy !== 'none' && (
                  <div className="group-header">
                    <h3>{groupName}</h3>
                    <span className="group-total">
                      {formatCurrency(groupTransactions.reduce((sum, t) => sum + t.amount, 0))}
                    </span>
                  </div>
                )}

                {(
                  <div className="table-wrapper">
                    <table className="transactions-table">
                      <thead>
                        <tr className="table-header">
                          <th>Date</th>
                          <th>Title</th>
                          <th className="hide-mobile">Category</th>
                          <th className="hide-mobile">Description</th>
                          <th>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupTransactions.map((transaction, index) => (
                          <>
                            <tr 
                              key={transaction.id || index}
                              onClick={() => handleTransactionClick(transaction)}
                            >
                              <td className="date-cell">{formatDate(transaction.date)}</td>
                              <td className="title-cell">
                                <div className="title-wrapper">
                                  <span className="title">{transaction.title}</span>
                                  <span className="mobile-category show-mobile">{transaction.category}</span>
                                </div>
                              </td>
                              <td className="hide-mobile">
                                <span className="category-badge">{transaction.category}</span>
                              </td>
                              <td className="description-cell hide-mobile">
                                {transaction.description || '-'}
                              </td>
                              <td className={`amount-cell ${transaction.amount < 0 ? 'positive' : 'negative'}`}>
                                {formatCurrency(Math.abs(transaction.amount))}
                              </td>
                            </tr>
                            {expandedTransaction === (transaction.id || index) && (
                              <tr className="details-row">
                                <td colSpan="5">
                                  <div className="transaction-details">
                                    <div className="details-grid">
                                      <div className="detail-item">
                                        <span className="detail-label">ID:</span>
                                        <span className="detail-value">{transaction.id || 'N/A'}</span>
                                      </div>
                                      <div className="detail-item">
                                        <span className="detail-label">User:</span>
                                        <span className="detail-value">{transaction.user}</span>
                                      </div>
                                      <div className="detail-item">
                                        <span className="detail-label">Full Date:</span>
                                        <span className="detail-value">{formatDateTime(transaction.date)}</span>
                                      </div>
                                      <div className="detail-item">
                                        <span className="detail-label">Category:</span>
                                        <span className="detail-value">{transaction.category}</span>
                                      </div>
                                      <div className="detail-item">
                                        <span className="detail-label">Amount:</span>
                                        <span className={`detail-value ${transaction.amount < 0 ? 'positive' : 'negative'}`}>
                                          {formatCurrency(Math.abs(transaction.amount))}
                                        </span>
                                      </div>
                                      <div className="detail-item">
                                        <span className="detail-label">Rate:</span>
                                        <span className="detail-value">{transaction.rate || 'N/A'}</span>
                                      </div>
                                      <div className="detail-item full-width">
                                        <span className="detail-label">Description:</span>
                                        <span className="detail-value">{transaction.description || 'No description'}</span>
                                      </div>
                                      <div className="detail-item full-width">
                                        <span className="detail-label">Title:</span>
                                        <span className="detail-value">{transaction.title}</span>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Finance;