/**
 * Static map showing branch location using OpenStreetMap (no API key).
 * Renders an embed map with a centered Hoppiness pin overlay.
 */
import { MapPin } from 'lucide-react';

interface StaticBranchMapProps {
  latitude: number;
  longitude: number;
  /** Link to open in new tab (e.g. Google Maps) */
  mapsUrl: string;
  className?: string;
  /** Height of the map area */
  height?: number;
  /** Optional title for the link (e.g. "Cómo llegar") */
  linkLabel?: string;
}

/** Build OSM embed bbox around a point (minLon, minLat, maxLon, maxLat) */
function bboxAround(lat: number, lon: number, delta = 0.008): string {
  const minLon = lon - delta;
  const minLat = lat - delta;
  const maxLon = lon + delta;
  const maxLat = lat + delta;
  return `${minLon},${minLat},${maxLon},${maxLat}`;
}

export function StaticBranchMap({
  latitude,
  longitude,
  mapsUrl,
  className = '',
  height = 160,
  linkLabel = 'Cómo llegar',
}: StaticBranchMapProps) {
  const bbox = bboxAround(latitude, longitude);
  const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${latitude},${longitude}`;

  return (
    <div className={`relative rounded-xl overflow-hidden border shadow-sm bg-muted ${className}`} style={{ height }}>
      <iframe
        title="Ubicación del local"
        src={embedUrl}
        className="absolute inset-0 w-full h-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      {/* Centered Hoppiness pin overlay */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="relative -mt-8">
          <div className="w-10 h-10 rounded-full bg-primary border-2 border-white shadow-md flex items-center justify-center">
            <MapPin className="w-5 h-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
        </div>
      </div>
      {/* Click-through link */}
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute inset-0 flex items-end justify-center pb-3 pointer-events-auto"
      >
        <span className="bg-background/90 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs font-semibold text-primary shadow-sm hover:bg-primary hover:text-primary-foreground transition-colors">
          {linkLabel}
        </span>
      </a>
    </div>
  );
}
