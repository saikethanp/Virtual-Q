import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import QueueTimeline from '../components/QueueTimeline';
import classes from './Home.module.css';

const Home = () => {
  return (
    <div className={classes.home}>
      {/* HERO SECTION */}
      <section className={classes.hero}>
        <div className={`container ${classes.heroContainer}`}>
          <div className={classes.heroContent}>
            <motion.div 
              className={classes.eyebrow}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              THE DIGITAL QUEUE
            </motion.div>
            
            <motion.h1 
              className={classes.headline}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              YOUR ORDER.<br />
              YOUR PLACE.<br />
              <span className={classes.textSoft}>YOUR TIME.</span>
            </motion.h1>
            
            <motion.p 
              className={classes.subheadline}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Discover local businesses, order what you want, and join the virtual queue before you arrive.
            </motion.p>
            
            <motion.div 
              className={classes.ctaGroup}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Link to="/discover" className={classes.primaryBtn}>
                Find a business <ArrowRight size={16} />
              </Link>
              <Link to="/business/register" className={classes.secondaryBtn}>
                For business owners →
              </Link>
            </motion.div>
          </div>
          
          <motion.div 
            className={classes.heroVisual}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4, type: 'spring' }}
          >
            <div className={classes.visualWrapper}>
              {/* Abstract 3D device mockup */}
              <div className={classes.deviceMockup}>
                <div className={classes.deviceScreen}>
                  <div className={classes.deviceHeader}>
                    <div className={classes.nowServing}>
                      <span>BURGER HOUSE</span>
                      <strong>3 orders ahead</strong>
                    </div>
                  </div>
                  
                  <div className={classes.deviceBody}>
                    <div className={classes.userStatus}>
                      <div className={classes.statusLabel}>YOUR ORDER</div>
                      <div className={classes.statusToken}>Q127</div>
                    </div>
                    
                    <div className={classes.deviceMetrics}>
                      <div className={classes.metric}>
                        <span>POSITION</span>
                        <strong>04</strong>
                      </div>
                      <div className={classes.metric}>
                        <span>ESTIMATED WAIT</span>
                        <strong>~12 MIN</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Tokens floating around */}
              <div className={classes.floatingTokens}>
                <QueueTimeline tokens={[
                  { id: 'Q124', status: 'serving' },
                  { id: 'Q125', status: 'waiting' },
                  { id: 'Q126', status: 'waiting' },
                  { id: 'Q127', status: 'waiting', isUser: true },
                  { id: 'Q128', status: 'waiting' },
                ]} />
              </div>
            </div>
          </motion.div>
        </div>
      </section>




    </div>
  );
};

export default Home;
