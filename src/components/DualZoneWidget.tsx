'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon, CloudRain, Cloud } from 'lucide-react';

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

  useEffect(() => {
    const updateTimes = () => {
      const now = new Date();

      const kyreniaTime = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Nicosia',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(now);

      const bulacanTime = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Manila',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(now);

      setKyrenia((prev) => ({ ...prev, timeString: kyreniaTime }));
      setBulacan((prev) => ({ ...prev, timeString: bulacanTime }));
    };

    updateTimes();
    const interval = setInterval(updateTimes, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function fetchWeather() {
      try {
        const resK = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=35.3364&longitude=33.3173&current=temperature_2m,is_day,weather_code&timezone=Asia%2FNicosia'
        );
        if (resK.ok) {
          const data = await resK.json();
          setKyrenia((prev) => ({
            ...prev,
            temp: Math.round(data.current?.temperature_2m ?? 24),
            code: data.current?.weather_code ?? 0,
            isDay: Boolean(data.current?.is_day),
          }));
        }

        const resB = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=14.8527&longitude=120.8160&current=temperature_2m,is_day,weather_code&timezone=Asia%2FManila'
        );
        if (resB.ok) {
          const data = await resB.json();
          setBulacan((prev) => ({
            ...prev,
            temp: Math.round(data.current?.temperature_2m ?? 29),
            code: data.current?.weather_code ?? 0,
            isDay: Boolean(data.current?.is_day),
          }));
        }
      } catch {
        setKyrenia((prev) => ({ ...prev, temp: 24, isDay: true, code: 0 }));
        setBulacan((prev) => ({ ...prev, temp: 29, isDay: true, code: 0 }));
      }
    }

    fetchWeather();
    const interval = setInterval(fetchWeather, 600000);
    return () => clearInterval(interval);
  }, []);

  const renderIcon = (isDay: boolean, code: number | null) => {
    if (code !== null && (code >= 51 && code <= 67 || code >= 80)) {
      return <CloudRain className="w-3.5 h-3.5 text-sky-400" />;
    }
    if (code !== null && code >= 1 && code <= 3) {
      return <Cloud className="w-3.5 h-3.5 text-slate-300" />;
    }
    return isDay ? (
      <Sun className="w-3.5 h-3.5 text-amber-400" />
    ) : (
      <Moon className="w-3.5 h-3.5 text-indigo-300" />
    );
  };

  return (
    <div className="flex items-center justify-between w-full bg-[#111722] border border-white/[0.08] rounded-2xl px-3.5 py-2 text-xs">
      {/* Kyrenia (Berk) */}
      <div className="flex items-center gap-2">
        {renderIcon(kyrenia.isDay, kyrenia.code)}
        <div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1 leading-none">
            <span>🦁 Girne</span>
          </div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="font-mono font-bold text-white text-xs">{kyrenia.timeString}</span>
            <span className="text-[10px] text-amber-400/90 font-medium">
              {kyrenia.temp !== null ? `${kyrenia.temp}°` : ''}
            </span>
          </div>
        </div>
      </div>

      <div className="h-5 w-px bg-white/[0.08]" />

      {/* Bulacan (Jaquilyn) */}
      <div className="flex items-center gap-2">
        {renderIcon(bulacan.isDay, bulacan.code)}
        <div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1 leading-none">
            <span>🌸 Bulacan</span>
          </div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="font-mono font-bold text-white text-xs">{bulacan.timeString}</span>
            <span className="text-[10px] text-rose-400/90 font-medium">
              {bulacan.temp !== null ? `${bulacan.temp}°` : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
