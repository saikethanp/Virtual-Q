import React from 'react';
import classes from './QueueToken.module.css';

interface QueueTokenProps {
  id: string;
  isUser?: boolean;
  status?: 'waiting' | 'serving' | 'served';
  className?: string;
  position?: number;
  elevate?: boolean;
}

const QueueToken: React.FC<QueueTokenProps> = ({ 
  id, 
  isUser = false, 
  status = 'waiting',
  className = '',
  position = 0,
  elevate = false
}) => {
  return (
    <div 
      className={`
        ${classes.token} 
        ${isUser ? classes.userToken : ''} 
        ${status === 'serving' ? classes.servingToken : ''}
        ${status === 'served' ? classes.servedToken : ''}
        ${elevate ? classes.elevated : ''}
        ${className}
      `}
      style={{
        '--position-offset': position,
      } as React.CSSProperties}
    >
      <div className={classes.tokenInner}>
        <div className={classes.tokenContent}>
          <span className={classes.tokenId}>{id}</span>
          {isUser && <span className={classes.userLabel}>YOU</span>}
        </div>
        {status === 'serving' && (
          <div className={classes.statusLabel}>NOW SERVING</div>
        )}
      </div>
    </div>
  );
};

export default QueueToken;
