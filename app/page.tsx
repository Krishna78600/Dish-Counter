'use client';

import { useState, useEffect } from 'react';
import {
  checkEmployeeExists,
  saveMealRecord,
  getTodayMeals,
  getEmployeeHistory,
  initializeArchiveSchedule,
  shouldArchive,
  archiveYesterdayData,
  type MealRecord,
} from '@/lib/firebase';

export default function MealManagement() {
  const [employeeId, setEmployeeId] = useState('');
  const [counterId, setCounterId] = useState<number>(1);
  const [mealType, setMealType] = useState<'MORNING' | 'EVENING'>('MORNING');
  const [response, setResponse] = useState('');
  const [todayMeals, setTodayMeals] = useState<MealRecord[]>([]);
  const [history, setHistory] = useState<MealRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [lastSync, setLastSync] = useState<string>('Never');
  const [archiveStatus, setArchiveStatus] = useState<string>('Checking...');
  const [showTodayMeals, setShowTodayMeals] = useState(false);

  useEffect(() => {
    setMounted(true);
    initializeArchiveSchedule();
    checkAndArchive();
    loadTodayMeals();
  }, []);

  const checkAndArchive = async () => {
    const needsArchive = await shouldArchive();
    if (needsArchive) {
      console.log('🔄 Running auto-archive on app load...');
      const result = await archiveYesterdayData();
      setArchiveStatus(`✅ Auto-archived ${result.archived} records`);
    } else {
      setArchiveStatus('✅ Archive up to date');
    }
  };

  const loadTodayMeals = async () => {
    const meals = await getTodayMeals();
    setTodayMeals(meals);
    setLastSync(new Date().toLocaleTimeString());
  };

  const handleProvideMeal = async () => {
    if (!employeeId.trim()) {
      setResponse('❌ Please enter employee ID');
      return;
    }

    setLoading(true);

    const check = await checkEmployeeExists(employeeId);

    if (check.error) {
      setResponse(`❌ ${check.error}`);
      setLoading(false);
      return;
    }

    if (check.exists) {
      setResponse(
        `❌ Employee ${employeeId} already received a meal today\n(${check.mealType} at Counter ${check.counterId})`
      );
      setLoading(false);
      return;
    }

    const result = await saveMealRecord(employeeId, mealType, counterId);

    if (result.success) {
      setResponse(
        `✅ Meal provided successfully!\nEmployee: ${employeeId}\nType: ${mealType}\nCounter: ${counterId}`
      );
      setEmployeeId('');
      await loadTodayMeals();
    } else {
      setResponse(`❌ ${result.error}`);
    }

    setLoading(false);
  };

  const handleCheckEligibility = async () => {
    if (!employeeId.trim()) {
      setResponse('❌ Please enter employee ID');
      return;
    }

    setLoading(true);
    const check = await checkEmployeeExists(employeeId);

    if (check.error) {
      setResponse(`❌ ${check.error}`);
    } else if (check.exists) {
      setResponse(
        `❌ Employee ${employeeId} already received a meal today\n(${check.mealType} at Counter ${check.counterId})`
      );
    } else {
      setResponse(`✅ Employee ${employeeId} is ELIGIBLE for a meal`);
    }

    setLoading(false);
  };

  const fetchHistory = async () => {
    if (!employeeId.trim()) {
      setResponse('❌ Please enter employee ID');
      return;
    }

    const records = await getEmployeeHistory(employeeId);
    setHistory(records);
    setResponse(`📋 Showing ${records.length} past meal records for ${employeeId}`);
  };

  const handleManualSync = async () => {
    await loadTodayMeals();
    setResponse('✅ Data refreshed successfully!');
  };

  if (!mounted) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
          <p style={{ fontSize: '1.2rem', fontWeight: '500' }}>Loading your meal management system...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', padding: '2rem' }}>
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Inter:wght@400;500;600&display=swap');

        body {
          font-family: 'Inter', sans-serif;
          color: #1a202c;
        }

        h1, h2, h3 {
          font-family: 'Poppins', sans-serif;
          font-weight: 700;
        }

        input, select {
          font-family: 'Inter', sans-serif;
        }

        button {
          font-family: 'Poppins', sans-serif;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
        }

        button:active:not(:disabled) {
          transform: translateY(0);
        }

        input:focus, select:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
          border-color: #667eea;
        }

        table {
          font-size: 0.95rem;
          letter-spacing: 0.3px;
        }

        tbody tr {
          transition: background-color 0.2s ease;
        }

        tbody tr:hover {
          background-color: rgba(102, 126, 234, 0.05);
        }
      `}</style>

      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', gap: '0.5rem' }}>
            <span style={{ fontSize: '3rem' }}>🍲</span>
            <h1 style={{ fontSize: '3rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
              Samosa Man 
            </h1>
             <span style={{ fontSize: '3rem' }}>🌶️</span>
          </div>
          <p style={{ fontSize: '1.1rem', color: '#4a5568', fontWeight: '500', marginBottom: '0.5rem' }}>
            Employee Meal Management System
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1.5rem', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#667eea', fontWeight: '500' }}>
              <span>⏱️</span> Last sync: {lastSync}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#667eea', fontWeight: '500' }}>
              <span>📦</span> {archiveStatus}
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
          {/* Left Column - Form */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '2rem',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)',
            border: '1px solid rgba(102, 126, 234, 0.1)',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 30px 80px rgba(0, 0, 0, 0.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.08)';
          }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '1.8rem' }}>📝</span>
              <h2 style={{ fontSize: '1.5rem', margin: 0, color: '#1a202c' }}>Provide Meal</h2>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.7rem', fontWeight: '600', color: '#2d3748', fontSize: '0.95rem' }}>
                Employee ID
              </label>
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                placeholder="e.g., EMP001"
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  fontWeight: '500',
                  letterSpacing: '0.5px',
                  backgroundColor: '#f7fafc',
                  transition: 'all 0.3s ease',
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.7rem', fontWeight: '600', color: '#2d3748', fontSize: '0.95rem' }}>
                Meal Type
              </label>
              <select
                value={mealType}
                onChange={(e) => setMealType(e.target.value as 'MORNING' | 'EVENING')}
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  fontWeight: '500',
                  backgroundColor: '#f7fafc',
                  cursor: 'pointer',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23667eea' stroke-width='2'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.75rem center',
                  backgroundSize: '1.2em',
                  paddingRight: '2.5rem',
                }}
              >
                <option value="MORNING">🌅 Morning</option>
                <option value="EVENING">🌆 Evening</option>
              </select>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.7rem', fontWeight: '600', color: '#2d3748', fontSize: '0.95rem' }}>
                Counter
              </label>
              <select
                value={counterId}
                onChange={(e) => setCounterId(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  fontWeight: '500',
                  backgroundColor: '#f7fafc',
                  cursor: 'pointer',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23667eea' stroke-width='2'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.75rem center',
                  backgroundSize: '1.2em',
                  paddingRight: '2.5rem',
                }}
              >
                <option value={1}>Counter 1 (Morning)</option>
                <option value={2}>Counter 2 (Evening)</option>
                <option value={3}>Counter 3 (Evening)</option>
              </select>
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
              <button
                onClick={handleProvideMeal}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.875rem 1.5rem',
                  background: loading ? '#cbd5e0' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  letterSpacing: '0.5px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {loading ? '⏳ Processing...' : '✅ Provide Meal'}
              </button>

              <button
                onClick={handleCheckEligibility}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.875rem 1.5rem',
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  letterSpacing: '0.5px',
                }}
              >
                🔍 Check Eligibility
              </button>

              <button
                onClick={handleManualSync}
                style={{
                  width: '100%',
                  padding: '0.875rem 1.5rem',
                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  letterSpacing: '0.5px',
                }}
              >
                🔄 Manual Sync
              </button>
            </div>
          </div>

          {/* Right Column - Response */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '2rem',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)',
            border: '1px solid rgba(102, 126, 234, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 30px 80px rgba(0, 0, 0, 0.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.08)';
          }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '1.8rem' }}>📢</span>
              <h2 style={{ fontSize: '1.5rem', margin: 0, color: '#1a202c' }}>Response</h2>
            </div>
            <div
              style={{
                flex: 1,
                padding: '1.5rem',
                backgroundColor: '#f7fafc',
                borderRadius: '12px',
                border: '2px solid #e2e8f0',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                fontFamily: "'Courier New', monospace",
                fontSize: '0.9rem',
                lineHeight: '1.7',
                overflowY: 'auto',
                minHeight: '200px',
                color: '#2d3748',
              }}
            >
              {response ? (
                <span style={{ fontWeight: '500', letterSpacing: '0.3px' }}>{response}</span>
              ) : (
                <span style={{ color: '#a0aec0', fontStyle: 'italic' }}>System responses will appear here...</span>
              )}
            </div>
          </div>
        </div>

        {/* Today's Meals Section */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)',
          border: '1px solid rgba(102, 126, 234, 0.1)',
          marginBottom: '2rem',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 30px 80px rgba(0, 0, 0, 0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.08)';
        }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.8rem' }}>📊</span>
              <div>
                <h2 style={{ fontSize: '1.5rem', margin: 0, color: '#1a202c' }}>Today's Meals</h2>
                <p style={{ fontSize: '0.85rem', color: '#a0aec0', margin: '0.25rem 0 0 0', fontWeight: '500' }}>Active Collection Only</p>
              </div>
            </div>
            <button
              onClick={() => setShowTodayMeals(!showTodayMeals)}
              style={{
                padding: '0.75rem 1.5rem',
                background: showTodayMeals ? 'linear-gradient(135deg, #f5576c 0%, #f093fb 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontWeight: '600',
                fontSize: '0.95rem',
                cursor: 'pointer',
                letterSpacing: '0.5px',
              }}
            >
              {showTodayMeals ? '🔼 Hide' : '🔽 Show'} Meals ({todayMeals.length})
            </button>
          </div>

          <p style={{ fontSize: '0.85rem', color: '#667eea', fontWeight: '600', marginBottom: '1.5rem', letterSpacing: '0.5px' }}>
            ⚡ Real-time - Yesterday archived at midnight
          </p>

          {showTodayMeals && (
            <>
              {todayMeals.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f7fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#2d3748', fontSize: '0.9rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Employee ID</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#2d3748', fontSize: '0.9rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Meal Type</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#2d3748', fontSize: '0.9rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Counter</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#2d3748', fontSize: '0.9rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayMeals.map((record, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '1rem', fontWeight: '600', color: '#667eea' }}>{record.employeeId}</td>
                          <td style={{ padding: '1rem', color: '#2d3748' }}>
                            {record.mealType === 'MORNING' ? '🌅 Morning' : '🌆 Evening'}
                          </td>
                          <td style={{ padding: '1rem', color: '#2d3748' }}>Counter {record.counterId}</td>
                          <td style={{ padding: '1rem', color: '#2d3748', fontSize: '0.9rem' }}>
                            {new Date(record.timestamp).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#a0aec0' }}>
                  <p style={{ fontSize: '1rem', fontWeight: '500' }}>No meals recorded today yet</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Employee History Section */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)',
          border: '1px solid rgba(102, 126, 234, 0.1)',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 30px 80px rgba(0, 0, 0, 0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.08)';
        }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '1.8rem' }}>📋</span>
            <h2 style={{ fontSize: '1.5rem', margin: 0, color: '#1a202c' }}>Employee History</h2>
          </div>

          <p style={{ fontSize: '0.85rem', color: '#a0aec0', marginBottom: '1.5rem', fontWeight: '500' }}>From Archive</p>

          <button
            onClick={() => fetchHistory()}
            disabled={!employeeId.trim()}
            style={{
              padding: '0.875rem 1.5rem',
              marginBottom: '1.5rem',
              background: employeeId.trim() ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#cbd5e0',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontWeight: '600',
              fontSize: '0.95rem',
              cursor: employeeId.trim() ? 'pointer' : 'not-allowed',
              opacity: employeeId.trim() ? 1 : 0.7,
              letterSpacing: '0.5px',
            }}
          >
            📖 Fetch History for {employeeId || 'Employee'}
          </button>

          {history.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f7fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#2d3748', fontSize: '0.9rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Date</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#2d3748', fontSize: '0.9rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Meal Type</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#2d3748', fontSize: '0.9rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Counter</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((record, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '1rem', fontWeight: '600', color: '#667eea' }}>{record.date}</td>
                      <td style={{ padding: '1rem', color: '#2d3748' }}>
                        {record.mealType === 'MORNING' ? '🌅 Morning' : '🌆 Evening'}
                      </td>
                      <td style={{ padding: '1rem', color: '#2d3748' }}>Counter {record.counterId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#a0aec0' }}>
              <p style={{ fontSize: '1rem', fontWeight: '500' }}>
                {employeeId.trim() ? `No history found for ${employeeId}` : 'Enter an employee ID to view history'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}