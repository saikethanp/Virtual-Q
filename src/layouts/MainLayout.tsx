import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import classes from './MainLayout.module.css';

const MainLayout = () => {
  return (
    <div className={classes.layout}>
      <Navbar />
      <main className={classes.main}>
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
