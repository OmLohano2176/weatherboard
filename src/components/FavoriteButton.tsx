import React, { useState } from 'react';
import { City } from '../types';
import { AddFavoriteResult } from '../hooks/useFavorites';

export interface FavoriteButtonProps {
  city: City;
  isFavorite: boolean;
  onAdd: (city: City) => AddFavoriteResult;
  onRemove: (id: number) => void;
  limitReached: boolean;
}

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  city,
  isFavorite,
  onAdd,
  onRemove,
  limitReached,
}) => {
  const [showLimitNotice, setShowLimitNotice] = useState(false);

  const label = isFavorite
    ? `Remove ${city.name} from favourites`
    : `Add ${city.name} to favourites`;

  const handleClick = () => {
    if (isFavorite) {
      onRemove(city.id);
      setShowLimitNotice(false);
    } else {
      const res = onAdd(city);
      if (!res.ok && res.reason === 'limit') {
        setShowLimitNotice(true);
      } else {
        setShowLimitNotice(false);
      }
    }
  };

  return (
    <div className="favorite-toggle-wrapper">
      <button
        type="button"
        className="favorite-toggle-btn"
        aria-pressed={isFavorite}
        aria-label={label}
        title={label}
        onClick={handleClick}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill={isFavorite ? '#f59e0b' : 'none'}
          stroke={isFavorite ? '#f59e0b' : 'currentColor'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        <span>{isFavorite ? 'Favourited' : 'Favourite'}</span>
      </button>

      {showLimitNotice && !isFavorite && limitReached && (
        <p className="favorite-limit-notice" role="alert">
          You can save up to 5 favourite cities. Remove one to add another.
        </p>
      )}
    </div>
  );
};
