import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import classes from './Discover.module.css';

const CATEGORIES = ['All', 'Restaurants', 'Cafés', 'Salons', 'Clinics', 'Services', 'Other'];

const Discover = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const [businesses, setBusinesses] = useState<any[]>([]);

  useEffect(() => {
    const fetchBusinesses = async () => {
      const { data, error } = await supabase.from('businesses').select(`
        *,
        queue_entries (status)
      `);
      
      if (!error && data) {
        setBusinesses(data.map(b => ({
          ...b,
          waitingCount: b.queue_entries ? b.queue_entries.filter((q: any) => q.status === 'Waiting').length : 0
        })));
      }
    };
    fetchBusinesses();
  }, []);

  const filteredBusinesses = useMemo(() => {
    return businesses.filter((business) => {
      const matchesSearch = business.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            business.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'All' || business.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory, businesses]);

  return (
    <div className={classes.page}>
      <div className="container">
        <header className={classes.header}>
          <button onClick={() => navigate(-1)} className={classes.backBtn}>
            ← Back
          </button>
          <motion.div 
            className={classes.searchContainer}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Search className={classes.searchIcon} size={20} />
            <input 
              type="text" 
              className={classes.searchInput} 
              placeholder="Search businesses or services..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </motion.div>

          <div className={classes.headerInner}>
            <motion.div 
              className={classes.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              DISCOVER
            </motion.div>
            <motion.h1 
              className={classes.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Find a business.
            </motion.h1>
          </div>
        </header>

        <section className={classes.content}>
          <div className={classes.contentHeader}>
            <h2 className={classes.contentTitle}>Businesses near you</h2>
          </div>
          
          <div className={classes.categoryFilter}>
            {CATEGORIES.map(category => (
              <button
                key={category}
                className={`${classes.categoryBtn} ${activeCategory === category ? classes.active : ''}`}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          {filteredBusinesses.length > 0 ? (
            <div className={classes.businessGrid}>
              {filteredBusinesses.map((business, index) => (
                <motion.div 
                  key={business.id}
                  className={classes.card}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                >
                  {business.image_url ? (
                    <img src={business.image_url} alt={business.name} className={classes.cardImage} />
                  ) : (
                    <div className={classes.imageFallback}>{business.name.substring(0, 1).toUpperCase()}</div>
                  )}
                  <div className={classes.cardContent}>
                    <span className={classes.cardCategory}>{business.category}</span>
                    <h3 className={classes.cardTitle}>{business.name}</h3>
                    <p className={classes.cardDescription}>{business.description}</p>
                    <div className={classes.cardLocation}>
                      <MapPin size={14} /> {business.location}
                    </div>
                    
                    <div className={classes.cardFooter}>
                      <div className={classes.queueInfo}>
                        <div className={classes.queueStatus}>
                          <span className={`${classes.statusIndicator} ${
                            business.queue_status === 'Open' ? classes.moving : classes.busy
                          }`}></span>
                          {business.queue_status}
                        </div>
                        <div className={classes.queueMetrics}>
                          <span>{business.estimated_wait} min estimated wait</span>
                          <span>{business.waitingCount} people waiting</span>
                        </div>
                      </div>
                      
                      <Link to={`/business/${business.slug}`} className={classes.viewBtn}>
                        View business <ArrowRight size={16} />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className={classes.emptyState}>
              <p>No businesses found matching your criteria.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Discover;
