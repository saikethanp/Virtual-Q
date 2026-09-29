import { Link } from 'react-router-dom';
import classes from './Cart.module.css';

const Cart = () => {
  return (
    <div className={classes.page}>
      <div className={`container ${classes.container}`}>
        <div className={classes.cartWrapper}>
          <header className={classes.header}>
            <h1 className={classes.title}>YOUR ORDER</h1>
            <p className={classes.subtitle}>Burger House</p>
          </header>

          <div className={classes.itemsList}>
            <div className={classes.cartItem}>
              <div className={classes.itemDetails}>
                <h3 className={classes.itemName}>Chicken Burger × 2</h3>
              </div>
              <div className={classes.itemPrice}>₹298</div>
            </div>
            
            <div className={classes.cartItem}>
              <div className={classes.itemDetails}>
                <h3 className={classes.itemName}>Coke × 1</h3>
              </div>
              <div className={classes.itemPrice}>₹40</div>
            </div>
          </div>

          <div className={classes.cartDivider}></div>

          <div className={classes.cartTotal}>
            <span>TOTAL</span>
            <strong>₹338</strong>
          </div>
          
          <div className={classes.queueInfo}>
            <div className={classes.infoRow}>
              <span>Current queue:</span>
              <strong>8 orders</strong>
            </div>
            <div className={classes.infoRow}>
              <span>Estimated wait:</span>
              <strong>~18 min</strong>
            </div>
          </div>

          <div className={classes.actions}>
            <Link to="/queue/123" className={classes.confirmBtn}>
              CONFIRM & JOIN QUEUE
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
