import React, { useState, useRef } from 'react';
import { City } from '../types';

export interface FavoritesPanelProps {
  favorites: City[];
  selectedCity: City | null;
  onSelectCity: (city: City) => void;
  onRemoveFavorite: (id: number) => void;
  storageAvailable: boolean;
}

export const FavoritesPanel: React.FC<FavoritesPanelProps> = ({
  favorites,
  selectedCity,
  onSelectCity,
  onRemoveFavorite,
  storageAvailable,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggeringBtnRef = useRef<HTMLButtonElement | null>(null);
  const [cityToRemove, setCityToRemove] = useState<City | null>(null);

  const handleOpenRemoveDialog = (city: City, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    triggeringBtnRef.current = e.currentTarget;
    setCityToRemove(city);
    dialogRef.current?.showModal();
  };

  const handleCancelDialog = () => {
    dialogRef.current?.close();
    setCityToRemove(null);
    triggeringBtnRef.current?.focus();
  };

  const handleConfirmRemove = () => {
    if (cityToRemove) {
      onRemoveFavorite(cityToRemove.id);
    }
    dialogRef.current?.close();
    setCityToRemove(null);
    setTimeout(() => {
      triggeringBtnRef.current?.focus();
    }, 0);
  };

  return (
    <section className="favorites-panel" aria-label="Favourite Cities">
      <div className="favorites-header">
        <h3 className="favorites-title">
          <span>Favourite Cities</span>
          <span className="favorites-count">({favorites.length}/5)</span>
        </h3>
      </div>

      {!storageAvailable && (
        <div className="favorites-storage-notice" role="status">
          Favourites can&apos;t be saved on this device and will be cleared when you close the tab.
        </div>
      )}

      {favorites.length === 0 ? (
        <div className="favorites-empty">
          No favourites yet. Search for a city and tap the star to save it here.
        </div>
      ) : (
        <div className="favorites-chips-wrapper">
          <div className="favorites-chips-list" role="list">
            {favorites.map((city) => {
              const isActive = selectedCity?.id === city.id;
              return (
                <div
                  key={city.id}
                  role="listitem"
                  className={`favorite-chip ${isActive ? 'is-active' : ''}`}
                >
                  <button
                    type="button"
                    className="favorite-chip-select-btn"
                    onClick={() => onSelectCity(city)}
                    aria-label={`View weather for ${city.name}, ${city.country}`}
                    aria-pressed={isActive}
                  >
                    <span className="favorite-chip-name">{city.name}</span>
                    <span className="favorite-chip-country">{city.country}</span>
                  </button>

                  <button
                    type="button"
                    className="favorite-chip-remove-btn"
                    onClick={(e) => handleOpenRemoveDialog(city, e)}
                    aria-label={`Remove ${city.name} from favourites`}
                    title={`Remove ${city.name} from favourites`}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Confirmation Dialog before Removal */}
      <dialog
        ref={dialogRef}
        className="favorites-confirm-dialog"
        onCancel={(e) => {
          e.preventDefault();
          handleCancelDialog();
        }}
        aria-labelledby="dialog-title"
        aria-describedby="dialog-desc"
      >
        <div className="dialog-content">
          <h4 id="dialog-title" className="dialog-title">
            Remove Favourite
          </h4>
          <p id="dialog-desc" className="dialog-message">
            Remove {cityToRemove?.name} from favourites?
          </p>

          <div className="dialog-actions">
            <button
              type="button"
              className="dialog-btn dialog-cancel-btn"
              onClick={handleCancelDialog}
            >
              Cancel
            </button>
            <button
              type="button"
              className="dialog-btn dialog-remove-btn"
              onClick={handleConfirmRemove}
            >
              Remove
            </button>
          </div>
        </div>
      </dialog>
    </section>
  );
};
