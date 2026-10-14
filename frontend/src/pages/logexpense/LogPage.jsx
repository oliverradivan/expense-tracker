import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/authContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

const LogPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [type, setType] = useState('expense'); // expense or income
  const [category, setCategory] = useState('');
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // today
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch categories when type changes
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('/transactions/categories');
        if (res.ok) {
          const data = await res.json();
          setCategories(data[type] || []);
          // Set category to the first one by default
          if (data[type] && data[type].length > 0) {
            setCategory(data[type][0]);
          }
        } else {
          setError('Failed to load categories');
        }
      } catch (err) {
        setError('Failed to load categories');
      }
    };
    fetchCategories();
  }, [type]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);
    try {
      const res = await api.postForm('/transactions/', {
        type,
        category,
        label,
        amount: parseFloat(amount),
        date,
      });
      if (res.ok) {
        setSuccess(true);
        setError('');
        // Reset form
        setLabel('');
        setAmount('');
        setDate(new Date().toISOString().split('T')[0]);
        setCategory(categories[0] || '');
      } else {
        const errorData = await res.json();
        setError(errorData.detail || 'Failed to create transaction');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="log-page">
      <div className="log-card">
        <h2>Log Transaction</h2>
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="type">Type:</label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              required
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
          <div>
            <label htmlFor="category">Category:</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              disabled={categories.length === 0}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="label">Label:</label>
            <input
              type="text"
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
              maxLength={100}
            />
          </div>
          <div>
            <label htmlFor="amount">Amount ($):</label>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              min="0.01"
              step="0.01"
            />
          </div>
          <div>
            <label htmlFor="date">Date:</label>
            <input
              type="date"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          {error && <div className="error">{error}</div>}
          {success && <div className="success">Transaction logged successfully!</div>}
          <button type="submit" disabled={loading}>
            {loading ? 'Logging...' : 'Log Transaction'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LogPage;