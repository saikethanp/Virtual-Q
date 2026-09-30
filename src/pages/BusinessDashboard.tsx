import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import classes from './BusinessDashboard.module.css';

type QueueItem = {
  dbId: string;
  id: string;
  orderId?: string;
  name: string;
  contact: string;
  order: string;
  ahead: number;
  status: 'Waiting' | 'Serving' | 'Completed';
  waitEst: string;
};

type OrderItem = {
  dbId: string;
  id: string;
  queueId: string;
  name: string;
  contact: string;
  items: string;
  total: number;
  time: string;
  status: string;
};

type MenuItem = {
  dbId: string;
  id: string;
  name: string;
  description: string;
  price: number;
  available: boolean;
};

type ProfileData = {
  ownerName: string;
  businessName: string;
  email: string;
  phone: string;
  category: string;
  location: string;
  address: string;
  imageUrl: string;
};

type BusinessSettings = {
  avgServiceTime: number;
  maxCapacity: number;
  queueStatus: 'Open' | 'Paused';
};

type Tab = 'dashboard' | 'queue' | 'orders' | 'menu' | 'profile';

const BusinessDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  
  // States
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);

  // Sub-states
  const [orderFilter, setOrderFilter] = useState<'All'|'New'|'Preparing'|'Ready'|'Completed'|'Cancelled'>('All');
  const [orderSearch, setOrderSearch] = useState('');
  
  // Menu Modal State
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [menuForm, setMenuForm] = useState<Partial<MenuItem>>({});
  
  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<Partial<ProfileData>>({});
  
  // Image Upload State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isDragActive, setIsDragActive] = useState(false);

  // Delete Account State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const [businessId, setBusinessId] = useState<string>('');
  
  const fetchDashboardData = async (bId: string) => {
    // 1. Fetch Queue
    const { data: qData } = await supabase
      .from('queue_entries')
      .select(`
        id, queue_number, status, estimated_wait, created_at,
        profiles (full_name, phone),
        orders (id, total, order_items (name, quantity))
      `)
      .eq('business_id', bId)
      .neq('status', 'Completed')
      .order('created_at', { ascending: true });

    if (qData) {
      let aheadCount = 0;
      const parsedQ = qData.map(q => {
        const orderSummary = (q.orders as any)?.order_items?.map((i: any) => `${i.name} ×${i.quantity}`).join(', ') || '';
        const status = q.status as 'Waiting' | 'Serving';
        const isWaiting = status === 'Waiting';
        const currentAhead = isWaiting ? aheadCount : 0;
        if (isWaiting) aheadCount++;
        
        return {
          dbId: q.id,
          id: q.queue_number,
          name: (q.profiles as any)?.full_name || 'Guest',
          contact: (q.profiles as any)?.phone || '',
          order: orderSummary,
          orderId: (q.orders as any)?.id,
          ahead: currentAhead,
          waitEst: isWaiting ? `~${currentAhead * 5} min` : 'Now serving',
          status
        };
      });
      setQueue(parsedQ);
    }

    // 2. Fetch Orders
    const { data: oData } = await supabase
      .from('orders')
      .select(`
        id, total, status, created_at,
        profiles (full_name, phone),
        order_items (name, quantity),
        queue_entries (queue_number)
      `)
      .eq('business_id', bId)
      .order('created_at', { ascending: false });

    if (oData) {
      const parsedO = oData.map(o => ({
        dbId: o.id,
        id: o.id.split('-')[0],
        queueId: (o.queue_entries as any)?.[0]?.queue_number || '--',
        name: (o.profiles as any)?.full_name || 'Guest',
        contact: (o.profiles as any)?.phone || '',
        items: (o.order_items as any)?.map((i: any) => `${i.name} ×${i.quantity}`).join(', ') || '',
        total: o.total,
        time: new Date(o.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        status: o.status
      }));
      setOrders(parsedO);
    }

    // 3. Fetch Menu
    const { data: mData } = await supabase
      .from('menu_items')
      .select('*')
      .eq('business_id', bId);

    if (mData) {
      setMenu(mData.map(m => ({
        dbId: m.id,
        id: m.id,
        name: m.name,
        description: m.description || '',
        price: m.price,
        available: m.is_available
      })));
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }
      
      // Fetch profile to get business info
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
        
      const { data: businessData } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', session.user.id)
        .single();

      if (profileData && businessData) {
        setBusinessId(businessData.id);
        const p: ProfileData = {
          ownerName: profileData.full_name || '',
          businessName: businessData.name || '',
          email: session.user.email || '',
          phone: profileData.phone || '',
          category: businessData.category || '',
          location: businessData.location || '',
          address: businessData.address || '',
          imageUrl: businessData.image_url || ''
        };
        setProfile(p);
        setImagePreview(businessData.image_url || null);
        
        setSettings({
          avgServiceTime: businessData.estimated_wait || 5,
          maxCapacity: businessData.max_capacity || 50,
          queueStatus: businessData.queue_status as 'Open' | 'Paused' || 'Open'
        });

        await fetchDashboardData(businessData.id);
      }
    };
    
    checkAuth();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  // QUEUE ACTIONS
  const handleServe = async (queueNumber: string) => {
    // 1. Mark currently serving as complete (if any)
    const currentlyServing = queue.find(q => q.status === 'Serving');
    if (currentlyServing) {
      const { error: serveError } = await supabase.from('queue_entries').update({ status: 'Completed' }).eq('id', currentlyServing.dbId);
      if (!serveError && currentlyServing.orderId) {
        await supabase.from('orders').update({ status: 'completed' }).eq('id', currentlyServing.orderId);
      }
    }
    
    // 2. Mark target as serving
    const target = queue.find(q => q.id === queueNumber);
    if (target) {
      const { error } = await supabase.from('queue_entries').update({ status: 'Serving' }).eq('id', target.dbId);
      if (error) {
        console.error("Failed to update queue entry:", error);
        return;
      }
    }
    
    // 3. Immediately update local state
    let aheadCount = 0;
    const updatedQueue = queue.map(q => {
      if (currentlyServing && q.id === currentlyServing.id) {
        return { ...q, status: 'Completed' as const };
      }
      if (q.id === queueNumber) {
        return { ...q, status: 'Serving' as const };
      }
      return q;
    }).filter(q => q.status !== 'Completed').map(q => {
      const isWaiting = q.status === 'Waiting';
      const currentAhead = isWaiting ? aheadCount : 0;
      if (isWaiting) aheadCount++;
      return {
        ...q,
        ahead: currentAhead,
        waitEst: isWaiting ? `~${currentAhead * 5} min` : (q.status === 'Serving' ? 'Now serving' : q.waitEst)
      };
    });
    setQueue(updatedQueue);
    
    fetchDashboardData(businessId);
  };

  const handleComplete = async (queueNumber: string) => {
    const target = queue.find(q => q.id === queueNumber);
    if (target) {
      const { error } = await supabase.from('queue_entries').update({ status: 'Completed' }).eq('id', target.dbId);
      if (error) {
        console.error("Failed to complete queue entry:", error);
        return;
      }
      
      if (target.orderId) {
        await supabase.from('orders').update({ status: 'completed' }).eq('id', target.orderId);
      }
      
      let aheadCount = 0;
      const updatedQueue = queue.map(q => {
        if (q.id === queueNumber) {
          return { ...q, status: 'Completed' as const };
        }
        return q;
      }).filter(q => q.status !== 'Completed').map(q => {
        const isWaiting = q.status === 'Waiting';
        const currentAhead = isWaiting ? aheadCount : 0;
        if (isWaiting) aheadCount++;
        return {
          ...q,
          ahead: currentAhead,
          waitEst: isWaiting ? `~${currentAhead * 5} min` : (q.status === 'Serving' ? 'Now serving' : q.waitEst)
        };
      });
      setQueue(updatedQueue);
      
      fetchDashboardData(businessId);
    }
  };

  const handleSkip = async (queueNumber: string) => {
    const target = queue.find(q => q.id === queueNumber);
    if (target) {
      // Mark as completed or skipped
      const { error } = await supabase.from('queue_entries').update({ status: 'Completed' }).eq('id', target.dbId);
      if (error) {
        console.error("Failed to skip queue entry:", error);
        return;
      }
      
      let aheadCount = 0;
      const updatedQueue = queue.map(q => {
        if (q.id === queueNumber) {
          return { ...q, status: 'Completed' as const };
        }
        return q;
      }).filter(q => q.status !== 'Completed').map(q => {
        const isWaiting = q.status === 'Waiting';
        const currentAhead = isWaiting ? aheadCount : 0;
        if (isWaiting) aheadCount++;
        return {
          ...q,
          ahead: currentAhead,
          waitEst: isWaiting ? `~${currentAhead * 5} min` : (q.status === 'Serving' ? 'Now serving' : q.waitEst)
        };
      });
      setQueue(updatedQueue);
      
      fetchDashboardData(businessId);
    }
  };

  const handleCallNext = () => {
    const nextWaiting = queue.find(q => q.status === 'Waiting');
    if (nextWaiting) {
      handleServe(nextWaiting.id);
    }
  };

  const toggleQueuePause = async () => {
    if (!settings || !businessId) return;
    const newStatus = settings.queueStatus === 'Open' ? 'Paused' : 'Open';
    await supabase.from('businesses').update({ queue_status: newStatus }).eq('id', businessId);
    setSettings({ ...settings, queueStatus: newStatus });
  };

  // MENU ACTIONS
  const handleOpenMenuModal = (item?: MenuItem) => {
    if (item) {
      setEditingMenuItem(item);
      setMenuForm(item);
    } else {
      setEditingMenuItem(null);
      setMenuForm({ name: '', description: '', price: 0, available: true });
    }
    setIsMenuModalOpen(true);
  };

  const handleSaveMenu = async () => {
    if (!menuForm.name || !businessId) return;
    
    if (editingMenuItem && (editingMenuItem as any).dbId) {
      await supabase.from('menu_items').update({
        name: menuForm.name,
        description: menuForm.description,
        price: menuForm.price,
        is_available: menuForm.available
      }).eq('id', (editingMenuItem as any).dbId);
    } else {
      await supabase.from('menu_items').insert({
        business_id: businessId,
        name: menuForm.name,
        description: menuForm.description,
        price: menuForm.price,
        is_available: menuForm.available ?? true
      });
    }
    fetchDashboardData(businessId);
    setIsMenuModalOpen(false);
  };

  const handleDeleteMenu = async (id: string) => {
    await supabase.from('menu_items').delete().eq('id', id);
    fetchDashboardData(businessId);
  };

  const handleToggleAvailability = async (id: string) => {
    const target = menu.find(m => m.id === id);
    if (target) {
      await supabase.from('menu_items').update({ is_available: !target.available }).eq('id', (target as any).dbId);
      fetchDashboardData(businessId);
    }
  };

  // PROFILE ACTIONS
  const handleSaveProfile = async () => {
    if (!profile || !businessId) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    // Update profiles
    await supabase.from('profiles').update({
      full_name: profileForm.ownerName || profile.ownerName,
      phone: profileForm.phone || profile.phone
    }).eq('user_id', session.user.id);

    // Update businesses
    await supabase.from('businesses').update({
      name: profileForm.businessName || profile.businessName,
      category: profileForm.category || profile.category,
      location: profileForm.location || profile.location,
      address: profileForm.address || profile.address
    }).eq('id', businessId);
    
    setProfile({ ...profile, ...profileForm });
    setIsEditingProfile(false);
  };

  const handleFileSelection = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
      alert('Only JPG, PNG and WEBP images are allowed');
      return;
    }

    setImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    setImagePreview(objectUrl);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelection(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleImageUpload = async () => {
    if (!imageFile || !businessId) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setIsUploading(true);
    setUploadStatus('Uploading image...');

    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `business-image-${Date.now()}.${fileExt}`;
      const filePath = `${session.user.id}/${businessId}/${fileName}`;

      // Upload the file to supabase storage
      const { error: uploadError } = await supabase.storage
        .from('business-images')
        .upload(filePath, imageFile, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public url
      const { data: publicUrlData } = supabase.storage
        .from('business-images')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      // Update business profile
      setUploadStatus('Updating business profile...');
      const { error: updateError } = await supabase
        .from('businesses')
        .update({ image_url: publicUrl })
        .eq('id', businessId);

      if (updateError) throw updateError;

      // Delete old image if safe
      if (profile?.imageUrl && profile.imageUrl !== publicUrl) {
        // extract the path from old URL
        try {
           const urlParts = profile.imageUrl.split('/business-images/');
           if (urlParts.length > 1) {
             const oldPath = urlParts[1];
             await supabase.storage.from('business-images').remove([oldPath]);
           }
        } catch (e) {
          console.error("Error removing old image", e);
        }
      }

      setProfile(prev => prev ? { ...prev, imageUrl: publicUrl } : null);
      setUploadStatus('Image uploaded successfully!');
      setImageFile(null); // Clear selected file
      setTimeout(() => setUploadStatus(''), 3000);
      
    } catch (error: any) {
      console.error('Error uploading image:', error);
      setUploadStatus(`Failed: ${error.message || 'Unknown error'}`);
      setTimeout(() => setUploadStatus(''), 5000);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!businessId || !profile?.imageUrl) return;
    
    setIsUploading(true);
    setUploadStatus('Removing image...');
    
    try {
      const urlParts = profile.imageUrl.split('/business-images/');
      if (urlParts.length > 1) {
         const oldPath = urlParts[1];
         await supabase.storage.from('business-images').remove([oldPath]);
      }
      
      await supabase.from('businesses').update({ image_url: null }).eq('id', businessId);
      setProfile(prev => prev ? { ...prev, imageUrl: '' } : null);
      setImagePreview(null);
      setImageFile(null);
      setUploadStatus('Image removed successfully.');
      setTimeout(() => setUploadStatus(''), 3000);
    } catch (error: any) {
      console.error('Error removing image:', error);
      setUploadStatus('Failed to remove image.');
      setTimeout(() => setUploadStatus(''), 3000);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== 'DELETE') return;
    
    setIsDeletingAccount(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session found");

      const { error } = await supabase.functions.invoke('delete-account', {
        body: { businessId }
      });

      if (error) {
        throw new Error(error.message || 'Failed to delete account');
      }

      await supabase.auth.signOut();
      navigate('/');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      alert(error.message || 'Error deleting account');
      setIsDeletingAccount(false);
    }
  };

  const handleSettingsUpdate = async (field: keyof BusinessSettings, value: number) => {
    if (!settings || !businessId) return;
    const newSettings = { ...settings, [field]: value };
    setSettings(newSettings);
    
    await supabase.from('businesses').update({
      estimated_wait: newSettings.avgServiceTime,
      max_capacity: newSettings.maxCapacity
    }).eq('id', businessId);
  };

  if (!profile || !settings) return null;

  const activeQueue = queue.filter(q => q.status !== 'Completed');
  const waitingCount = activeQueue.filter(q => q.status === 'Waiting').length;
  const servingItem = activeQueue.find(q => q.status === 'Serving');
  const todaysOrdersCount = orders.length + activeQueue.length + 10;

  const filteredOrders = orders.filter(o => {
    const matchesTab = orderFilter === 'All' || o.status === orderFilter;
    const matchesSearch = o.id.toLowerCase().includes(orderSearch.toLowerCase()) || 
                          o.name.toLowerCase().includes(orderSearch.toLowerCase()) || 
                          o.queueId.toLowerCase().includes(orderSearch.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className={classes.page}>
      <header className={classes.header}>
        <Link to="/" className={classes.logo}><img src="/logo.png" alt="Virtual-Q Logo" className={classes.logoImage} /></Link>
        <div className={classes.headerRight}>
          <span className={classes.businessName}>{profile.businessName}</span>
          <div className={classes.avatar}>{profile.ownerName.charAt(0).toUpperCase()}</div>
          <button onClick={handleSignOut} className={classes.signOutBtn}>Sign out</button>
        </div>
      </header>

      <div className={classes.layout}>
        <aside className={classes.sidebar}>
          {(['dashboard', 'queue', 'orders', 'menu', 'profile'] as Tab[]).map(t => (
            <button 
              key={t}
              className={`${classes.navItem} ${activeTab === t ? classes.active : ''}`}
              onClick={() => setActiveTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </aside>

        <main className={classes.content}>
          {/* DASHBOARD VIEW */}
          {activeTab === 'dashboard' && (
            <>
              <div className={classes.pageHeader}>
                <h1 className={classes.title}>Good morning, {profile.ownerName.split(' ')[0]}</h1>
                <p className={classes.subtitle}>Here's what's happening with your business today.</p>
              </div>

              <div className={classes.summaryCards}>
                <div className={classes.card}>
                  <div className={classes.cardLabel}>Current Queue</div>
                  <div className={classes.cardValue}>{waitingCount} people waiting</div>
                </div>
                <div className={classes.card}>
                  <div className={classes.cardLabel}>Now Serving</div>
                  <div className={`${classes.cardValue} ${classes.highlight}`}>
                    {servingItem ? servingItem.id : '--'}
                  </div>
                </div>
                <div className={classes.card}>
                  <div className={classes.cardLabel}>Estimated Wait</div>
                  <div className={classes.cardValue}>~{waitingCount * settings.avgServiceTime} min</div>
                </div>
                <div className={classes.card}>
                  <div className={classes.cardLabel}>Today's Orders</div>
                  <div className={classes.cardValue}>{todaysOrdersCount}</div>
                </div>
              </div>

              <div className={classes.sectionTitle}>Queue Overview</div>
              <div className={classes.tableContainer}>
                <table className={classes.table}>
                  <thead>
                    <tr>
                      <th>Queue</th>
                      <th>Customer</th>
                      <th>Order</th>
                      <th>People Ahead</th>
                      <th>Wait</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeQueue.map(item => (
                      <tr key={item.id}>
                        <td><strong>{item.id}</strong></td>
                        <td>{item.name}</td>
                        <td>{item.order}</td>
                        <td>{item.ahead > 0 ? item.ahead : 'â€”'}</td>
                        <td>{item.waitEst}</td>
                        <td>
                          <span className={`${classes.statusBadge} ${item.status === 'Waiting' ? classes.waiting : classes.serving}`}>
                            {item.status}
                          </span>
                        </td>
                        <td>
                          <div className={classes.actions}>
                            {item.status === 'Waiting' && (
                              <button className={`${classes.actionBtn} ${classes.serveBtn}`} onClick={() => handleServe(item.id)}>Serve</button>
                            )}
                            {item.status === 'Serving' && (
                              <button className={`${classes.actionBtn} ${classes.completeBtn}`} onClick={() => handleComplete(item.id)}>Complete</button>
                            )}
                            <button className={`${classes.actionBtn} ${classes.skipBtn}`} onClick={() => handleSkip(item.id)}>Skip</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {activeQueue.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>No active queue.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className={classes.sectionTitle}>
                Recent Orders
                <button className={classes.secondaryBtn} onClick={() => setActiveTab('orders')} style={{ padding: '6px 12px', fontSize: '0.75rem' }}>View all orders</button>
              </div>
              <div className={classes.tableContainer}>
                <table className={classes.table}>
                  <thead>
                    <tr>
                      <th>Queue</th>
                      <th>Customer</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 5).map(item => (
                      <tr key={item.id}>
                        <td><strong>{item.queueId}</strong></td>
                        <td>{item.name}</td>
                        <td>{item.items}</td>
                        <td>â‚¹{item.total}</td>
                        <td>
                          <span className={`${classes.statusBadge} ${classes.waiting}`}>{item.status}</span>
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>No recent orders.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* QUEUE VIEW */}
          {activeTab === 'queue' && (
            <>
              <div className={classes.pageHeader}>
                <h1 className={classes.title}>Queue Management</h1>
                <p className={classes.subtitle}>Manage customers currently waiting in your queue.</p>
              </div>

              <div className={classes.topActions}>
                <button className={classes.primaryBtn} onClick={handleCallNext}>Call Next Customer</button>
                <button className={classes.secondaryBtn} onClick={toggleQueuePause}>
                  {settings.queueStatus === 'Open' ? 'Pause Queue' : 'Open Queue'}
                </button>
              </div>
              
              <div style={{ marginBottom: '24px' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, marginRight: '12px' }}>Queue Status:</span>
                <span className={`${classes.statusBadge} ${settings.queueStatus === 'Open' ? classes.serving : classes.paused}`}>
                  {settings.queueStatus.toUpperCase()}
                </span>
              </div>

              <div className={classes.tableContainer}>
                <table className={classes.table}>
                  <thead>
                    <tr>
                      <th>Queue Number</th>
                      <th>Customer</th>
                      <th>Contact</th>
                      <th>Order</th>
                      <th>People Ahead</th>
                      <th>Estimated Wait</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeQueue.map(item => (
                      <tr key={item.id}>
                        <td><strong>{item.id}</strong></td>
                        <td>{item.name}</td>
                        <td>{item.contact}</td>
                        <td>{item.order}</td>
                        <td>{item.ahead > 0 ? item.ahead : 'â€”'}</td>
                        <td>{item.waitEst}</td>
                        <td>
                          <span className={`${classes.statusBadge} ${item.status === 'Waiting' ? classes.waiting : classes.serving}`}>
                            {item.status}
                          </span>
                        </td>
                        <td>
                          <div className={classes.actions}>
                            {item.status === 'Waiting' && (
                              <button className={`${classes.actionBtn} ${classes.serveBtn}`} onClick={() => handleServe(item.id)}>Serve</button>
                            )}
                            {item.status === 'Serving' && (
                              <button className={`${classes.actionBtn} ${classes.completeBtn}`} onClick={() => handleComplete(item.id)}>Complete</button>
                            )}
                            <button className={`${classes.actionBtn} ${classes.skipBtn}`} onClick={() => handleSkip(item.id)}>Skip</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {activeQueue.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>Queue is empty.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ORDERS VIEW */}
          {activeTab === 'orders' && (
            <>
              <div className={classes.pageHeader}>
                <h1 className={classes.title}>Orders</h1>
                <p className={classes.subtitle}>View and manage customer orders.</p>
              </div>

              <div className={classes.tabs}>
                {(['All', 'New', 'Preparing', 'Ready', 'Completed', 'Cancelled'] as const).map(f => (
                  <button 
                    key={f}
                    className={`${classes.tab} ${orderFilter === f ? classes.active : ''}`}
                    onClick={() => setOrderFilter(f)}
                  >{f}</button>
                ))}
              </div>

              <input 
                type="text" 
                placeholder="Search orders..." 
                className={classes.searchBar}
                value={orderSearch}
                onChange={e => setOrderSearch(e.target.value)}
              />

              <div className={classes.tableContainer}>
                <table className={classes.table}>
                  <thead>
                    <tr>
                      <th>Queue</th>
                      <th>Customer</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Time</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map(item => (
                      <tr key={item.id}>
                        <td><strong>{item.queueId}</strong></td>
                        <td>{item.name}</td>
                        <td>{item.items}</td>
                        <td>â‚¹{item.total}</td>
                        <td>{item.time}</td>
                        <td>
                          <span className={`${classes.statusBadge} ${classes.waiting}`}>{item.status}</span>
                        </td>
                        <td>
                          <button className={`${classes.actionBtn} ${classes.skipBtn}`} onClick={async () => {
                            await supabase.from('orders').update({ status: 'completed' }).eq('id', item.dbId);
                            fetchDashboardData(businessId);
                          }}>Complete</button>
                        </td>
                      </tr>
                    ))}
                    {filteredOrders.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>No orders found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* MENU VIEW */}
          {activeTab === 'menu' && (
            <>
              <div className={classes.pageHeader}>
                <h1 className={classes.title}>Menu</h1>
                <p className={classes.subtitle}>Manage the items customers can order.</p>
              </div>

              <div className={classes.topActions}>
                <button className={classes.primaryBtn} onClick={() => handleOpenMenuModal()}>+ Add Menu Item</button>
              </div>

              <div className={classes.tableContainer}>
                <table className={classes.table}>
                  <thead>
                    <tr>
                      <th>Item Name</th>
                      <th>Description</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menu.map(item => (
                      <tr key={item.id}>
                        <td><strong>{item.name}</strong></td>
                        <td>{item.description}</td>
                        <td>â‚¹{item.price}</td>
                        <td>
                          <span className={`${classes.statusBadge} ${item.available ? classes.serving : classes.waiting}`}>
                            {item.available ? 'Available' : 'Unavailable'}
                          </span>
                        </td>
                        <td>
                          <div className={classes.actions}>
                            <button className={`${classes.actionBtn} ${classes.skipBtn}`} onClick={() => handleToggleAvailability(item.id)}>
                              {item.available ? 'Disable' : 'Enable'}
                            </button>
                            <button className={`${classes.actionBtn} ${classes.skipBtn}`} onClick={() => handleOpenMenuModal(item)}>Edit</button>
                            <button className={`${classes.actionBtn} ${classes.skipBtn}`} style={{ color: '#ef4444' }} onClick={() => handleDeleteMenu(item.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {menu.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>Menu is empty.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* PROFILE VIEW */}
          {activeTab === 'profile' && (
            <>
              <div className={classes.pageHeader}>
                <h1 className={classes.title}>Business Profile</h1>
                <p className={classes.subtitle}>Manage your business information.</p>
              </div>

              <div className={classes.topActions}>
                {!isEditingProfile ? (
                  <button className={classes.secondaryBtn} onClick={() => {
                    setProfileForm(profile);
                    setIsEditingProfile(true);
                  }}>Edit Profile</button>
                ) : (
                  <>
                    <button className={classes.primaryBtn} onClick={handleSaveProfile}>Save Changes</button>
                    <button className={classes.secondaryBtn} onClick={() => setIsEditingProfile(false)}>Cancel</button>
                  </>
                )}
              </div>

              <div className={classes.profileGrid}>
                <div className={classes.profileSection}>
                  <div className={classes.profileSectionTitle}>BUSINESS INFORMATION</div>
                  
                  <div className={classes.formGroup}>
                    <label className={classes.formLabel}>Business Image</label>
                    <div className={classes.imageUploadContainer}>
                      {imagePreview ? (
                        <>
                          <div className={classes.imagePreview} style={{ backgroundImage: `url(${imagePreview})` }}></div>
                          <div className={classes.imageUploadActions}>
                            {imageFile && (
                              <button className={classes.primaryBtn} onClick={handleImageUpload} disabled={isUploading}>
                                {isUploading ? 'Uploading...' : 'Save Image'}
                              </button>
                            )}
                            <label className={classes.secondaryBtn} style={{ cursor: isUploading ? 'not-allowed' : 'pointer' }}>
                              Replace Image
                              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} className={classes.imageUploadInput} disabled={isUploading} />
                            </label>
                            {profile?.imageUrl && !imageFile && (
                              <button className={classes.secondaryBtn} onClick={handleRemoveImage} disabled={isUploading} style={{ color: '#ef4444' }}>
                                Remove Image
                              </button>
                            )}
                          </div>
                        </>
                      ) : (
                        <div 
                          className={`${classes.dropZone} ${isDragActive ? classes.dragActive : ''}`}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onClick={() => document.getElementById('hiddenFileInput')?.click()}
                        >
                          <input 
                            id="hiddenFileInput"
                            type="file" 
                            accept="image/jpeg,image/png,image/webp" 
                            onChange={handleImageChange} 
                            className={classes.imageUploadInput} 
                            disabled={isUploading} 
                          />
                          <div className={classes.dropZoneIcon}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                              <circle cx="8.5" cy="8.5" r="1.5"></circle>
                              <polyline points="21 15 16 10 5 21"></polyline>
                            </svg>
                          </div>
                          <div className={classes.dropZoneText}>Drag & drop your image here</div>
                          <div className={classes.dropZoneSubtext}>or Browse image (JPG, PNG, WEBP - max 5MB)</div>
                        </div>
                      )}
                      {uploadStatus && <div className={classes.uploadStatus}>{uploadStatus}</div>}
                    </div>
                  </div>
                  
                  <div className={classes.formGroup}>
                    <label className={classes.formLabel}>Business Name</label>
                    <input 
                      type="text" 
                      className={classes.formInput} 
                      value={isEditingProfile ? profileForm.businessName : profile.businessName} 
                      onChange={e => setProfileForm({...profileForm, businessName: e.target.value})}
                      readOnly={!isEditingProfile} 
                    />
                  </div>
                  
                  <div className={classes.formGroup}>
                    <label className={classes.formLabel}>Business Category</label>
                    <input 
                      type="text" 
                      className={classes.formInput} 
                      value={isEditingProfile ? profileForm.category : profile.category} 
                      onChange={e => setProfileForm({...profileForm, category: e.target.value})}
                      readOnly={!isEditingProfile} 
                    />
                  </div>

                  <div className={classes.formGroup}>
                    <label className={classes.formLabel}>Business Location</label>
                    <input 
                      type="text" 
                      className={classes.formInput} 
                      value={isEditingProfile ? profileForm.location : profile.location} 
                      onChange={e => setProfileForm({...profileForm, location: e.target.value})}
                      readOnly={!isEditingProfile} 
                    />
                  </div>

                  <div className={classes.formGroup}>
                    <label className={classes.formLabel}>Business Address</label>
                    <input 
                      type="text" 
                      className={classes.formInput} 
                      value={isEditingProfile ? profileForm.address : profile.address} 
                      onChange={e => setProfileForm({...profileForm, address: e.target.value})}
                      readOnly={!isEditingProfile} 
                    />
                  </div>
                </div>

                <div className={classes.profileSection}>
                  <div className={classes.profileSectionTitle}>CONTACT INFORMATION</div>
                  
                  <div className={classes.formGroup}>
                    <label className={classes.formLabel}>Owner Name</label>
                    <input 
                      type="text" 
                      className={classes.formInput} 
                      value={isEditingProfile ? profileForm.ownerName : profile.ownerName} 
                      onChange={e => setProfileForm({...profileForm, ownerName: e.target.value})}
                      readOnly={!isEditingProfile} 
                    />
                  </div>
                  
                  <div className={classes.formGroup}>
                    <label className={classes.formLabel}>Business Email</label>
                    <input 
                      type="email" 
                      className={classes.formInput} 
                      value={isEditingProfile ? profileForm.email : profile.email} 
                      onChange={e => setProfileForm({...profileForm, email: e.target.value})}
                      readOnly={!isEditingProfile} 
                    />
                  </div>

                  <div className={classes.formGroup}>
                    <label className={classes.formLabel}>Phone Number</label>
                    <input 
                      type="tel" 
                      className={classes.formInput} 
                      value={isEditingProfile ? profileForm.phone : profile.phone} 
                      onChange={e => setProfileForm({...profileForm, phone: e.target.value})}
                      readOnly={!isEditingProfile} 
                    />
                  </div>
                </div>

                <div className={classes.profileSection}>
                  <div className={classes.profileSectionTitle}>QUEUE SETTINGS</div>
                  
                  <div className={classes.formGroup}>
                    <label className={classes.formLabel}>Average Service Time (mins)</label>
                    <input 
                      type="number" 
                      className={classes.formInput} 
                      value={settings.avgServiceTime} 
                      onChange={e => handleSettingsUpdate('avgServiceTime', parseInt(e.target.value) || 5)}
                    />
                  </div>
                  
                  <div className={classes.formGroup}>
                    <label className={classes.formLabel}>Maximum Queue Capacity</label>
                    <input 
                      type="number" 
                      className={classes.formInput} 
                      value={settings.maxCapacity} 
                      onChange={e => handleSettingsUpdate('maxCapacity', parseInt(e.target.value) || 50)}
                    />
                  </div>
                </div>
              </div>
              
              {/* DANGER SECTION */}
              <div className={classes.dangerSection}>
                <div className={classes.dangerTitle}>Delete Account</div>
                <div className={classes.dangerText}>
                  Deleting your account permanently removes your business account and all associated data, including menu items, queues, and orders. This action cannot be undone.
                </div>
                <button 
                  className={classes.dangerBtn}
                  onClick={() => setShowDeleteModal(true)}
                >
                  Delete Account
                </button>
              </div>
            </>
          )}

        </main>
      </div>

      {/* MODALS */}
      {isMenuModalOpen && (
        <div className={classes.modalOverlay}>
          <div className={classes.modal}>
            <h2 className={classes.modalTitle}>{editingMenuItem ? 'Edit Menu Item' : 'Add Menu Item'}</h2>
            <div className={classes.formGroup}>
              <label className={classes.formLabel}>Item Name</label>
              <input 
                type="text" 
                className={classes.formInput} 
                value={menuForm.name || ''} 
                onChange={e => setMenuForm({...menuForm, name: e.target.value})} 
              />
            </div>
            <div className={classes.formGroup}>
              <label className={classes.formLabel}>Description</label>
              <input 
                type="text" 
                className={classes.formInput} 
                value={menuForm.description || ''} 
                onChange={e => setMenuForm({...menuForm, description: e.target.value})} 
              />
            </div>
            <div className={classes.formGroup}>
              <label className={classes.formLabel}>Price (â‚¹)</label>
              <input 
                type="number" 
                className={classes.formInput} 
                value={menuForm.price || 0} 
                onChange={e => setMenuForm({...menuForm, price: parseInt(e.target.value) || 0})} 
              />
            </div>
            <div className={classes.modalActions}>
              <button className={classes.secondaryBtn} onClick={() => setIsMenuModalOpen(false)}>Cancel</button>
              <button className={classes.primaryBtn} onClick={handleSaveMenu}>Save Item</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className={classes.modalOverlay}>
          <div className={classes.modal}>
            <div className={classes.modalTitle} style={{ color: '#dc2626' }}>Delete Account</div>
            
            <div className={classes.formGroup}>
              <label className={classes.formLabel}>
                Deleting your account permanently removes your business account and associated data. This action cannot be undone.<br/><br/>
                Please type <strong>DELETE</strong> to confirm.
              </label>
              <input 
                type="text" 
                className={classes.formInput} 
                value={deleteInput}
                onChange={e => setDeleteInput(e.target.value)}
                placeholder="DELETE"
              />
            </div>
            
            <div className={classes.modalActions}>
              <button 
                className={classes.secondaryBtn} 
                onClick={() => { setShowDeleteModal(false); setDeleteInput(''); }}
                disabled={isDeletingAccount}
              >
                Cancel
              </button>
              <button 
                className={classes.dangerBtn} 
                onClick={handleDeleteAccount}
                disabled={deleteInput !== 'DELETE' || isDeletingAccount}
              >
                {isDeletingAccount ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessDashboard;
