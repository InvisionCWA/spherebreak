import React from 'react';

function labelForRating(rating) {
  if (rating >= 1400) return 'Astral';
  if (rating >= 1200) return 'Nova';
  if (rating >= 1000) return 'Lumen';
  return 'Comet';
}

export default function RankBadge({ rating }) {
  const label = labelForRating(rating || 1000);
  return <span className={`rank-badge rank-${label.toLowerCase()}`}>{label} {rating ?? 1000}</span>;
}
