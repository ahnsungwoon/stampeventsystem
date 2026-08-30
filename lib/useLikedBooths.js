'use client';
import { useState, useEffect, useCallback } from 'react';

const KEY = 'liked_booths';

function readIds() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch { return []; }
}

export function useLikedBooths() {
  const [likedIds, setLikedIds] = useState([]);

  useEffect(() => { setLikedIds(readIds()); }, []);

  const toggleLike = useCallback((id) => {
    setLikedIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isLiked = useCallback((id) => likedIds.includes(id), [likedIds]);

  return { likedIds, isLiked, toggleLike };
}
