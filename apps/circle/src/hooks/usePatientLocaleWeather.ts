import { useEffect, useState } from 'react';

export type PatientLocaleWeatherDeviceSource = {
  city: string;
  country: string;
  timezoneId: string;
  timezoneShort: string;
  latitude: number;
  longitude: number;
};

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

async function fetchWeatherForCoordinates(
  latitude: number,
  longitude: number,
  timezone: string,
): Promise<{
  timezoneId: string;
  timezoneShort: string;
  localTime: string;
  temperatureF: number | null;
  weatherLabel: string;
}> {
  const forecastUrl = new URL('https://api.open-meteo.com/v1/forecast');
  forecastUrl.searchParams.set('latitude', String(latitude));
  forecastUrl.searchParams.set('longitude', String(longitude));
  forecastUrl.searchParams.set('current', 'temperature_2m,weather_code');
  forecastUrl.searchParams.set('timezone', timezone === 'auto' ? 'auto' : timezone);

  const forecastRes = await fetch(forecastUrl.toString());
  if (!forecastRes.ok) throw new Error('Weather lookup failed.');
  const forecastJson = (await forecastRes.json()) as {
    timezone?: string;
    current?: { temperature_2m?: number; weather_code?: number };
  };

  const timezoneId = forecastJson.timezone ?? timezone;
  const localTime = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezoneId,
  }).format(new Date());

  const timezoneShort =
    new Intl.DateTimeFormat(undefined, {
      timeZone: timezoneId,
      timeZoneName: 'short',
    })
      .formatToParts(new Date())
      .find((part) => part.type === 'timeZoneName')?.value ?? timezoneId;

  return {
    timezoneId,
    timezoneShort,
    localTime,
    temperatureF:
      forecastJson.current?.temperature_2m != null
        ? celsiusToFahrenheit(forecastJson.current.temperature_2m)
        : null,
    weatherLabel: weatherLabel(forecastJson.current?.weather_code),
  };
}

export function usePatientLocaleWeather(
  city: string,
  country: string,
  deviceSource?: PatientLocaleWeatherDeviceSource | null,
): PatientLocaleWeather {
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
    if (deviceSource) {
      let cancelled = false;
      const cityTrim = deviceSource.city.trim();
      const countryTrim = deviceSource.country.trim();
      const cityLabel = countryTrim ? `${cityTrim}, ${countryTrim}` : cityTrim;

      setState((prev) => ({ ...prev, loading: true, error: null, cityLabel }));

      void (async () => {
        try {
          const weather = await fetchWeatherForCoordinates(
            deviceSource.latitude,
            deviceSource.longitude,
            deviceSource.timezoneId,
          );
          if (cancelled) return;
          setState({
            cityLabel,
            localTime: weather.localTime,
            timezone: deviceSource.timezoneShort || weather.timezoneShort,
            timezoneId: deviceSource.timezoneId || weather.timezoneId,
            temperatureF: weather.temperatureF,
            weatherLabel: weather.weatherLabel,
            loading: false,
            error: null,
          });
        } catch (err) {
          if (cancelled) return;
          setState({
            cityLabel,
            localTime: new Intl.DateTimeFormat(undefined, {
              hour: 'numeric',
              minute: '2-digit',
              timeZone: deviceSource.timezoneId,
            }).format(new Date()),
            timezone: deviceSource.timezoneShort,
            timezoneId: deviceSource.timezoneId,
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
    }

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

        const weather = await fetchWeatherForCoordinates(
          place.latitude,
          place.longitude,
          'auto',
        );

        if (cancelled) return;

        setState({
          cityLabel,
          localTime: weather.localTime,
          timezone: weather.timezoneShort,
          timezoneId: weather.timezoneId,
          temperatureF: weather.temperatureF,
          weatherLabel: weather.weatherLabel,
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
  }, [
    city,
    country,
    deviceSource?.city,
    deviceSource?.country,
    deviceSource?.timezoneId,
    deviceSource?.timezoneShort,
    deviceSource?.latitude,
    deviceSource?.longitude,
  ]);

  return state;
}
