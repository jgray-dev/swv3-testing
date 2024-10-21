"use client";
import { getLocationDetails } from "~/server/queries";
import { useState } from "react";

interface ClientLocation {
  latitude: number;
  longitude: number;
}

export default function Home() {
  const [location, setLocation] = useState<ClientLocation | null>(null);
  const [gpsError, setGpsError] = useState(false);
  const [gpsAttempted, setGpsAttempted] = useState(false);
  const [enteredLocation, setEnteredLocation] = useState("");

  function getClientLocation(): Promise<ClientLocation> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser"));
      } else {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          (error) => {
            reject(error);
          }
        );
      }
    });
  }

  return (
    <div>
      <button
        className={
          "m-8 rounded-sm bg-red-400 px-4 py-2 text-white hover:bg-red-300"
        }
        onClick={async () => {
          setGpsAttempted(true);
          try {
            const results = await getClientLocation();
            setLocation(results);
            setGpsError(false);
            console.log(results);
          } catch (error) {
            console.error("Error getting location:", error);
            setGpsError(true);
          }
        }}
      >
        Location via GPS
      </button>
      {gpsAttempted && gpsError && (
        <form>
          <input
            onChange={(e) => {
              setEnteredLocation(e.target.value);
            }}
            className={
              "m-8 rounded-sm bg-neutral-800 px-4 py-2 text-white placeholder-white/60 hover:bg-neutral-900"
            }
            placeholder={"Enter geolocation manually"}
          />
          <button
            className={
              "rounded-sm bg-red-400 px-4 py-2 text-white hover:bg-red-300"
            }
            type={"submit"}
            onClick={async (e) => {
              e.preventDefault();
              try {
                const results = await getLocationDetails(enteredLocation);
                if (results.results && results.results.length > 0) {
                  const newLocation = results.results[0].geometry.location;
                  setLocation({
                    latitude: newLocation.lat,
                    longitude: newLocation.lng,
                  });
                  console.log(newLocation);
                } else {
                  throw new Error("No results found");
                }
              } catch (error) {
                console.error("Error getting location details:", error);
                // Optionally, you can set an error state here to display to the user
              }
            }}
          >
            Submit
          </button>
        </form>
      )}
    </div>
  );
}