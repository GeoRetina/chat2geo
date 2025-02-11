"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import useZoomRequestStore from "../stores/use-map-zoom-request-store";
import useToastMessageStore from "@/stores/use-toast-message-store";

interface GeocodeResponse {
  results: { geometry: any }[];
  error?: string;
}

export default function AddressSearch() {
  const [address, setAddress] = useState("");
  const [suggestions, setSuggestions] = useState<
    google.maps.places.AutocompletePrediction[]
  >([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const autocompleteService =
    useRef<google.maps.places.AutocompleteService | null>(null);
  const { setToastMessage } = useToastMessageStore();

  const setZoomToAddressRequest = useZoomRequestStore(
    (state) => state.setZoomToAddressRequest
  );

  useEffect(() => {
    const loadGoogleMapsScript = async () => {
      try {
        const res = await fetch("/api/services/google-maps/places");
        const data = await res.json();

        if (res.ok && data.scriptUrl) {
          if (typeof window !== "undefined" && !window.google) {
            const script = document.createElement("script");
            script.src = data.scriptUrl;
            script.async = true;
            script.defer = true;
            script.onload = () => {
              if (window.google) {
                autocompleteService.current =
                  new window.google.maps.places.AutocompleteService();
              } else {
                console.error("Google Maps JavaScript API not loaded.");
              }
            };
            document.head.appendChild(script);
          } else if (window.google) {
            autocompleteService.current =
              new window.google.maps.places.AutocompleteService();
          }
        } else {
          console.error("Failed to load Google Maps script URL");
        }
      } catch (err) {
        console.error("Error fetching Google Maps script:", err);
      }
    };

    loadGoogleMapsScript();
  }, []);

  useEffect(() => {
    if (error) {
      setToastMessage(error, "error");
    }
  }, [error, setToastMessage]);

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setAddress(input);

    if (input && autocompleteService.current) {
      autocompleteService.current.getPlacePredictions(
        { input },
        (predictions, status) => {
          if (
            status === window.google.maps.places.PlacesServiceStatus.OK &&
            predictions
          ) {
            setSuggestions(predictions);
          } else {
            setSuggestions([]);
          }
        }
      );
    } else {
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (
    suggestion: google.maps.places.AutocompletePrediction
  ) => {
    setAddress(suggestion.description);
    setSuggestions([]);
    handleGeocode(suggestion.description);
  };

  // Accept an optional address override parameter.
  const handleGeocode = async (addressOverride?: string) => {
    const queryAddress = addressOverride || address;
    try {
      setLoading(true);
      const response = await fetch("/api/services/google-maps/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: queryAddress }),
      });

      const data: GeocodeResponse = await response.json();

      if (response.ok && data.results && data.results[0]) {
        setError(null);
        setZoomToAddressRequest(data.results[0].geometry.location);
        setOpen(false);
      } else {
        setError(data.error || "Failed to geocode address.");
      }
    } catch (err) {
      setError("An error occurred while fetching the geocode.");
    }
    setLoading(false);
    setAddress("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="bg-background rounded-xl [&_svg]:size-5"
            >
              <Search className="text-foreground" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Search Address</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-80">
        <div className="relative">
          <Input
            value={address}
            onChange={handleAddressChange}
            placeholder="Enter an address"
            className="w-full pl-10"
          />
          <Button
            onClick={() => handleGeocode()}
            variant="ghost"
            className="absolute inset-y-0 left-0 flex items-center px-2"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-foreground" />
            ) : (
              <Search className="w-4 h-4 text-foreground" />
            )}
          </Button>
        </div>
        {suggestions.length > 0 && (
          <ul className="mt-2 max-h-60 overflow-y-auto border border-stone-600 rounded-md bg-background">
            {suggestions.map((suggestion) => (
              <li
                key={suggestion.place_id}
                className="cursor-pointer p-2 hover:bg-muted text-sm"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion.description}
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
