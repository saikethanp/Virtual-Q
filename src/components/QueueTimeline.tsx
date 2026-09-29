import { motion, AnimatePresence } from 'framer-motion';
import QueueToken from './QueueToken';
import classes from './QueueTimeline.module.css';

interface TokenData {
  id: string;
  isUser?: boolean;
  status?: 'waiting' | 'serving' | 'served';
}

interface QueueTimelineProps {
  tokens: TokenData[];
}

const QueueTimeline: React.FC<QueueTimelineProps> = ({ tokens }) => {
  return (
    <div className={classes.timelineContainer}>
      <div className={classes.timeline}>
        <AnimatePresence>
          {tokens.map((token, index) => (
            <motion.div
              key={token.id}
              layout
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: -50 }}
              transition={{ 
                type: 'spring', 
                stiffness: 300, 
                damping: 30,
                mass: 1 
              }}
              className={classes.tokenWrapper}
            >
              <QueueToken 
                id={token.id} 
                isUser={token.isUser} 
                status={token.status}
                position={index}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      {/* Decorative timeline line */}
      <div className={classes.timelineLine}></div>
    </div>
  );
};

export default QueueTimeline;
