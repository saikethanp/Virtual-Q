import { Link } from 'react-router-dom';
import classes from './Navbar.module.css';

const Navbar = () => {
  return (
    <nav className={classes.navbar}>
      <div className={`container ${classes.container}`}>
        <div className={classes.logo}>
          <Link to="/">
            <img src="/logo.png" alt="Virtual-Q Logo" className={classes.logoImage} />
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
