import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import QueueTimeline from '../components/QueueTimeline';
import classes from './Queue.module.css';

const Queue = () => {
  const { id } = useParams(); // id is actually the slug based on our routes
  const [business, setBusiness] = useState<any>(null);
  const [queueTokens, setQueueTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUserId(session.user.id);
      }
    });
  }, []);

  useEffect(() => {
    const fetchQueue = async () => {
      const { data: bData } = await supabase
        .from('businesses')
        .select('*')
        .eq('slug', id)
        .single();
      
      if (bData) {
        setBusiness(bData);
        
        const { data: qData } = await supabase
          .from('queue_entries')
          .select('*')
          .eq('business_id', bData.id)
          .in('status', ['Waiting', 'Serving', 'waiting', 'serving'])
          .order('created_at', { ascending: true });
          
        if (qData) {
          const formatted = qData.map((q: any) => ({
            id: q.queue_number,
            isUser: q.user_id === userId,
            status: (q.status || 'waiting').toLowerCase()
          }));
          setQueueTokens(formatted);
        }
      }
      setLoading(false);
    };
    
    if (id) {
      fetchQueue();
      
      const interval = setInterval(fetchQueue, 10000); // refresh every 10 seconds
      return () => clearInterval(interval);
    }
  }, [id, userId]);

  if (loading) {
    return <div className={classes.page}><div className={`container ${classes.container}`}>Loading...</div></div>;
  }

  if (!business) {
    return <div className={classes.page}><div className={`container ${classes.container}`}>Business not found</div></div>;
  }

  const userTokenIndex = queueTokens.findIndex(t => t.isUser);
  const peopleAhead = userTokenIndex > 0 ? userTokenIndex - 1 : 0;
  const estimatedWait = peopleAhead * 6; // roughly 6 mins per person

  return (
    <div className={classes.page}>
      <div className={`container ${classes.container}`}>
        <div className={classes.header}>
          <div>
            <h1 className={classes.title}>{business.name}</h1>
            <p className={classes.subtitle}>{business.category}</p>
          </div>
        </div>

        <div className={classes.liveDisplay}>
          <div className={classes.mainTokens}>
            <div className={classes.tokenInfo}>
              <span className={classes.label}>NOW SERVING</span>
              <strong className={classes.value}>{queueTokens[0]?.id || '--'}</strong>
            </div>
            
            <div className={classes.tokenDivider}></div>
            
            <div className={classes.tokenInfo}>
              <span className={classes.labelAccent}>YOUR TOKEN</span>
              <strong className={classes.valueLarge}>
                {queueTokens.find(t => t.isUser)?.id || '--'}
              </strong>
            </div>
          </div>
          
          <div className={classes.timelineSection}>
            <QueueTimeline tokens={queueTokens} />
          </div>
          
          <div className={classes.metricsGrid}>
            <div className={classes.metric}>
              <span className={classes.metricLabel}>PEOPLE AHEAD</span>
              <strong className={classes.metricValue}>{peopleAhead}</strong>
            </div>
            <div className={classes.metric}>
              <span className={classes.metricLabel}>ESTIMATED WAIT</span>
              <strong className={classes.metricValue}>{estimatedWait} min</strong>
            </div>
            <div className={classes.metric}>
              <span className={classes.metricLabel}>STATUS</span>
              <div className={classes.statusGroup}>
                <span className={classes.statusDot}></span>
                <strong className={classes.metricValueSmall}>Moving normally</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Queue;
