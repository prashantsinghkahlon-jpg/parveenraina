import L from 'leaflet';
import { AdminSettings } from '../types';

/**
 * Creates and attaches the appropriate tile layer based on current Admin Settings.
 * Fully supports:
 * 1. Mapbox GL / Raster tiles via Mapbox API Token (pk.ey...) with zero or clean attribution
 * 2. Google Maps Platform tiles via Google API key
 * 3. Custom Tile Server URL
 * 4. High-performance OpenStreetMap / Carto Voyager default
 */
export function createConfiguredTileLayer(settings?: AdminSettings | null): L.TileLayer {
  const rawProvider = (settings?.mapProvider || 'openstreetmap').toString().toLowerCase();
  const token = (settings?.mapboxToken || settings?.mapApiKey || '').trim();
  const customUrl = (settings?.mapTileUrl || settings?.mapCustomTileUrl || '').trim();
  const hideWatermarks = settings?.hideWatermarks !== false; // default to clean if configured

  // Detect if user pasted a Mapbox token even if provider wasn't explicitly set to mapbox
  const isMapbox = rawProvider.includes('mapbox') || token.startsWith('pk.');
  const isGoogle = rawProvider.includes('google') || token.startsWith('AIza');

  // 1. Mapbox Streets v12 high-resolution tiles
  if (isMapbox && token) {
    const attribution = hideWatermarks ? '' : '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a>';
    return L.tileLayer(
      `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${token}`,
      {
        attribution,
        maxZoom: 22,
        tileSize: 256,
        zoomOffset: 0,
      }
    );
  }

  // 2. Google Maps Standard Roadmap tiles
  if (isGoogle && token) {
    const attribution = hideWatermarks ? '' : '&copy; Google Maps';
    return L.tileLayer(
      `https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&key=${token}`,
      {
        attribution,
        maxZoom: 20,
      }
    );
  }

  // 3. Custom Tile URL (e.g. self-hosted tile server or enterprise GIS)
  if (customUrl) {
    return L.tileLayer(customUrl, {
      attribution: hideWatermarks ? '' : 'Custom Tile Server',
      maxZoom: 20,
    });
  }

  // 4. Default Clean OpenStreetMap / Carto Voyager
  const defaultAttribution = hideWatermarks ? '' : '&copy; OpenStreetMap &copy; CARTO';
  return L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: defaultAttribution,
    subdomains: 'abcd',
    maxZoom: 19,
  });
}

/**
 * Ensures Leaflet's built-in attribution control and any watermark overlays are completely
 * suppressed when the administrator has chosen to hide watermarks.
 */
export function configureMapWatermarks(map: L.Map, settings?: AdminSettings | null): void {
  const hideWatermarks = settings?.hideWatermarks !== false;
  if (hideWatermarks && map.attributionControl) {
    try {
      map.attributionControl.remove();
    } catch {
      // ignore
    }
  }
}
