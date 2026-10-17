'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon, CloudRain, Cloud, Compass } from 'lucide-react';

interface CityWeather {
  temp: number | null;
  code: number | null;
  isDay: boolean;
  timeString: string;
}

export function DualZoneWidget() {
  const [kyrenia, setKyrenia] = useState<CityWeather>({
    temp: null,
    code: null,
    isDay: true,
    timeString: '--:--',
  });

  const [bulacan, setBulacan] = useState<CityWeather>({
    temp: null,
    code: null,
    isDay: true,
    timeString: '--:--',
  });

  // Time ticker
  useEffect(() => {
    const updateTimes = () => {
      const now = new Date();

      const kyreniaTime = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Nicosia',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(now);

      const bulacanTime = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(now);

      setKyrenia((prev) => ({ ...prev, timeString: kyreniaTime }));
      setBulacan((prev) => ({ ...prev, timeString: bulacanTime }));
    };

    updateTimes();
    const interval = setInterval(updateTimes, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch weather from open-meteo (Free, no API key required)
  useEffect(() => {
    async function fetchWeather() {
      try {
        // Kyrenia: 35.3364, 33.3173
        const resKyrenia = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=35.3364&longitude=33.3173&current=temperature_2m,is_day,weather_code&timezone=Asia%2FNicosia'
        );
        if (resKyrenia.ok) {
          const data = await resKyrenia.json();
          setKyrenia((prev) => ({
            ...prev,
            temp: Math.round(data.current?.temperature_2m ?? 24),
            code: data.current?.weather_code ?? 0,
            isDay: Boolean(data.current?.is_day),
          }));
        }

        // Bulacan: 14.8527, 120.8160
        const resBulacan = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=14.8527&longitude=120.8160&current=temperature_2m,is_day,weather_code&timezone=Asia%2FManila'
        );
        if (resBulacan.ok) {
          const data = await resBulacan.json();
          setBulacan((prev) => ({
            ...prev,
            temp: Math.round(data.current?.temperature_2m ?? 29),
            code: data.current?.weather_code ?? 0,
            isDay: Boolean(data.current?.is_day),
          }));
        }
      } catch {
        // Default graceful fallback
        setKyrenia((prev) => ({ ...prev, temp: 24, isDay: true, code: 0 }));
        setBulacan((prev) => ({ ...prev, temp: 29, isDay: true, code: 0 }));
      }
    }

    fetchWeather();
    const interval = setInterval(fetchWeather, 600000); // refresh every 10 mins
    return () => clearInterval(interval);
  }, []);

  const getWeatherIcon = (isDay: boolean, code: number | null) => {
    if (code !== null && (code >= 51 && code <= 67 || code >= 80)) {
      return <CloudRain className="w-4 h-4 text-sky-400" />;
    }
    if (code !== null && code >= 1 && code <= 3) {
      return <Cloud className="w-4 h-4 text-slate-300" />;
    }
    return isDay ? (
      <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" />
    ) : (
      <Moon className="w-4 h-4 text-indigo-300" />
    );
  };

  return (
    <div className="flex items-center gap-3 bg-[#111726]/80 backdrop-blur-md border border-white/10 rounded-2xl p-2 px-3.5 shadow-lg">
      {/* Kyrenia */}
      <div className="flex items-center gap-2 pr-3 border-r border-white/10">
        <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
          {getWeatherIcon(kyrenia.isDay, kyrenia.code)}
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <span>Kyrenia</span>
            <span className="text-[10px] px-1 rounded bg-blue-500/20 text-blue-300">TR/NC</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-sm font-semibold text-white tracking-wider">
              {kyrenia.timeString}
            </span>
            <span className="text-xs text-amber-400 font-medium">
              {kyrenia.temp !== null ? `${kyrenia.temp}°C` : '--'}
            </span>
          </div>
        </div>
      </div>

      {/* Bulacan */}
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
          {getWeatherIcon(bulacan.isDay, bulacan.code)}
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <span>Bulacan</span>
            <span className="text-[10px] px-1 rounded bg-rose-500/20 text-rose-300">PH</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-sm font-semibold text-white tracking-wider">
              {bulacan.timeString}
            </span>
            <span className="text-xs text-amber-400 font-medium">
              {bulacan.temp !== null ? `${bulacan.temp}°C` : '--'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
