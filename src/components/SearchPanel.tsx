import { useState, type FormEvent, type KeyboardEvent } from "react";
import type { MapInstance } from "../lib/map";
import { search, type SearchPlace, type SearchResult } from "../lib/search";
import { getMarkerSvg, getMarkerClass } from "../lib/icons";

interface SearchPanelProps {
  /** Выбран объект из результатов — панель закрывается / объект показывается на карте */
  onSelect: (place: SearchPlace) => void;
  /** Начало нового поиска — родитель очищает выбранный объект */
  onSearchStart?: () => void;
}

export default function SearchPanel({ onSelect, onSearchStart }: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setSearching(true);
    setSearchResult(null);
    onSearchStart?.();

    // Получаем текущие координаты карты
    const map = (window as any).__map as MapInstance | undefined;
    const center = map?.map.getCenter();

    const result = await search({
      query: trimmed,
      lat: center?.lat ?? 58.0419,
      lon: center?.lng ?? 65.273235,
    });

    setSearchResult(result);
    setSearching(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  return (
    <div className="search-wrapper">
      <label className="search-label" htmlFor="search-input">Поиск</label>
      <form className="search-form" onSubmit={handleFormSubmit}>
        <input
          id="search-input"
          type="text"
          placeholder="Поиск"
          className="search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="submit"
          className="search-submit-btn"
          aria-label="Найти"
          tabIndex={-1}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
            <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" />
          </svg>
        </button>
      </form>

      {searching && (
        <div className="search-status search-status-loading">Поиск…</div>
      )}

      {searchResult?.message && (
        <div className={`search-status search-status-${searchResult.type}`}>
          {searchResult.message}
        </div>
      )}

      {searchResult && searchResult.places.length > 0 && (
        <ul className="search-results">
          {searchResult.places.map((place) => (
            <li key={place.id}>
              <button
                type="button"
                className="search-result-item"
                onClick={() => onSelect(place)}
                disabled={!place.geometry}
                title={place.geometry ? "Показать на карте" : "Нет геометрии"}
              >
                <span
                  className={getMarkerClass(place.type, place.category)}
                  dangerouslySetInnerHTML={{ __html: getMarkerSvg(place.type, place.category) }}
                />
                <span className="search-result-text">
                  <span className="search-result-name">{place.name}</span>
                  {place.addr && (
                    <span className="search-result-addr">{place.addr}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}