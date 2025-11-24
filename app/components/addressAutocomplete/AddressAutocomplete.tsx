import React, { useState, useEffect, useRef } from 'react';
import { addressService, type AddressSuggestion, type AddressDetails } from '../../services/addressService';
import './addressAutocomplete.css';

interface AddressAutocompleteProps {
    onAddressSelect: (address: AddressDetails) => void;
    initialValue?: string;
    placeholder?: string;
    mapboxToken: string;
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
    onAddressSelect,
    initialValue = '',
    placeholder = 'Start typing your address...',
    mapboxToken,
}) => {
    const [inputValue, setInputValue] = useState(initialValue);
    const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [error, setError] = useState<string | null>(null);

    const wrapperRef = useRef<HTMLDivElement>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
                setSelectedIndex(-1);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Initialize address service with Mapbox token
    useEffect(() => {
        if (mapboxToken) {
            addressService.initialize(mapboxToken);
        }
    }, [mapboxToken]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInputValue(value);
        setError(null);
        setSelectedIndex(-1);

        // Clear previous timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // Debounce the search
        if (value.length >= 3) {
            setIsLoading(true);
            searchTimeoutRef.current = setTimeout(async () => {
                try {
                    const results = await addressService.searchAddresses(value);
                    setSuggestions(results);
                    setShowSuggestions(true);
                } catch (err) {
                    console.error('Address search error:', err);
                    setError('Failed to search addresses. Please try again.');
                    setSuggestions([]);
                } finally {
                    setIsLoading(false);
                }
            }, 300); // 300ms debounce
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
            setIsLoading(false);
        }
    };

    const handleSuggestionClick = async (suggestion: AddressSuggestion) => {
        setInputValue(suggestion.placeName);
        setShowSuggestions(false);
        setIsLoading(true);
        setError(null);

        try {
            const addressDetails = await addressService.getPlaceDetails(suggestion);
            onAddressSelect(addressDetails);
        } catch (err) {
            console.error('Error getting place details:', err);
            setError('Failed to load address details. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showSuggestions || suggestions.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev < suggestions.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
                    handleSuggestionClick(suggestions[selectedIndex]);
                }
                break;
            case 'Escape':
                setShowSuggestions(false);
                setSelectedIndex(-1);
                break;
        }
    };

    return (
        <div className="address-autocomplete-wrapper" ref={wrapperRef}>
            <div className="address-input-container">
                <input
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                        if (suggestions.length > 0) {
                            setShowSuggestions(true);
                        }
                    }}
                    placeholder={placeholder}
                    className="address-input"
                    autoComplete="off"
                />
                {isLoading && (
                    <div className="loading-spinner">
                        <svg className="spinner" viewBox="0 0 50 50">
                            <circle
                                className="spinner-circle"
                                cx="25"
                                cy="25"
                                r="20"
                                fill="none"
                                strokeWidth="4"
                            />
                        </svg>
                    </div>
                )}
            </div>

            {error && (
                <div className="address-error">
                    {error}
                </div>
            )}

            {showSuggestions && suggestions.length > 0 && (
                <ul className="suggestions-list">
                    {suggestions.map((suggestion, index) => (
                        <li
                            key={suggestion.id}
                            className={`suggestion-item ${index === selectedIndex ? 'selected' : ''
                                }`}
                            onClick={() => handleSuggestionClick(suggestion)}
                            onMouseEnter={() => setSelectedIndex(index)}
                        >
                            <svg className="location-icon" viewBox="0 0 24 24" width="18" height="18">
                                <path
                                    fill="currentColor"
                                    d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                                />
                            </svg>
                            <div className="suggestion-content">
                                <div className="suggestion-main">{suggestion.mainText}</div>
                                <div className="suggestion-secondary">{suggestion.secondaryText}</div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {showSuggestions && !isLoading && inputValue.length >= 3 && suggestions.length === 0 && (
                <div className="no-results">
                    No addresses found. Please try a different search.
                </div>
            )}
        </div>
    );
};

export default AddressAutocomplete;