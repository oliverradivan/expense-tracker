import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/authContext';
import { api } from '../../lib/api';

const HistoryPage = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState(null); // ID of transaction to delete
  const [deleteConfirm, setDeleteConfirm] = useState(false); // Whether to show confirmation dialog

  // Group transactions by month and then by category
  const grouped = React.useMemo(() => {
    if (!transactions || transactions.length === 0) return {};
    const grouped = {};
    transactions.forEach((tx) => {
      const date = new Date(tx.date);
      const month = date.toISOString().slice(0, 7); // YYYY-MM
      if (!grouped[month]) {
        grouped[month] = {};
      }
      if (!grouped[month][tx.category]) {
        grouped[month][tx.category] = [];
      }
      grouped[month][tx.category].push(tx);
    });
    // Sort months descending (newest first)
    const sortedMonths = Object.keys(grouped).sort().reverse();
    const result = {};
    sortedMonths.forEach((month) => {
      result[month] = grouped[month];
    });
    return result;
  }, [transactions]);

  // Calculate totals per month
  const monthTotals = React.useMemo(() => {
    const totals = {};
    Object.keys(grouped).forEach((month) => {
      let income = 0;
      let expense = 0;
      Object.keys(grouped[month]).forEach((category) => {
        grouped[month][category].forEach((tx) => {
          if (tx.type === 'income') {
            income += tx.amount;
          } else {
            expense += tx.amount;
          }
        });
      });
      totals[month] = { income, expense };
    });
    return totals;
  }, [grouped]);

  // Fetch transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.get('/transactions/');
        if (res.ok) {
          const data = await res.json();
          setTransactions(data);
        } else {
          setError('Failed to load transactions');
        }
      } catch (err) {
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, []);

  // Handle delete confirmation
  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setDeleteConfirm(true);
  };

  const handleDeleteCancel = () => {
    setDeleteId(null);
    setDeleteConfirm(false);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      const res = await api.deleteForm(`/transactions/${deleteId}`, {});
      if (res.ok) {
        // Remove the transaction from the list
        setTransactions(transactions.filter((tx) => tx.id !== deleteId));
        setDeleteId(null);
        setDeleteConfirm(false);
      } else {
        const errorData = await res.json();
        setError(errorData.detail || 'Failed to delete transaction');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    }
  };

  if (loading) return <div>Loading transactions...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  if (transactions.length === 0) {
    return (
      <div className="history-page">
        <div className="history-card">
          <h2>No transactions yet</h2>
          <p>Start logging your income and expenses to see them here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="history-page">
      <div className="history-card">
        <h2>Transaction History</h2>
        {Object.keys(grouped).map((month) => {
          const monthData = grouped[month];
          const totals = monthTotals[month];
          return (
            <div key={month} className="month-section">
              <h3>
                {new Date(month + '-01').toLocaleString('default', {
                  month: 'long',
                  year: 'numeric',
                })} <span className="totals">Income: ${totals.income.toFixed(2)} | Expense: ${totals.expense.toFixed(2)}</span>
              </h3>
              {Object.keys(monthData).map((category) => (
                <div key={category} className="category-section">
                  <strong>{category}</strong>
                  <div className="transactions">
                    {monthData[category].map((tx) => (
                      <div key={tx.id} className={`transaction ${tx.type}`}>
                        <div className="transaction-details">
                          <span className="label">{tx.label}</span>
                          <span className="amount">
                            {tx.type === 'income' ? '+' : '-'}${Math.abs(
                              tx.amount
                            ).toFixed(2)}
                          </span>
                          <span className="date">
                            {new Date(tx.date).toLocaleDateString()}
                          </span>
                        </div>
                        <button
                          className="delete-btn"
                          onClick={() => handleDeleteClick(tx.id)}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
        {/* Delete confirmation dialog */}
        {deleteConfirm && deleteId && (
          <div className="delete-confirm-overlay">
            <div className="delete-confirm-box">
              <h3>Confirm deletion</h3>
              <p>Are you sure you want to delete this transaction?</p>
              <div className="delete-confirm-actions">
                <button onClick={handleDeleteCancel}>Cancel</button>
                <button onClick={handleDeleteConfirm}>Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;