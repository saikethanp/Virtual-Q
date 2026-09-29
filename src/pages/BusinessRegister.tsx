import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import classes from './BusinessRegister.module.css';

const BusinessRegister = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    ownerName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    category: '',
    location: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.ownerName) newErrors.ownerName = 'Owner Name is required';
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.phone) {
      newErrors.phone = 'Phone Number is required';
    } else if (!/^\d{10}$/.test(formData.phone.replace(/[-()\s]/g, ''))) {
      newErrors.phone = 'Invalid phone number format';
    }
    if (!formData.password) newErrors.password = 'Password is required';
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.location) newErrors.location = 'Location is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    setLoading(true);
    setErrors({});
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.ownerName,
            phone: formData.phone,
            category: formData.category,
            location: formData.location
          }
        }
      });

      if (error) throw error;
      
      if (data.user) {
        // Upsert profile
        const { error: profileError } = await supabase.from('profiles').upsert({
          user_id: data.user.id,
          full_name: formData.ownerName,
          phone: formData.phone,
          role: 'business_owner'
        });
        if (profileError) throw profileError;
        
        // Generate slug
        const slug = formData.ownerName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substring(2, 6);

        // Insert business
        const { error: businessError } = await supabase.from('businesses').insert({
          owner_id: data.user.id,
          name: formData.ownerName + "'s Business",
          slug: slug,
          category: formData.category,
          location: formData.location
        });
        if (businessError) throw businessError;

        // Redirect immediately if everything succeeded
        navigate('/business/dashboard');
      }
    } catch (err: any) {
      setErrors({ general: err.message || 'Failed to create account.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={classes.page}>
      <Link to="/" className={classes.backBtn} aria-label="Go back">←</Link>
      <div className={classes.card}>
        
        <>
            <div className={classes.header}>
              <span className={classes.topLabel}>FOR BUSINESS OWNERS</span>
              <h1 className={classes.title}>Put your business on Virtual-Q.</h1>
            </div>
            
            {errors.general && (
              <div style={{ color: '#ef4444', marginBottom: '16px', textAlign: 'center', fontSize: '0.875rem' }}>
                {errors.general}
              </div>
            )}

            <form onSubmit={handleSubmit} className={classes.form}>
              <div className={classes.formGroup}>
                <label className={classes.inputLabel}>Business Owner Name <span className={classes.requiredMark}>*</span></label>
                <input 
                  type="text" 
                  className={`${classes.input} ${errors.ownerName ? classes.error : ''}`}
                  value={formData.ownerName}
                  onChange={e => setFormData({...formData, ownerName: e.target.value})}
                />
                {errors.ownerName && <span className={classes.errorText}>{errors.ownerName}</span>}
              </div>

              <div className={classes.formRow}>
                <div className={classes.formGroup}>
                  <label className={classes.inputLabel}>Business Email <span className={classes.requiredMark}>*</span></label>
                  <input 
                    type="email" 
                    className={`${classes.input} ${errors.email ? classes.error : ''}`}
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                  {errors.email && <span className={classes.errorText}>{errors.email}</span>}
                </div>
                
                <div className={classes.formGroup}>
                  <label className={classes.inputLabel}>Phone Number <span className={classes.requiredMark}>*</span></label>
                  <input 
                    type="tel" 
                    className={`${classes.input} ${errors.phone ? classes.error : ''}`}
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                  {errors.phone && <span className={classes.errorText}>{errors.phone}</span>}
                </div>
              </div>

              <div className={classes.formRow}>
                <div className={classes.formGroup}>
                  <label className={classes.inputLabel}>Password <span className={classes.requiredMark}>*</span></label>
                  <input 
                    type="password" 
                    className={`${classes.input} ${errors.password ? classes.error : ''}`}
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                  />
                  {errors.password && <span className={classes.errorText}>{errors.password}</span>}
                </div>
                
                <div className={classes.formGroup}>
                  <label className={classes.inputLabel}>Confirm Password <span className={classes.requiredMark}>*</span></label>
                  <input 
                    type="password" 
                    className={`${classes.input} ${errors.confirmPassword ? classes.error : ''}`}
                    value={formData.confirmPassword}
                    onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                  />
                  {errors.confirmPassword && <span className={classes.errorText}>{errors.confirmPassword}</span>}
                </div>
              </div>

              <div className={classes.formRow}>
                <div className={classes.formGroup}>
                  <label className={classes.inputLabel}>Business Category <span className={classes.requiredMark}>*</span></label>
                  <select 
                    className={`${classes.input} ${errors.category ? classes.error : ''}`}
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                  >
                    <option value="">Select a category</option>
                    <option value="Restaurant">Restaurant</option>
                    <option value="Café">Café</option>
                    <option value="Salon">Salon</option>
                    <option value="Clinic">Clinic</option>
                    <option value="Service">Service</option>
                    <option value="Other">Other</option>
                  </select>
                  {errors.category && <span className={classes.errorText}>{errors.category}</span>}
                </div>

                <div className={classes.formGroup}>
                  <label className={classes.inputLabel}>Business Location (City/Area) <span className={classes.requiredMark}>*</span></label>
                  <input 
                    type="text" 
                    className={`${classes.input} ${errors.location ? classes.error : ''}`}
                    value={formData.location}
                    onChange={e => setFormData({...formData, location: e.target.value})}
                  />
                  {errors.location && <span className={classes.errorText}>{errors.location}</span>}
                </div>
              </div>
              
              <button type="submit" className={classes.submitBtn} disabled={loading}>
                {loading ? 'Creating Account...' : 'Create Business Account'}
              </button>
            </form>

            <div className={classes.footer}>
              Already have a business account? 
              <Link to="/login" className={classes.link}>Sign in</Link>
            </div>
          </>
        
      </div>
    </div>
  );
};

export default BusinessRegister;
