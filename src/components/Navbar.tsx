import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import classes from './Navbar.module.css';

const Navbar = () => {
  return (
    <nav className={classes.navbar}>
      <div className={`container ${classes.container}`}>
        <div className={classes.logo}>
          <Link to="/" className={classes.logoLink}>
            <motion.img layoutId="logo-img" src="/logo.png" alt="Virtual-Q Logo" className={classes.logoImage} />
            <motion.span layoutId="logo-text" className={classes.logoText}>Virtual-Q</motion.span>
          </Link>
        </div>

        <div className={classes.actions}>
          <Link to="/my-queue" className={classes.navLink} style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500 }}>
            My Queue
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
