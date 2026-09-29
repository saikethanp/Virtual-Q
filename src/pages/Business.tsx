import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Search } from 'lucide-react';

import classes from './Business.module.css';

type Step = 'cart' | 'auth' | 'success';

const Business = () => {
  const { id } = useParams(); // id is actually the slug based on our routes
  const navigate = useNavigate();
  const [business, setBusiness] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [pageLoading, setPageLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cart, setCart] = useState<{ [itemId: string]: number }>({});
  const [step, setStep] = useState<Step>('cart');
  const [authData, setAuthData] = useState({ name: '', phone: '', email: '', password: '', isLogin: true });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [queueData, setQueueData] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUserId(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchBusinessAndMenu = async () => {
      setPageLoading(true);
      const { data: bData } = await supabase
        .from('businesses')
        .select('*')
        .eq('slug', id)
        .single();
      
      if (bData) {
        setBusiness(bData);
        const { data: mData } = await supabase
          .from('menu_items')
          .select('*')
          .eq('business_id', bData.id)
          .eq('is_available', true);
        
        if (mData) setMenuItems(mData);
      }
      setPageLoading(false);
    };
    
    if (id) {
      fetchBusinessAndMenu();
    }
  }, [id]);

  const filteredMenu = useMemo(() => {
    if (!searchQuery) return menuItems;
    return menuItems.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [searchQuery, menuItems]);

  const updateCart = (itemId: string, delta: number) => {
    setCart(prev => {
      const current = prev[itemId] || 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: next };
    });
  };

  const cartItemsList = Object.entries(cart).map(([itemId, qty]) => {
    const item = menuItems.find(m => m.id === itemId)!;
    return { ...item, qty };
  }).filter(item => item.id); // Filter out any items that weren't found

  const cartTotal = cartItemsList.reduce((sum, item) => sum + (item.price * item.qty), 0);

  if (pageLoading) {
    return <div className={classes.page}><div className="container">Loading business...</div></div>;
  }

  if (!business) {
    return <div className={classes.page}><div className="container">Business not found.</div></div>;
  }

  const createQueueEntry = async (uid: string) => {
    try {
      // Create Order
      const { data: order, error: orderError } = await supabase.from('orders').insert({
        user_id: uid,
        business_id: business.id,
        total: cartTotal,
        status: 'pending'
      }).select().single();
      
      if (orderError) throw orderError;

      // Create Order Items
      const orderItemsToInsert = cartItemsList.map(item => ({
        order_id: order.id,
        menu_item_id: item.id,
        quantity: item.qty,
        price: item.price,
        name: item.name
      }));
      await supabase.from('order_items').insert(orderItemsToInsert);

      // Create Queue Entry
      const { data: queueEntry, error: queueError } = await supabase.from('queue_entries').insert({
        business_id: business.id,
        user_id: uid,
        order_id: order.id,
        status: 'Waiting',
        estimated_wait: 18
      }).select().single();
      
      if (queueError) throw queueError;
      
      setQueueData(queueEntry);
      setStep('success');
    } catch (err: any) {
      console.error(err);
      setError('Something went wrong. Please try again.');
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (authData.isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authData.email,
          password: authData.password
        });
        if (error) throw error;
        if (data.user) {
          await createQueueEntry(data.user.id);
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: authData.email,
          password: authData.password
        });
        if (error) throw error;
        if (data.user) {
          await supabase.from('profiles').upsert({
            user_id: data.user.id,
            full_name: authData.name,
            phone: authData.phone,
            role: 'customer'
          });
          await createQueueEntry(data.user.id);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (userId) {
      setLoading(true);
      await createQueueEntry(userId);
      setLoading(false);
    } else {
      setStep('auth');
    }
  };

  return (
    <div className={classes.page}>
      <div className="container">
        <div className={classes.layout}>
          
          {/* LEFT HALF - MENU */}
          <div className={classes.leftColumn}>
            <button onClick={() => navigate(-1)} className={classes.backBtn}>
              ← Back
            </button>
            <header className={classes.businessHeader}>
              {business.image_url && typeof business.image_url === 'string' && business.image_url.trim() !== '' && business.image_url !== 'null' ? (
                <img src={business.image_url} alt={business.name} className={classes.businessLogo} />
              ) : (
                <div className={classes.imageFallback}>{business.name.substring(0, 1).toUpperCase()}</div>
              )}
              <div className={classes.businessInfo}>
                <h1>{business.name}</h1>
                <p className={classes.businessCategory}>{business.category}</p>
                <div className={classes.businessMeta}>
                  <span className={classes.statusOpen}>Open now</span>
                  <span className={classes.rating}>★ 4.8 (210)</span>
                  <span className={classes.location}>{business.location}</span>
                </div>
              </div>
            </header>

            <section className={classes.menuSection}>
              <div className={classes.menuSearchContainer}>
                <Search className={classes.searchIcon} size={20} />
                <input 
                  type="text" 
                  className={classes.searchInput} 
                  placeholder="Search menu items..." 
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  onFocus={() => setShowSuggestions(true)}
                />
                
                {showSuggestions && searchQuery && filteredMenu.length > 0 && (
                  <div className={classes.searchSuggestions}>
                    {filteredMenu.slice(0, 5).map(item => (
                      <div 
                        key={item.id} 
                        className={classes.suggestionItem}
                        onClick={() => {
                          setSearchQuery(item.name);
                          setShowSuggestions(false);
                        }}
                      >
                        <span>{item.name}</span>
                        <span>₹{item.price}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={classes.menuList}>
                {filteredMenu.map(item => (
                  <div key={item.id} className={classes.menuItem}>
                    <div className={classes.itemInfo}>
                      <h3 className={classes.itemName}>{item.name}</h3>
                      <p className={classes.itemDesc}>{item.description}</p>
                      <div className={classes.itemPrice}>₹{item.price}</div>
                    </div>
                    <div className={classes.itemAction}>
                      {cart[item.id] ? (
                        <div className={classes.qtyControls}>
                          <button className={classes.qtyBtn} onClick={() => updateCart(item.id, -1)}>−</button>
                          <span>{cart[item.id]}</span>
                          <button className={classes.qtyBtn} onClick={() => updateCart(item.id, 1)}>+</button>
                        </div>
                      ) : (
                        <button className={classes.addBtn} onClick={() => updateCart(item.id, 1)}>
                          + Add
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* RIGHT HALF - PANEL */}
          <div className={classes.rightColumn}>
            <div className={classes.panel}>
              {step === 'cart' && (
                <>
                  <h2 className={classes.panelTitle}>YOUR ORDER</h2>
                  
                  {cartItemsList.length === 0 ? (
                    <div className={classes.emptyCart}>
                      Your cart is empty.
                    </div>
                  ) : (
                    <>
                      <div className={classes.cartList}>
                        {cartItemsList.map(item => (
                          <div key={item.id} className={classes.cartItem}>
                            <div>
                              <div className={classes.cartItemName}>{item.name}</div>
                              <div className={classes.qtyControls}>
                                <button className={classes.qtyBtn} onClick={() => updateCart(item.id, -1)}>−</button>
                                <span>{item.qty}</span>
                                <button className={classes.qtyBtn} onClick={() => updateCart(item.id, 1)}>+</button>
                              </div>
                            </div>
                            <div className={classes.cartItemPrice}>₹{item.price * item.qty}</div>
                          </div>
                        ))}
                      </div>
                      
                      <div className={classes.cartTotal}>
                        <span>Subtotal</span>
                        <span>₹{cartTotal}</span>
                      </div>
                      
                      <button 
                        className={classes.primaryBtn}
                        onClick={handleConfirmOrder}
                      >
                        Continue
                      </button>
                    </>
                  )}
                </>
              )}

              {step === 'auth' && (
                <>
                  <h2 className={classes.panelTitle}>{authData.isLogin ? 'LOG IN' : 'REGISTER'}</h2>
                  <form onSubmit={handleAuthSubmit}>
                    {!authData.isLogin && (
                      <>
                        <div className={classes.formGroup}>
                          <label>Full Name *</label>
                          <input 
                            type="text" 
                            required 
                            className={classes.formInput}
                            value={authData.name}
                            onChange={e => setAuthData({...authData, name: e.target.value})}
                          />
                        </div>
                        <div className={classes.formGroup}>
                          <label>Phone Number *</label>
                          <input 
                            type="tel" 
                            required 
                            className={classes.formInput}
                            value={authData.phone}
                            onChange={e => setAuthData({...authData, phone: e.target.value})}
                          />
                        </div>
                      </>
                    )}
                    
                    <div className={classes.formGroup}>
                      <label>Email *</label>
                      <input 
                        type="email" 
                        required 
                        className={classes.formInput}
                        value={authData.email}
                        onChange={e => setAuthData({...authData, email: e.target.value})}
                      />
                    </div>
                    
                    <div className={classes.formGroup}>
                      <label>Password *</label>
                      <input 
                        type="password" 
                        required 
                        className={classes.formInput}
                        value={authData.password}
                        onChange={e => setAuthData({...authData, password: e.target.value})}
                      />
                    </div>
                    
                    {error && <div style={{ color: '#ef4444', marginBottom: '16px', fontSize: '0.875rem' }}>{error}</div>}
                    <button type="submit" className={classes.primaryBtn} style={{ marginTop: '24px' }} disabled={loading}>
                      {loading ? 'Authenticating...' : (authData.isLogin ? 'Log In & Join Queue' : 'Register & Join Queue')}
                    </button>
                    
                    <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.875rem' }}>
                      <button 
                        type="button"
                        onClick={() => setAuthData({...authData, isLogin: !authData.isLogin})} 
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        {authData.isLogin ? 'Need an account? Register' : 'Already have an account? Log In'}
                      </button>
                    </div>
                  </form>
                </>
              )}

              {step === 'success' && (
                <>
                  <div className={classes.successHeader}>
                    <div className={classes.successTitle}>QUEUE JOINED</div>
                    <p>Your Queue Number</p>
                    <div className={classes.queueNumber}>{queueData?.queue_number || 'Q127'}</div>
                  </div>
                  
                  <div className={classes.queueMeta}>
                    <div className={classes.metaItem}>
                      <span className={classes.metaLabel}>People Ahead</span>
                      <span className={classes.metaValue}>03</span>
                    </div>
                    <div className={classes.metaItem}>
                      <span className={classes.metaLabel}>Est. Wait</span>
                      <span className={classes.metaValue}>~{queueData?.estimated_wait || 18} min</span>
                    </div>
                  </div>

                  <div className={classes.successDetails}>
                    <p><strong>Order Total:</strong> ₹{cartTotal}</p>
                    <p><strong>Customer:</strong> {authData.name || 'Authenticated Customer'}</p>
                    
                    <h4>Order</h4>
                    <ul>
                      {cartItemsList.map(item => (
                        <li key={item.id}>{item.qty} × {item.name}</li>
                      ))}
                    </ul>
                    
                    <p style={{ marginTop: '16px', color: 'var(--color-green)' }}>
                      <strong>Status:</strong> Queue moving normally
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Business;
