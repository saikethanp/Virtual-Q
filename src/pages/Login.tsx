import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import classes from './Login.module.css';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();
          
        if (profile?.role === 'business_owner') {
          navigate('/business/dashboard');
        } else {
          navigate('/discover');
        }
      }
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) throw authError;

      if (data.session && data.user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', data.user.id)
          .single();

        if (profileError || !profileData) {
          throw new Error('Profile not found.');
        }

        if (profileData.role === 'business_owner') {
          const { data: businessData, error: businessError } = await supabase
            .from('businesses')
            .select('id')
            .eq('owner_id', data.user.id)
            .single();

          if (businessError || !businessData) {
            throw new Error('Business record not found for this owner.');
          }
          
          navigate('/business/dashboard');
        } else {
          navigate('/discover');
        }
      }
    } catch (err: any) {
      setError(err.message === 'Invalid login credentials' ? 'Incorrect email or password.' : err.message || 'Login failed.');
    }
  };

  return (
    <div className={classes.page}>
      <Link to="/" className={classes.backBtn} aria-label="Go back">←</Link>
      <div className={classes.card}>
        <Link to="/" className={classes.logo}><img src="/logo.png" alt="Virtual-Q Logo" className={classes.logoImage} /></Link>
        <h1 className={classes.title}>Welcome back.</h1>
        <p className={classes.subtitle}>Sign in to manage your business.</p>

        <form className={classes.form} onSubmit={handleSubmit}>
          <div className={classes.formGroup}>
            <label className={classes.formLabel}>Business Email</label>
            <input 
              type="email" 
              className={classes.formInput} 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className={classes.formGroup}>
            <label className={classes.formLabel}>Password</label>
            <input 
              type="password" 
              className={classes.formInput} 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <span className={classes.errorText}>{error}</span>}

          <button type="submit" className={classes.submitBtn}>Sign In</button>
        </form>

        <div className={classes.footer}>
          Don't have a business account? 
          <Link to="/business/register" className={classes.link}>Create one</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
