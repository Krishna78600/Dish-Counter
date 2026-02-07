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
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem', fontFamily: 'Arial' }}>
      <h1>🍽️ Meal Management - Firebase Auto-Archive</h1>
      <p style={{ color: '#666', marginBottom: '0.5rem' }}>
        🔄 Real-time sync + 🗃️ Auto-archive at midnight + ☁️ Firebase
      </p>
      <p style={{ color: '#888', fontSize: '12px', marginBottom: '1rem' }}>
        Last sync: {lastSync} | {archiveStatus}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        <div style={{ border: '2px solid #4CAF50', padding: '1.5rem', borderRadius: '8px', backgroundColor: '#f1f8f4' }}>
          <h2>📝 Provide Meal</h2>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Employee ID:</label>
            <input
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
              placeholder="e.g., EMP001"
              style={{
                width: '100%',
                padding: '10px',
                boxSizing: 'border-box',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Meal Type:</label>
            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value as 'MORNING' | 'EVENING')}
              style={{
                width: '100%',
                padding: '10px',
                boxSizing: 'border-box',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            >
              <option value="MORNING">🌅 Morning</option>
              <option value="EVENING">🌆 Evening</option>
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Counter:</label>
            <select
              value={counterId}
              onChange={(e) => setCounterId(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '10px',
                boxSizing: 'border-box',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            >
              <option value={1}>Counter 1 (Morning)</option>
              <option value={2}>Counter 2 (Evening)</option>
              <option value={3}>Counter 3 (Evening)</option>
            </select>
          </div>

          <button
            onClick={handleProvideMeal}
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              marginBottom: '10px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? '⏳ Processing...' : '✅ Provide Meal'}
          </button>

          <button
            onClick={handleCheckEligibility}
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              marginBottom: '10px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            🔍 Check Eligibility
          </button>

          <button
            onClick={handleManualSync}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#9C27B0',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            🔄 Manual Sync
          </button>
        </div>

        <div style={{ border: '2px solid #2196F3', padding: '1.5rem', borderRadius: '8px', backgroundColor: '#e3f2fd' }}>
          <h2>📢 Response</h2>
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'white',
              borderRadius: '4px',
              minHeight: '250px',
              border: '1px solid #90caf9',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              fontFamily: 'monospace',
              fontSize: '14px',
              lineHeight: '1.6',
              overflowY: 'auto',
            }}
          >
            {response ? (
              <p style={{ margin: 0 }}>{response}</p>
            ) : (
              <p style={{ color: '#999', margin: 0 }}>Response will appear here...</p>
            )}
          </div>
        </div>
      </div>

      <div style={{ border: '2px solid #FF9800', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', backgroundColor: '#fff3e0' }}>
        <h2>📊 Today's Meals (Active Collection Only)</h2>
        <p style={{ color: '#f57c00', fontSize: '12px', marginBottom: '1rem' }}>
          ⚡ Real-time - Yesterday archived at midnight
        </p>

        {todayMeals.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#FF9800', color: 'white' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Employee ID</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Meal Type</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Counter</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {todayMeals.map((record, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '12px' }}><strong>{record.employeeId}</strong></td>
                  <td style={{ padding: '12px' }}>
                    {record.mealType === 'MORNING' ? '🌅 Morning' : '🌆 Evening'}
                  </td>
                  <td style={{ padding: '12px' }}>Counter {record.counterId}</td>
                  <td style={{ padding: '12px' }}>
                    {new Date(record.timestamp).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: '#999', textAlign: 'center' }}>No meals today yet</p>
        )}
      </div>

      <div style={{ border: '2px solid #673AB7', padding: '1.5rem', borderRadius: '8px', backgroundColor: '#f3e5f5' }}>
        <h2>📋 Employee History (From Archive)</h2>
        <button
          onClick={() => fetchHistory()}
          disabled={!employeeId.trim()}
          style={{
            padding: '10px 16px',
            marginBottom: '1rem',
            backgroundColor: '#673AB7',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: employeeId.trim() ? 'pointer' : 'not-allowed',
            fontWeight: 'bold',
            opacity: employeeId.trim() ? 1 : 0.5,
          }}
        >
          📖 Fetch History for {employeeId || 'Employee'}
        </button>

        {history.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0' }}>
                <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Date</th>
                <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Meal Type</th>
                <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Counter</th>
              </tr>
            </thead>
            <tbody>
              {history.map((record, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>{record.date}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                    {record.mealType === 'MORNING' ? '🌅 Morning' : '🌆 Evening'}
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>Counter {record.counterId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: '#999' }}>
            {employeeId.trim() ? `No history for ${employeeId}` : 'Enter employee ID'}
          </p>
        )}
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#e8f5e9', borderRadius: '4px', border: '1px solid #4caf50' }}>
        <details>
          <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#2e7d32' }}>
            ℹ️ How Firebase Works (Click to expand)
          </summary>
          <div style={{ marginTop: '1rem', fontSize: '13px', color: '#555', lineHeight: '1.6' }}>
            <p><strong>Firebase Collections (NOT Sheets):</strong></p>
            <ul>
              <li>📝 active - Today's meals (for checking)</li>
              <li>📦 archive - Historical data (backup)</li>
              <li>⚙️ config - Settings (timestamp)</li>
            </ul>
            <p><strong>Daily Cycle:</strong></p>
            <ul>
              <li>Morning: Employee eats → Save to active</li>
              <li>Evening: Same employee → Check active → Block</li>
              <li>Midnight: Auto-archive runs</li>
              <li>Tomorrow: Fresh start (active empty)</li>
            </ul>
            <p><strong>NO Synchronization Between Collections:</strong></p>
            <ul>
              <li>✅ When you save to active, only active changes</li>
              <li>❌ Archive does NOT auto-add</li>
              <li>❌ Config does NOT auto-update</li>
              <li>✅ Only at midnight: active → archive + config update</li>
            </ul>
          </div>
        </details>
      </div>
    </div>
  );
}