import { useEffect, useState } from 'react';

type PatientLocaleWeather = {
  cityLabel: string;
  localTime: string;
  timezone: string;
  timezoneId: string;
  temperatureF: number | null;
  weatherLabel: string;
  loading: boolean;
  error: string | null;
};

const WEATHER_CODE_LABELS: Record<number, string> = {
  0: 'Clear',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Foggy',
  51: 'Light drizzle',
  61: 'Rain',
  63: 'Rain',
  65: 'Heavy rain',
  71: 'Snow',
  80: 'Showers',
  95: 'Thunderstorm',
};

function celsiusToFahrenheit(c: number): number {
  return Math.round((c * 9) / 5 + 32);
}

function weatherLabel(code: number | undefined): string {
  if (code == null) return '—';
  return WEATHER_CODE_LABELS[code] ?? 'Mixed conditions';
}

export function usePatientLocaleWeather(city: string, country: string): PatientLocaleWeather {
  const [state, setState] = useState<PatientLocaleWeather>({
    cityLabel: '',
    localTime: '',
    timezone: '',
    timezoneId: '',
    temperatureF: null,
    weatherLabel: '',
    loading: false,
    error: null,
  });

  useEffect(() => {
    const cityTrim = city.trim();
    const countryTrim = country.trim();
    if (!cityTrim) {
      setState({
        cityLabel: '',
        localTime: '',
        timezone: '',
        timezoneId: '',
        temperatureF: null,
        weatherLabel: '',
        loading: false,
        error: null,
      });
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    const cityLabel = countryTrim ? `${cityTrim}, ${countryTrim}` : cityTrim;

    void (async () => {
      try {
        const geoUrl = new URL('https://geocoding-api.open-meteo.com/v1/search');
        geoUrl.searchParams.set('name', cityTrim);
        geoUrl.searchParams.set('count', '1');
        geoUrl.searchParams.set('language', 'en');
        geoUrl.searchParams.set('format', 'json');
        if (countryTrim) geoUrl.searchParams.set('country', countryTrim);

        const geoRes = await fetch(geoUrl.toString());
        if (!geoRes.ok) throw new Error('Location lookup failed.');
        const geoJson = (await geoRes.json()) as {
          results?: Array<{ latitude: number; longitude: number; timezone?: string; name: string }>;
        };
        const place = geoJson.results?.[0];
        if (!place) throw new Error('Location not found.');

        const forecastUrl = new URL('https://api.open-meteo.com/v1/forecast');
        forecastUrl.searchParams.set('latitude', String(place.latitude));
        forecastUrl.searchParams.set('longitude', String(place.longitude));
        forecastUrl.searchParams.set('current', 'temperature_2m,weather_code');
        forecastUrl.searchParams.set('timezone', 'auto');

        const forecastRes = await fetch(forecastUrl.toString());
        if (!forecastRes.ok) throw new Error('Weather lookup failed.');
        const forecastJson = (await forecastRes.json()) as {
          timezone?: string;
          current?: { temperature_2m?: number; weather_code?: number };
        };

        const timezone = forecastJson.timezone ?? place.timezone ?? 'UTC';
        const localTime = new Intl.DateTimeFormat(undefined, {
          hour: 'numeric',
          minute: '2-digit',
          timeZone: timezone,
        }).format(new Date());

        const timezoneShort =
          new Intl.DateTimeFormat(undefined, {
            timeZone: timezone,
            timeZoneName: 'short',
          })
            .formatToParts(new Date())
            .find((part) => part.type === 'timeZoneName')?.value ?? timezone;

        if (cancelled) return;

        setState({
          cityLabel,
          localTime,
          timezone: timezoneShort,
          timezoneId: timezone,
          temperatureF:
            forecastJson.current?.temperature_2m != null
              ? celsiusToFahrenheit(forecastJson.current.temperature_2m)
              : null,
          weatherLabel: weatherLabel(forecastJson.current?.weather_code),
          loading: false,
          error: null,
        });
      } catch (err) {
        if (cancelled) return;
        setState({
          cityLabel,
          localTime: '',
          timezone: '',
          timezoneId: '',
          temperatureF: null,
          weatherLabel: '',
          loading: false,
          error: err instanceof Error ? err.message : 'Could not load location.',
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [city, country]);

  return state;
}
