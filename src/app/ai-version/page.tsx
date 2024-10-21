'use client'

import { useState, useEffect } from 'react';
import {now} from "next-auth/client/_utils";

declare global {
  interface Window {
    google?: any;
    initMap?: () => void;
  }
}

// Create a function to load Google Maps API once
const loadGoogleMapsAPI = (() => {
  let promise: Promise<void> | null = null;

  return () => {
    if (!promise) {
      promise = new Promise((resolve, reject) => {
        // Create callback for Google Maps to call when loaded
        window.initMap = () => {
          resolve();
        };

        // Create script element
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyAhjtgDzeSA7mogbGmREBRM6_EpdEro7SY&callback=initMap`;
        // disabled this api key, kindly go fuck yourself git && stackoverflow telling me that dumbass command i ran was gonna remove this commit from the push
        script.async = true;
        script.defer = true;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    return promise;
  };
})();

export default function GeolocationComponent() {
  const [location, setLocation] = useState({ latitude: null, longitude: null });
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [address, setAddress] = useState('');
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const [rating, setRating] = useState(undefined)

  useEffect(() => {
    if (Number(location.latitude) === location.latitude && Number(location.longitude) === location.longitude) {
      const startTime = now()
      setRating(getRating(location.latitude, location.longitude))
      const endTime = now()
      console.log("TIME", startTime - endTime)

    }
  }, [location]);

  useEffect(() => {
    // Load Google Maps API
    loadGoogleMapsAPI()
      .then(() => {
        setIsGoogleLoaded(true);
      })
      .catch((error) => {
        console.error('Error loading Google Maps API:', error);
        setIsGoogleLoaded(false);
      });

    // Try browser geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          setIsLoading(false);
        },
        () => {
          setHasError(true);
          setIsLoading(false);
        }
      );
    } else {
      setHasError(true);
      setIsLoading(false);
    }
  }, []);

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    if (!isGoogleLoaded || !window.google) {
      console.error('Google Maps API not loaded');
      return;
    }

    setIsLoading(true);

    try {
      const geocoder = new window.google.maps.Geocoder();

      const result = await geocoder.geocode({ address });

      if (result.results && result.results[0]) {
        const location = result.results[0].geometry.location;
        setLocation({
          latitude: location.lat(),
          longitude: location.lng()
        });
        setHasError(false);
      } else {
        setHasError(true);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4">
      {isLoading ? (
        <p>Loading location...</p>
      ) : hasError || !location.latitude ? (
        <div className="space-y-4">
          <p className="text-amber-600">Please enter your location manually:</p>
          <form onSubmit={handleAddressSubmit} className="space-y-2">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter an address or location"
              className="w-full p-2 border border-gray-300 rounded"
              disabled={!isGoogleLoaded}
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
              disabled={!isGoogleLoaded}
            >
              {isGoogleLoaded ? 'Search' : 'Loading Google Maps...'}
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-2">
          <p>Latitude: {location.latitude}</p>
          <p>Longitude: {location.longitude}</p>
        </div>
      )}
    </div>
  );
}



import { fetchWeatherApi } from 'openmeteo';

interface CloudData {
  high: number;
  mid: number;
  low: number;
}

interface WeatherData {
  hourly: {
    time: Date[];
    cloudCover: Float32Array;
    cloudCoverLow: Float32Array;
    cloudCoverMid: Float32Array;
    cloudCoverHigh: Float32Array;
    isDay: Float32Array;
  }
}

async function fetchWeatherData(latitude: number, longitude: number): Promise<WeatherData> {
  console.log(`[FETCH] Starting weather data fetch for lat: ${latitude}, lon: ${longitude}`);

  try {
    const params = {
      "latitude": latitude,
      "longitude": longitude,
      "hourly": ["cloud_cover", "cloud_cover_low", "cloud_cover_mid", "cloud_cover_high", "is_day"],
      "past_days": 1,
      "forecast_days": 1
    };

    console.log('[FETCH] Params configured:', params);

    const url = "https://api.open-meteo.com/v1/forecast";
    console.log('[FETCH] Initiating API call to:', url);

    const responses = await fetchWeatherApi(url, params);
    console.log('[FETCH] Received API response');

    if (!responses || responses.length === 0) {
      throw new Error('No response received from weather API');
    }

    const response = responses[0];
    if (!response) {
      throw new Error('First response is undefined');
    }

    const utcOffsetSeconds = response.utcOffsetSeconds();
    const hourly = response.hourly();

    if (!hourly) {
      throw new Error('Hourly data is missing from response');
    }

    console.log('[FETCH] Processing hourly data');

    const range = (start: number, stop: number, step: number) =>
      Array.from({ length: (stop - start) / step }, (_, i) => start + i * step);

    const processedData = {
      hourly: {
        time: range(Number(hourly.time()), Number(hourly.timeEnd()), hourly.interval()).map(
          (t) => new Date((t + utcOffsetSeconds) * 1000)
        ),
        cloudCover: hourly.variables(0)?.valuesArray() ?? new Float32Array(),
        cloudCoverLow: hourly.variables(1)?.valuesArray() ?? new Float32Array(),
        cloudCoverMid: hourly.variables(2)?.valuesArray() ?? new Float32Array(),
        cloudCoverHigh: hourly.variables(3)?.valuesArray() ?? new Float32Array(),
        isDay: hourly.variables(4)?.valuesArray() ?? new Float32Array(),
      }
    };

    console.log('[FETCH] Data processing complete. Sample values:', {
      timeLength: processedData.hourly.time.length,
      firstTime: processedData.hourly.time[0],
      lastTime: processedData.hourly.time[processedData.hourly.time.length - 1]
    });

    return processedData;
  } catch (error) {
    console.error('[FETCH] Error in fetchWeatherData:', error);
    throw error;  // Re-throw to be handled by caller
  }
}

function getNextSolarEvent(weatherData: WeatherData): { type: "sunrise" | "sunset", time: Date } | null {
  console.log('[SOLAR] Starting solar event detection');

  if (!weatherData?.hourly?.isDay) {
    console.error('[SOLAR] Weather data or isDay array is missing');
    return null;
  }

  const hourly = weatherData.hourly;

  for (let i = 1; i < hourly.isDay.length; i++) {
    const prevIsDay = hourly.isDay[i - 1];
    const currIsDay = hourly.isDay[i];

    console.log(`[SOLAR] Checking hour ${i}: prev=${prevIsDay}, curr=${currIsDay}`);

    if (prevIsDay === 0 && currIsDay === 1) {
      console.log('[SOLAR] Sunrise detected at:', hourly.time[i]);
      return { type: "sunrise", time: hourly.time[i] };
    }
    if (prevIsDay === 1 && currIsDay === 0) {
      console.log('[SOLAR] Sunset detected at:', hourly.time[i]);
      return { type: "sunset", time: hourly.time[i] };
    }
  }

  console.log('[SOLAR] No solar event found');
  return null;
}

function interpolateCloudData(latitude: number, longitude: number, weatherData: WeatherData): CloudData {
  console.log('[INTERPOLATE] Starting cloud data interpolation');

  const currentHour = new Date().getHours();
  const nextHour = (currentHour + 1) % 24;
  const minuteFraction = new Date().getMinutes() / 60;

  console.log(`[INTERPOLATE] Current hour: ${currentHour}, Next hour: ${nextHour}, Minute fraction: ${minuteFraction}`);

  // Helper function for linear interpolation
  const interpolate = (curr: number, next: number): number => {
    const result = curr + (next - curr) * minuteFraction;
    console.log(`[INTERPOLATE] Interpolating between ${curr} and ${next} = ${result}`);
    return result;
  };

  const result = {
    high: interpolate(
      weatherData.hourly.cloudCoverHigh[currentHour] || 0,
      weatherData.hourly.cloudCoverHigh[nextHour] || 0
    ),
    mid: interpolate(
      weatherData.hourly.cloudCoverMid[currentHour] || 0,
      weatherData.hourly.cloudCoverMid[nextHour] || 0
    ),
    low: interpolate(
      weatherData.hourly.cloudCoverLow[currentHour] || 0,
      weatherData.hourly.cloudCoverLow[nextHour] || 0
    )
  };

  console.log('[INTERPOLATE] Final cloud data:', result);
  return result;
}

function calculateRating(latitude: number, longitude: number, weatherData: WeatherData): number | null {
  console.log('[RATING] Starting rating calculation');

  const nextEvent = getNextSolarEvent(weatherData);
  if (!nextEvent) {
    console.log('[RATING] No next solar event found');
    return null;
  }

  console.log(`[RATING] Calculating for ${nextEvent.type} at ${nextEvent.time}`);

  const MILES_TO_LONGITUDE = 0.018;
  const CHECK_POINTS = 8;
  const MAX_DISTANCE = 120;
  const STEP = MAX_DISTANCE / CHECK_POINTS;

  let totalScore = 0;
  const weights = {
    high: 0.5,
    mid: 0.3,
    low: -0.2
  };

  const direction = nextEvent.type === "sunrise" ? 1 : -1;

  for (let mile = STEP; mile <= MAX_DISTANCE; mile += STEP) {
    const lonDiff = mile * MILES_TO_LONGITUDE * direction;
    console.log(`[RATING] Checking point at ${mile} miles (lon diff: ${lonDiff})`);

    const checkPoint = interpolateCloudData(latitude, longitude + lonDiff, weatherData);
    const distanceFactor = (mile / MAX_DISTANCE) * 1.5;

    const pointScore = (
      checkPoint.high * weights.high * distanceFactor +
      checkPoint.mid * weights.mid * distanceFactor +
      checkPoint.low * weights.low
    );

    console.log(`[RATING] Point score: ${pointScore} (distance factor: ${distanceFactor})`);
    totalScore += pointScore;
  }

  const finalRating = Math.round(Math.min(Math.max((totalScore / CHECK_POINTS) + 50, 0), 100));
  console.log(`[RATING] Final rating calculated: ${finalRating}`);
  return finalRating;
}

export async function getRating(latitude: number, longitude: number): Promise<number | null> {
  console.log(`[MAIN] Starting getRating for lat: ${latitude}, lon: ${longitude}`);

  try {
    const weatherData = await fetchWeatherData(latitude, longitude);

    if (!weatherData) {
      console.error('[MAIN] Weather data is undefined after fetch');
      return null;
    }

    console.log('[MAIN] Weather data fetched successfully');

    const rating = calculateRating(latitude, longitude, weatherData);
    console.log(`[MAIN] Final rating: ${rating}`);

    return rating;
  } catch (error) {
    console.error('[MAIN] Error in getRating:', error);
    return null;
  }
}

// Example usage:
// const rating = await getRating(52.52, 13.41);
