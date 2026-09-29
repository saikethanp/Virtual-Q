import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import classes from './MyQueue.module.css';

const MyQueue = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  
  const [queues, setQueues] = useState<any[]>([]);
  
  const [authData, setAuthData] = useState({ name: '', phone: '', email: '', password: '', isLogin: true });
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    setSession(session);
    if (session) {
      await fetchQueues(session.user.id);
    }
    setLoading(false);
  };

  const fetchQueues = async (userId: string) => {
    try {
      const { data: queueEntries, error } = await supabase
        .from('queue_entries')
        .select(`
          *,
          orders (*, order_items (*)),
          businesses (name)
        `)
        .eq('user_id', userId)
        .in('status', ['Waiting', 'waiting', 'Serving', 'serving'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQueues(queueEntries || []);
    } catch (err) {
      console.error('Error fetching queues:', err);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      if (authData.isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authData.email,
          password: authData.password
        });
        if (error) throw error;
        if (data.session) {
          setSession(data.session);
          await fetchQueues(data.session.user.id);
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: authData.email,
          password: authData.password
        });
        if (error) throw error;
        if (data.session) {
          await supabase.from('profiles').upsert({
            user_id: data.user!.id,
            full_name: authData.name,
            phone: authData.phone,
            role: 'customer'
          });
          setSession(data.session);
          await fetchQueues(data.session.user.id);
        }
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  if (loading) {
    return <div className={classes.page}><div className="container">Loading...</div></div>;
  }

  if (!session) {
    return (
      <div className={classes.page}>
        <div className="container">
          <div className={classes.authCard}>
            <h1 className={classes.title}>{authData.isLogin ? 'Sign in to continue' : 'Register to continue'}</h1>
            <form onSubmit={handleAuthSubmit}>
              {!authData.isLogin && (
                <>
                  <div className={classes.formGroup}>
                    <label>Full Name *</label>
                    <input 
                      type="text" 
                      className={classes.formInput} 
                      value={authData.name}
                      onChange={e => setAuthData({...authData, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className={classes.formGroup}>
                    <label>Phone Number *</label>
                    <input 
                      type="tel" 
                      className={classes.formInput} 
                      value={authData.phone}
                      onChange={e => setAuthData({...authData, phone: e.target.value})}
                      required
                    />
                  </div>
                </>
              )}
              
              <div className={classes.formGroup}>
                <label>Email *</label>
                <input 
                  type="email" 
                  className={classes.formInput} 
                  value={authData.email}
                  onChange={e => setAuthData({...authData, email: e.target.value})}
                  required
                />
              </div>
              <div className={classes.formGroup}>
                <label>Password *</label>
                <input 
                  type="password" 
                  className={classes.formInput} 
                  value={authData.password}
                  onChange={e => setAuthData({...authData, password: e.target.value})}
                  required
                />
              </div>
              
              {authError && <div className={classes.errorText}>{authError}</div>}
              
              <button type="submit" className={classes.primaryBtn} disabled={authLoading}>
                {authLoading ? 'Authenticating...' : (authData.isLogin ? 'Sign In' : 'Register')}
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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={classes.page}>
      <div className="container">
        <header className={classes.header}>
          <button onClick={() => navigate(-1)} className={classes.backBtn}>
            ← Back
          </button>
          <h1 className={classes.pageTitle}>MY QUEUE</h1>
        </header>

        {queues.length === 0 ? (
          <div className={classes.emptyState}>
            <p>You're not currently in a queue.</p>
            <Link to="/discover" className={classes.primaryBtn} style={{ display: 'inline-block', marginTop: '24px', textDecoration: 'none' }}>
              Find a business
            </Link>
          </div>
        ) : (
          <div className={classes.queueList}>
            {queues.map(q => {
              const businessName = q.businesses?.name || 'Unknown Business';
              const order = q.orders;
              return (
                <div key={q.id} className={classes.queueCard}>
                  <div className={classes.cardHeader}>
                    <h2>{businessName}</h2>
                    <span className={classes.statusBadge}>{q.status}</span>
                  </div>
                  
                  <div className={classes.queueNumberMain}>{q.queue_number}</div>
                  
                  <div className={classes.queueMeta}>
                    <div className={classes.metaItem}>
                      <span className={classes.metaLabel}>People Ahead</span>
                      <span className={classes.metaValue}>--</span>
                    </div>
                    <div className={classes.metaItem}>
                      <span className={classes.metaLabel}>Est. Wait</span>
                      <span className={classes.metaValue}>~{q.estimated_wait} min</span>
                    </div>
                  </div>

                  <div className={classes.orderDetails}>
                    <h3>Order:</h3>
                    <ul>
                      {order?.order_items?.map((item: any) => (
                        <li key={item.id}>{item.quantity} × {item.name}</li>
                      ))}
                    </ul>
                    <div className={classes.orderTotal}>
                      Total: ₹{order?.total}
                    </div>
                  </div>

                  {/* For now, just a placeholder for View Queue, or it can link to a detailed queue tracking page */}
                  <button className={classes.secondaryBtn} style={{ width: '100%', marginTop: '16px' }}>
                    View Queue
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyQueue;
