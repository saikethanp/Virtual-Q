import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import Queue from './pages/Queue';
import AdminDashboard from './pages/AdminDashboard';
import Cart from './pages/Cart';
import Business from './pages/Business';
import SplashScreen from './components/SplashScreen';

// Placeholder pages
import Discover from './pages/Discover';
import BusinessRegister from './pages/BusinessRegister';
import BusinessDashboard from './pages/BusinessDashboard';
import Login from './pages/Login';
import MyQueue from './pages/MyQueue';

// Placeholder pages
const Register = () => <div>Register</div>;
const Join = () => <div>Join</div>;
const History = () => <div>History</div>;
const Profile = () => <div>Profile</div>;
const Settings = () => <div>Settings</div>;

function App() {
  const [showSplash, setShowSplash] = useState(() => {
    const hasSeenSplash = sessionStorage.getItem('virtual-q-splash-seen');
    return !hasSeenSplash;
  });

  const handleSplashComplete = () => {
    setShowSplash(false);
    sessionStorage.setItem('virtual-q-splash-seen', 'true');
  };

  return (
    <Router>
      <AnimatePresence>
        {showSplash && (
          <SplashScreen key="splash" onComplete={handleSplashComplete} />
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ duration: 0.5, delay: showSplash ? 0.2 : 0 }}
        style={{ width: '100%', height: '100%' }}
      >
        <Routes key="routes">
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="discover" element={<Discover />} />
            <Route path="business/:id" element={<Business />} />
            <Route path="business/register" element={<BusinessRegister />} />
            <Route path="business/dashboard" element={<BusinessDashboard />} />
            <Route path="cart" element={<Cart />} />
            <Route path="join" element={<Join />} />
            <Route path="queue/:id" element={<Queue />} />
            <Route path="my-queue" element={<MyQueue />} />
            <Route path="history" element={<History />} />
            <Route path="profile" element={<Profile />} />
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="admin/queue" element={<AdminDashboard />} />
            <Route path="admin/counters" element={<AdminDashboard />} />
            <Route path="admin/customers" element={<AdminDashboard />} />
            <Route path="admin/analytics" element={<AdminDashboard />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </motion.div>
    </Router>
  );
}

export default App;
