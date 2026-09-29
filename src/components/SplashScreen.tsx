import { motion } from 'framer-motion';
import { useEffect } from 'react';
import classes from './SplashScreen.module.css';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  useEffect(() => {
    // Sequence timing
    const holdTimer = setTimeout(() => {
      onComplete();
    }, 1200);

    return () => {
      clearTimeout(holdTimer);
    };
  }, [onComplete]);

  return (
    <motion.div 
      className={classes.splashContainer}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className={classes.logoWrapper}>
        <motion.img 
          layoutId="logo-img"
          src="/logo.png" 
          alt="Virtual-Q Logo" 
          className={classes.logoImage} 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
        <motion.span 
          layoutId="logo-text"
          className={classes.logoText}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
        >
          Virtual-Q
        </motion.span>
      </div>
    </motion.div>
  );
};

export default SplashScreen;
