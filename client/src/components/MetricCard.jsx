// Metric card component for dashboard stats
import React from 'react';

const MetricCard = ({ title, value, type }) => {
  let valClass = 'metric-value';
  if (type === 'primary') valClass += ' primary';
  if (type === 'danger') valClass += ' danger';

  return (
    <div className="metric-card">
      <div className="metric-title">{title}</div>
      <div className={valClass}>{value}</div>
    </div>
  );
};

export default MetricCard;
