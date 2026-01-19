import { useState, useCallback, useRef, useEffect } from 'react';
import {
  GoogleMap,
  useJsApiLoader,
  DrawingManager,
  Polygon,
  Circle,
  Marker,
} from '@react-google-maps/api';
import { Button } from '@/components/ui/button';
import { Trash2, Circle as CircleIcon, Hexagon, RefreshCw } from 'lucide-react';

const libraries: ("drawing" | "geometry" | "places")[] = ['drawing', 'geometry'];

interface ZoneShape {
  type: 'polygon' | 'circle';
  // For polygon: array of {lat, lng}
  // For circle: {center: {lat, lng}, radius: number}
  coordinates: any;
}

interface DeliveryZoneMapProps {
  branchLocation?: { lat: number; lng: number };
  branchName?: string;
  initialShape?: ZoneShape | null;
  onShapeChange: (shape: ZoneShape | null) => void;
  readOnly?: boolean;
}

const mapContainerStyle = {
  width: '100%',
  height: '400px',
};

// Default to Córdoba, Argentina
const defaultCenter = {
  lat: -31.4201,
  lng: -64.1888,
};

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
};

const polygonOptions: google.maps.PolygonOptions = {
  fillColor: '#3b82f6',
  fillOpacity: 0.3,
  strokeColor: '#1d4ed8',
  strokeWeight: 2,
  editable: true,
  draggable: true,
};

const circleOptions: google.maps.CircleOptions = {
  fillColor: '#3b82f6',
  fillOpacity: 0.3,
  strokeColor: '#1d4ed8',
  strokeWeight: 2,
  editable: true,
  draggable: true,
};

// Inner component that only renders once we have the API key
function DeliveryZoneMapInner({
  apiKey,
  branchLocation,
  branchName,
  initialShape,
  onShapeChange,
  readOnly = false,
}: DeliveryZoneMapProps & { apiKey: string }) {
  const [currentShape, setCurrentShape] = useState<google.maps.Polygon | google.maps.Circle | null>(null);
  const [drawingMode, setDrawingMode] = useState<'polygon' | 'circle' | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries,
  });

  const center = branchLocation || defaultCenter;

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const clearCurrentShape = () => {
    if (currentShape) {
      currentShape.setMap(null);
      setCurrentShape(null);
      onShapeChange(null);
    }
  };

  const handlePolygonComplete = useCallback((polygon: google.maps.Polygon) => {
    clearCurrentShape();
    setCurrentShape(polygon);
    setDrawingMode(null);

    const path = polygon.getPath();
    const coordinates = path.getArray().map(latLng => ({
      lat: latLng.lat(),
      lng: latLng.lng(),
    }));

    onShapeChange({ type: 'polygon', coordinates });

    // Listen for edits
    google.maps.event.addListener(path, 'set_at', () => {
      const newCoords = path.getArray().map(latLng => ({
        lat: latLng.lat(),
        lng: latLng.lng(),
      }));
      onShapeChange({ type: 'polygon', coordinates: newCoords });
    });

    google.maps.event.addListener(path, 'insert_at', () => {
      const newCoords = path.getArray().map(latLng => ({
        lat: latLng.lat(),
        lng: latLng.lng(),
      }));
      onShapeChange({ type: 'polygon', coordinates: newCoords });
    });
  }, [onShapeChange]);

  const handleCircleComplete = useCallback((circle: google.maps.Circle) => {
    clearCurrentShape();
    setCurrentShape(circle);
    setDrawingMode(null);

    const center = circle.getCenter();
    const radius = circle.getRadius();

    onShapeChange({
      type: 'circle',
      coordinates: {
        center: { lat: center?.lat() || 0, lng: center?.lng() || 0 },
        radius,
      },
    });

    // Listen for edits
    google.maps.event.addListener(circle, 'radius_changed', () => {
      const c = circle.getCenter();
      onShapeChange({
        type: 'circle',
        coordinates: {
          center: { lat: c?.lat() || 0, lng: c?.lng() || 0 },
          radius: circle.getRadius(),
        },
      });
    });

    google.maps.event.addListener(circle, 'center_changed', () => {
      const c = circle.getCenter();
      onShapeChange({
        type: 'circle',
        coordinates: {
          center: { lat: c?.lat() || 0, lng: c?.lng() || 0 },
          radius: circle.getRadius(),
        },
      });
    });
  }, [onShapeChange]);

  if (loadError) {
    return (
      <div className="w-full h-[400px] bg-muted rounded-lg flex items-center justify-center">
        <p className="text-destructive">Error al cargar Google Maps</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-[400px] bg-muted rounded-lg flex items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!readOnly && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={drawingMode === 'polygon' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDrawingMode(drawingMode === 'polygon' ? null : 'polygon')}
          >
            <Hexagon className="h-4 w-4 mr-1" />
            Dibujar Polígono
          </Button>
          <Button
            type="button"
            variant={drawingMode === 'circle' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDrawingMode(drawingMode === 'circle' ? null : 'circle')}
          >
            <CircleIcon className="h-4 w-4 mr-1" />
            Dibujar Círculo
          </Button>
          {currentShape && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={clearCurrentShape}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Borrar Zona
            </Button>
          )}
        </div>
      )}

      <div className="rounded-lg overflow-hidden border">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={14}
          options={mapOptions}
          onLoad={onMapLoad}
        >
          {/* Branch marker */}
          {branchLocation && (
            <Marker
              position={branchLocation}
              title={branchName || 'Sucursal'}
              icon={{
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="#1d4ed8" stroke="white" stroke-width="1.5">
                    <path d="M3 21h18M5 21V7l8-4 8 4v14M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"/>
                  </svg>
                `),
                scaledSize: new google.maps.Size(40, 40),
                anchor: new google.maps.Point(20, 40),
              }}
            />
          )}

          {/* Drawing manager */}
          {!readOnly && drawingMode && (
            <DrawingManager
              drawingMode={
                drawingMode === 'polygon'
                  ? google.maps.drawing.OverlayType.POLYGON
                  : google.maps.drawing.OverlayType.CIRCLE
              }
              options={{
                drawingControl: false,
                polygonOptions,
                circleOptions,
              }}
              onPolygonComplete={handlePolygonComplete}
              onCircleComplete={handleCircleComplete}
            />
          )}

          {/* Render initial shape if provided and no current shape */}
          {initialShape && !currentShape && (
            <>
              {initialShape.type === 'polygon' && (
                <Polygon
                  paths={initialShape.coordinates}
                  options={{
                    ...polygonOptions,
                    editable: !readOnly,
                    draggable: !readOnly,
                  }}
                  onLoad={(polygon) => {
                    if (!readOnly) {
                      setCurrentShape(polygon);
                    }
                  }}
                />
              )}
              {initialShape.type === 'circle' && (
                <Circle
                  center={initialShape.coordinates.center}
                  radius={initialShape.coordinates.radius}
                  options={{
                    ...circleOptions,
                    editable: !readOnly,
                    draggable: !readOnly,
                  }}
                  onLoad={(circle) => {
                    if (!readOnly) {
                      setCurrentShape(circle);
                    }
                  }}
                />
              )}
            </>
          )}
        </GoogleMap>
      </div>

      {!readOnly && (
        <p className="text-xs text-muted-foreground">
          Seleccioná una herramienta y dibujá la zona en el mapa. Podés editar los puntos arrastrándolos.
        </p>
      )}
    </div>
  );
}

// Wrapper component that fetches API key first
export default function DeliveryZoneMap(props: DeliveryZoneMapProps) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState(true);

  // Fetch API key from edge function with auth
  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        // Import supabase to get session
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.error('No authenticated session for Google Maps API');
          setLoadingKey(false);
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-maps-key`,
          {
            headers: {
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              'Authorization': `Bearer ${session.access_token}`,
            },
          }
        );
        const data = await response.json();
        if (data.apiKey) {
          setApiKey(data.apiKey);
        }
      } catch (error) {
        console.error('Error fetching Google Maps API key:', error);
      } finally {
        setLoadingKey(false);
      }
    };
    fetchApiKey();
  }, []);

  if (loadingKey) {
    return (
      <div className="w-full h-[400px] bg-muted rounded-lg flex items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="w-full h-[400px] bg-muted rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">API key de Google Maps no configurada</p>
      </div>
    );
  }

  return <DeliveryZoneMapInner {...props} apiKey={apiKey} />;
}
