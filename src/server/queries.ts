'use server'
import 'server-only';

interface GeolocationResponse {
  location: {
    lat: number;
    lng: number;
  };
  accuracy: number;
}

export async function getUserLocation(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('Google Maps API key is not set');
    }
    const response = await fetch(`https://www.googleapis.com/geolocation/v1/geolocate?key=${apiKey}`, { method: 'POST' });
    if (!response.ok) {
      console.log(`HTTP error! status: ${response.status}`);
    }
    const data: GeolocationResponse = await response.json();
    const { lat, lng } = data.location;
    console.log(`Latitude: ${lat}, Longitude: ${lng}`);
    return { latitude: lat, longitude: lng };
  } catch (error) {
    console.error('Error getting user geolocation:', error);
    return null;
  }
}


interface GeocodeResult {
  results: {
    address_components: {
      long_name: string;
      short_name: string;
      types: string[];
    }[];
    formatted_address: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
      location_type: string;
      viewport: {
        northeast: {
          lat: number;
          lng: number;
        };
        southwest: {
          lat: number;
          lng: number;
        };
      };
    };
    place_id: string;
    plus_code?: {
      compound_code: string;
      global_code: string;
    };
    types: string[];
  }[];
  status: string;
}

export async function getLocationDetails(location: string): Promise<GeocodeResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('Google Maps API key is not set');
  }

  const endpoint = 'https://maps.googleapis.com/maps/api/geocode/json';
  const url = `${endpoint}?address=${encodeURIComponent(location)}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: GeocodeResult = await response.json();

    if (data.status !== 'OK') {
      throw new Error(`Geocoding API error: ${data.status}`);
    }

    return data;
  } catch (error) {
    console.error('Error fetching geolocation details:', error);
    throw error;
  }
}