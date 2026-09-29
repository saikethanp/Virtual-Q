import { useState } from 'react';
import { motion } from 'framer-motion';
import classes from './AdminDashboard.module.css';

const mockAdminStats = {
  waiting: 18,
  serving: 4,
  completed: 124,
  averageWait: 16
};

const mockCounters = [
  { id: 'c1', name: 'COUNTER 01', serving: 'Q124', status: 'active' },
  { id: 'c2', name: 'COUNTER 02', serving: 'Q125', status: 'active' },
  { id: 'c3', name: 'COUNTER 03', serving: null, status: 'idle' }
];

const AdminDashboard = () => {
  const [counters, setCounters] = useState<any[]>(mockCounters);

  const handleNext = (counterId: string) => {
    setCounters((prev: any[]) => prev.map((c: any) => {
      if (c.id === counterId) {
        return { ...c, status: 'active', serving: 'A' + Math.floor(Math.random() * 900 + 100) };
      }
      return c;
    }));
  };

  const handlePause = (counterId: string) => {
    setCounters((prev: any[]) => prev.map((c: any) => {
      if (c.id === counterId) {
        return { ...c, status: 'idle', serving: null };
      }
      return c;
    }));
  };

  return (
    <div className={classes.adminPage}>
      <div className={classes.sidebar}>
        <div className={classes.sidebarLogo}>VIRTUAL-Q Ops</div>
        <nav className={classes.sidebarNav}>
          <a href="#" className={classes.navItemActive}>Overview</a>
          <a href="#" className={classes.navItem}>Live Queue</a>
          <a href="#" className={classes.navItem}>Counters</a>
          <a href="#" className={classes.navItem}>Customers</a>
          <a href="#" className={classes.navItem}>Analytics</a>
          <a href="#" className={classes.navItem}>Settings</a>
        </nav>
      </div>
      
      <div className={classes.mainContent}>
        <header className={classes.header}>
          <h1 className={classes.pageTitle}>Virtual-Q Operations</h1>
          <div className={classes.userProfile}>Admin User</div>
        </header>

        <div className={classes.statsGrid}>
          <div className={classes.statCard}>
            <span className={classes.statLabel}>Waiting</span>
            <strong className={classes.statValue}>{mockAdminStats.waiting}</strong>
          </div>
          <div className={classes.statCard}>
            <span className={classes.statLabel}>Serving</span>
            <strong className={classes.statValue}>{mockAdminStats.serving}</strong>
          </div>
          <div className={classes.statCard}>
            <span className={classes.statLabel}>Completed</span>
            <strong className={classes.statValue}>{mockAdminStats.completed}</strong>
          </div>
          <div className={classes.statCard}>
            <span className={classes.statLabel}>Average Wait</span>
            <strong className={classes.statValue}>{mockAdminStats.averageWait} min</strong>
          </div>
        </div>

        <div className={classes.countersSection}>
          <h2 className={classes.sectionTitle}>Live Counters</h2>
          <div className={classes.countersGrid}>
            {counters.map((counter: any) => (
              <motion.div 
                key={counter.id} 
                className={`${classes.counterCard} ${counter.status === 'idle' ? classes.counterIdle : ''}`}
                layout
              >
                <div className={classes.counterHeader}>
                  <h3 className={classes.counterName}>{counter.name}</h3>
                  <span className={`${classes.statusBadge} ${counter.status === 'idle' ? classes.badgeIdle : classes.badgeActive}`}>
                    {counter.status === 'active' ? 'Active' : 'Idle'}
                  </span>
                </div>
                
                <div className={classes.counterBody}>
                  <div className={classes.servingInfo}>
                    <span className={classes.servingLabel}>CURRENTLY SERVING</span>
                    <strong className={classes.servingValue}>{counter.serving || '--'}</strong>
                  </div>
                </div>
                
                <div className={classes.counterActions}>
                  <button className={classes.btnPrimary} onClick={() => handleNext(counter.id)}>NEXT</button>
                  <button className={classes.btnSecondary} onClick={() => handlePause(counter.id)}>PAUSE</button>
                  <button className={classes.btnGhost}>RECALL</button>
                  <button className={classes.btnGhost}>SKIP</button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
