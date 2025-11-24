// Service for Mapbox Geocoding API
// This handles address suggestions and place details using Mapbox

export interface AddressSuggestion {
    id: string;
    placeName: string;
    mainText: string;
    secondaryText: string;
    context: any[];
}

export interface AddressDetails {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    formattedAddress: string;
}

class AddressService {
    private mapboxToken: string = '';

    /**
     * Initialize with Mapbox access token
     */
    initialize(token: string): void {
        this.mapboxToken = token;
    }

    /**
     * Search for address suggestions based on user input
     */
    async searchAddresses(input: string): Promise<AddressSuggestion[]> {
        if (!this.mapboxToken) {
            console.error('Mapbox token not initialized');
            return [];
        }

        if (!input || input.length < 3) {
            return [];
        }

        try {
            // Mapbox Geocoding API - forward geocoding (search)
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(input)}.json?` +
                `access_token=${this.mapboxToken}&` +
                `country=US&` +
                `types=address&` +
                `limit=5&` +
                `autocomplete=true`;

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Mapbox API error: ${response.status}`);
            }

            const data = await response.json();

            if (!data.features || data.features.length === 0) {
                return [];
            }

            return data.features.map((feature: any) => {
                // Parse the place name to separate main text from secondary
                const parts = feature.place_name.split(', ');
                const mainText = parts[0] || feature.place_name;
                const secondaryText = parts.slice(1).join(', ');

                return {
                    id: feature.id,
                    placeName: feature.place_name,
                    mainText,
                    secondaryText,
                    context: feature.context || [],
                };
            });
        } catch (error) {
            console.error('Address search error:', error);
            throw new Error('Failed to search addresses. Please try again.');
        }
    }

    /**
     * Get full address details for a selected place
     */
    async getPlaceDetails(suggestion: AddressSuggestion): Promise<AddressDetails> {
        try {
            // Parse address components from the suggestion's context
            return this.parseAddressFromSuggestion(suggestion);
        } catch (error) {
            console.error('Error getting place details:', error);
            throw new Error('Failed to load address details. Please try again.');
        }
    }

    /**
     * Parse address components from Mapbox suggestion
     */
    private parseAddressFromSuggestion(suggestion: AddressSuggestion): AddressDetails {
        let street = suggestion.mainText;
        let city = '';
        let state = '';
        let zipCode = '';
        let country = 'United States';

        // Parse context array for address components
        if (suggestion.context && Array.isArray(suggestion.context)) {
            suggestion.context.forEach((item: any) => {
                const id = item.id || '';

                if (id.startsWith('postcode.')) {
                    zipCode = item.text;
                } else if (id.startsWith('place.')) {
                    city = item.text;
                } else if (id.startsWith('region.')) {
                    // Get state abbreviation
                    state = item.short_code ? item.short_code.replace('US-', '') : item.text;
                } else if (id.startsWith('country.')) {
                    country = item.text;
                }
            });
        }

        // If we didn't get components from context, try parsing from place_name
        if (!city || !state) {
            const parts = suggestion.placeName.split(', ');

            if (parts.length >= 3) {
                street = parts[0];
                city = parts[1];

                // Parse "State ZIP" format
                const stateZip = parts[2];
                const stateZipMatch = stateZip.match(/([A-Z]{2})\s*(\d{5})/);
                if (stateZipMatch) {
                    state = stateZipMatch[1];
                    zipCode = stateZipMatch[2];
                }
            }
        }

        return {
            street: street.trim(),
            city: city.trim(),
            state: state.trim(),
            zipCode: zipCode.trim(),
            country: country.trim(),
            formattedAddress: suggestion.placeName,
        };
    }

    /**
     * Validate that the token is set
     */
    isInitialized(): boolean {
        return !!this.mapboxToken;
    }
}

// Export singleton instance
export const addressService = new AddressService();