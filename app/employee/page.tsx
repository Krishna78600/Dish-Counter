// app/employee/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../context/authcontext';
import { getTodayMenu, placeOrder, getMyTodayOrder, MenuItem, OrderItem, Order } from '../../lib/firebase';
import { logOut } from '../../lib/firebase';
import { useRouter } from 'next/navigation';

export default function EmployeeDashboard() {
  const { user, setRole } = useAuth();
  const router = useRouter();
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<{ [itemId: string]: number }>({});
  const [myOrder, setMyOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [message, setMessage] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [menuItems, order] = await Promise.all([
        getTodayMenu(),
        user ? getMyTodayOrder(user.uid) : null,
      ]);
      setMenu(menuItems);
      setMyOrder(order);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const handleAddToCart = (itemId: string) => {
    setCart((prev) => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart((prev) => {
      const newCart = { ...prev };
      if (newCart[itemId] > 1) {
        newCart[itemId]--;
      } else {
        delete newCart[itemId];
      }
      return newCart;
    });
  };

  const getCartTotal = () => {
    return Object.entries(cart).reduce((total, [itemId, qty]) => {
      const item = menu.find((m) => m.id === itemId);
      return total + (item?.price || 0) * qty;
    }, 0);
  };

  const getCartItemCount = () => {
    return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  };

  const handlePlaceOrder = async () => {
    if (!user) return;
    setOrdering(true);
    setMessage('');

    const orderItems: OrderItem[] = Object.entries(cart).map(([itemId, qty]) => {
      const item = menu.find((m) => m.id === itemId)!;
      return {
        menuItemId: itemId,
        name: item.name,
        quantity: qty,
        price: item.price,
      };
    });

    try {
      const result = await placeOrder(user.uid, user.email || '', orderItems);
      if (result.success) {
        setMessage('✅ Order placed successfully!');
        setCart({});
        await loadData();
      } else {
        setMessage(`❌ ${result.error}`);
      }
    } catch (error: any) {
      setMessage(`❌ ${error.message}`);
    }
    setOrdering(false);
  };

  const handleLogout = async () => {
    await logOut();
    setRole(null);
    router.push('/login');
  };

  if (!mounted || loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 50%, #c7d2fe 100%)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', animation: 'pulse 1.5s ease-in-out infinite' }}>🍽️</div>
          <p style={{ color: '#6366f1', fontWeight: '600', fontSize: '1.1rem' }}>Loading your menu...</p>
        </div>
        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.15); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 50%, #c7d2fe 100%)', padding: '2rem', fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif' }}>
      <style>{`
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .menu-card:hover {
          transform: translateY(-4px) !important;
          box-shadow: 0 12px 40px rgba(99, 102, 241, 0.2) !important;
        }
      `}</style>

      {/* Header */}
      <div style={{ maxWidth: '1000px', margin: '0 auto', animation: 'slideInUp 0.5s ease-out' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1e1b4b', margin: '0 0 0.25rem 0', letterSpacing: '-0.5px' }}>
              🍽️ Employee Canteen
            </h1>
            <p style={{ fontSize: '0.9rem', color: '#6366f1', margin: 0, fontWeight: '500' }}>
              Welcome, {user?.email?.split('@')[0] || 'Employee'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '0.6rem 1.25rem',
              background: 'rgba(255, 255, 255, 0.8)',
              color: '#6366f1',
              border: '2px solid #c7d2fe',
              borderRadius: '10px',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
          >
            🚪 Logout
          </button>
        </div>

        {/* Already Ordered Banner */}
        {myOrder && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(72, 187, 120, 0.1) 0%, rgba(56, 161, 105, 0.08) 100%)',
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '2rem',
            border: '1px solid rgba(72, 187, 120, 0.2)',
            animation: 'slideInUp 0.6s ease-out',
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#22543d', margin: '0 0 0.75rem 0' }}>
              ✅ Your Order for Today
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
              {myOrder.items.map((item, idx) => (
                <div key={idx} style={{
                  background: 'white',
                  borderRadius: '10px',
                  padding: '0.6rem 1rem',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  color: '#2d3748',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}>
                  {item.name} × {item.quantity} — ₹{item.price * item.quantity}
                </div>
              ))}
            </div>
            <div style={{ fontSize: '1rem', fontWeight: '700', color: '#22543d' }}>
              Total: ₹{myOrder.total} • Status: <span style={{
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                background: myOrder.status === 'ready' ? '#c6f6d5' : myOrder.status === 'confirmed' ? '#bee3f8' : '#fefcbf',
                color: myOrder.status === 'ready' ? '#22543d' : myOrder.status === 'confirmed' ? '#2a4365' : '#744210',
              }}>{myOrder.status.toUpperCase()}</span>
            </div>
          </div>
        )}

        {/* Today's Menu */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.75)',
          borderRadius: '20px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
          padding: '2rem',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.6)',
          animation: 'slideInUp 0.6s ease-out',
        }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#1e1b4b', margin: '0 0 1.5rem 0' }}>
            📋 Today&apos;s Menu
          </h2>

          {menu.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>🍽️</div>
              <p style={{ fontSize: '1.1rem', fontWeight: '600', color: '#6b7280' }}>No menu available today</p>
              <p style={{ fontSize: '0.9rem', color: '#9ca3af', marginTop: '0.5rem' }}>The admin hasn&apos;t published today&apos;s menu yet. Please check back later.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
              {menu.filter(item => item.available).map((item) => {
                const qty = cart[item.id] || 0;
                return (
                  <div
                    key={item.id}
                    className="menu-card"
                    style={{
                      background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                      borderRadius: '16px',
                      padding: '1.5rem',
                      border: qty > 0 ? '2px solid #6366f1' : '1px solid #e2e8f0',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      cursor: 'default',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {qty > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '0.6rem',
                        right: '0.6rem',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        color: 'white',
                        borderRadius: '50%',
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                      }}>
                        {qty}
                      </div>
                    )}
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#6366f1',
                      background: 'rgba(99, 102, 241, 0.08)',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '6px',
                      marginBottom: '0.75rem',
                      display: 'inline-block',
                    }}>
                      {item.category}
                    </span>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e1b4b', margin: '0.5rem 0 0.25rem 0' }}>
                      {item.name}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '0 0 1rem 0', lineHeight: '1.4' }}>
                      {item.description || 'Delicious meal prepared fresh'}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1e1b4b' }}>₹{item.price}</span>
                      {myOrder ? (
                        <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: '500' }}>Already ordered</span>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {qty > 0 && (
                            <button
                              onClick={() => handleRemoveFromCart(item.id)}
                              style={{
                                width: '32px', height: '32px',
                                borderRadius: '8px',
                                border: '2px solid #e2e8f0',
                                background: 'white',
                                fontSize: '1rem',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.2s ease',
                                fontWeight: '700',
                                color: '#6366f1',
                              }}
                            >
                              −
                            </button>
                          )}
                          <button
                            onClick={() => handleAddToCart(item.id)}
                            style={{
                              padding: qty > 0 ? '0' : '0.5rem 1rem',
                              width: qty > 0 ? '32px' : 'auto',
                              height: qty > 0 ? '32px' : 'auto',
                              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                              color: 'white',
                              border: 'none',
                              borderRadius: qty > 0 ? '8px' : '10px',
                              fontSize: qty > 0 ? '1rem' : '0.85rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            {qty > 0 ? '+' : '+ Add'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart / Order Summary */}
        {getCartItemCount() > 0 && !myOrder && (
          <div style={{
            position: 'fixed',
            bottom: '2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            borderRadius: '16px',
            padding: '1rem 2rem',
            boxShadow: '0 10px 40px rgba(79, 70, 229, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '1.5rem',
            zIndex: 50,
            animation: 'slideInUp 0.4s ease-out',
            minWidth: '300px',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', fontWeight: '500' }}>
                {getCartItemCount()} item{getCartItemCount() > 1 ? 's' : ''} selected
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'white' }}>
                ₹{getCartTotal()}
              </div>
            </div>
            <button
              onClick={handlePlaceOrder}
              disabled={ordering}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: '2px solid rgba(255,255,255,0.3)',
                borderRadius: '12px',
                fontSize: '0.95rem',
                fontWeight: '700',
                cursor: ordering ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(10px)',
              }}
            >
              {ordering ? '⏳ Placing...' : '🛒 Place Order'}
            </button>
          </div>
        )}

        {/* Message */}
        {message && (
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            background: message.startsWith('✅') ? 'rgba(72, 187, 120, 0.1)' : 'rgba(255, 99, 99, 0.1)',
            color: message.startsWith('✅') ? '#22543d' : '#c53030',
            fontWeight: '500',
            fontSize: '0.95rem',
            animation: 'slideInUp 0.3s ease-out',
          }}>
            {message}
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '3rem', padding: '1.5rem', color: '#6b7280', fontSize: '0.9rem', fontWeight: '500' }}>
          <p>Crafted with ❤️ by <span style={{ color: '#1e1b4b', fontWeight: '600' }}>Krishna Tulaskar</span></p>
        </div>
      </div>
    </div>
  );
}
