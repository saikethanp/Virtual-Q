import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import classes from './SearchExperience.module.css';

const SearchExperience = () => {
  const [query, setQuery] = useState('');
  const [menuItems, setMenuItems] = useState<any[]>([]);

  useEffect(() => {
    const fetchMenu = async () => {
      const { data } = await supabase.from('menu_items').select('*').limit(20);
      if (data) setMenuItems(data);
    };
    fetchMenu();
  }, []);
  
  const filteredItems = query.length > 0 
    ? menuItems.filter(item => 
        item.name.toLowerCase().includes(query.toLowerCase()) || 
        (item.description && item.description.toLowerCase().includes(query.toLowerCase()))
      ).slice(0, 4)
    : [];

  return (
    <section className={classes.searchSection}>
      <div className={`container ${classes.container}`}>
        <div className={classes.header}>
          <h2 className={classes.headline}>JUST TYPE WHAT YOU WANT.</h2>
          <p className={classes.desc}>
            No endless scrolling. Search the menu naturally and find exactly what you're looking for.
          </p>
        </div>
        
        <div className={classes.searchWrapper}>
          <div className={classes.searchInputContainer}>
            <Search className={classes.searchIcon} size={24} />
            <input 
              type="text" 
              className={classes.searchInput}
              placeholder="Search a dish, drink or item..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          
          <div className={classes.suggestionsArea}>
            <AnimatePresence>
              {query && filteredItems.length > 0 && (
                <motion.div 
                  className={classes.suggestionsList}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {filteredItems.map(item => (
                    <div key={item.id} className={classes.suggestionItem}>
                      <div className={classes.itemImageHolder}></div>
                      <div className={classes.itemDetails}>
                        <h4 className={classes.itemName}>{item.name}</h4>
                        <p className={classes.itemDesc}>{item.description}</p>
                      </div>
                      <div className={classes.itemPrice}>₹{item.price}</div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            
            {query && filteredItems.length === 0 && (
              <div className={classes.noResults}>
                No items found for "{query}"
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SearchExperience;
