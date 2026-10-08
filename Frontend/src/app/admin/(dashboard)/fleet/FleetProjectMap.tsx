"use client";

import { memo, useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { getApiUrl } from '@/lib/api';

export interface FleetMapProject {
  id: string;
  clientName: string;
  locationName: string;
  fullAddress?: string;
  landmark?: string;
  projectDetails?: string;
  status: string;
  progress: number;
}

interface Coordinates {
  lat: number;
  lng: number;
}

interface FleetProjectMapProps {
  projects: FleetMapProject[];
  selectedProjectId?: string;
  onSelectProject: (projectId: string) => void;
}

const PHILIPPINES_CENTER: [number, number] = [12.8797, 121.774];

const redPinIcon = L.divIcon({
  className: 'fleet-red-pin',
  html: '<span style="display:block;width:24px;height:24px;background:#dc2626;border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 8px rgba(0,0,0,.4)"><span style="display:block;width:7px;height:7px;margin:5.5px;background:white;border-radius:9999px"></span></span>',
  iconSize: [30, 40],
  iconAnchor: [15, 36],
  popupAnchor: [0, -36],
});

function MapGestures() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    let midpoint: L.Point | null = null;
    const touchStart = (event: TouchEvent) => {
      map.dragging.disable();
      if (event.touches.length === 2) event.preventDefault();
      midpoint = event.touches.length === 2 ? L.point((event.touches[0].clientX + event.touches[1].clientX) / 2, (event.touches[0].clientY + event.touches[1].clientY) / 2) : null;
    };
    const touchMove = (event: TouchEvent) => {
      if (event.touches.length !== 2 || !midpoint) return;
      event.preventDefault();
      const next = L.point((event.touches[0].clientX + event.touches[1].clientX) / 2, (event.touches[0].clientY + event.touches[1].clientY) / 2);
      map.panBy(midpoint.subtract(next), { animate: false });
      midpoint = next;
    };
    const touchEnd = (event: TouchEvent) => {
      if (event.touches.length < 2) { midpoint = null; map.dragging.disable(); }
    };
    const mouseStart = () => map.dragging.enable();
    container.style.touchAction = 'pan-y';
    container.addEventListener('touchstart', touchStart, { passive: false, capture: true });
    container.addEventListener('touchmove', touchMove, { passive: false });
    container.addEventListener('touchend', touchEnd, { passive: true });
    container.addEventListener('touchcancel', touchEnd, { passive: true });
    container.addEventListener('mousedown', mouseStart);
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => {
      observer.disconnect();
      container.removeEventListener('touchstart', touchStart, true);
      container.removeEventListener('touchmove', touchMove);
      container.removeEventListener('touchend', touchEnd);
      container.removeEventListener('touchcancel', touchEnd);
      container.removeEventListener('mousedown', mouseStart);
    };
  }, [map]);
  return null;
}

function RecenterMap({ coordinates, allCoordinates }: { coordinates?: Coordinates; allCoordinates: Coordinates[] }) {
  const map = useMap();

  const lat = coordinates?.lat;
  const lng = coordinates?.lng;
  const hasSelection = lat !== undefined && lng !== undefined;
  useEffect(() => {
    if (lat !== undefined && lng !== undefined) map.setView([lat, lng], 16, { animate: false });
  }, [lat, lng, map]);
  useEffect(() => {
    if (!hasSelection && allCoordinates.length) {
      map.fitBounds(allCoordinates.map(item => [item.lat, item.lng]), { padding: [40, 40], maxZoom: 14 });
    }
  }, [hasSelection, allCoordinates, map]);

  return null;
}

function FleetProjectMap({ projects, selectedProjectId, onSelectProject }: FleetProjectMapProps) {
  const [coordinatesById, setCoordinatesById] = useState<Record<string, Coordinates>>({});
  const [pendingLocations, setPendingLocations] = useState(0);
  const projectSignature = projects
    .map((project) => `${project.id}:${project.fullAddress || project.locationName}:${project.landmark || ''}`)
    .join('|');

  useEffect(() => {
    const controller = new AbortController();
    let retryTimer: number | undefined;

    const loadCoordinates = async () => {
      try {
        const response = await fetch(`${getApiUrl()}/booking/fleet-locations`, { signal: controller.signal, cache: 'no-store' });
        const result: { success?: boolean; pending?: number; locations?: Array<{ booking_id: number; lat: number; lng: number }> } = await response.json();
        if (!response.ok) throw new Error('Unable to load project locations.');
        if (controller.signal.aborted) return;
        const nextCoordinates = Object.fromEntries(
          (result.locations ?? []).map((location) => [String(location.booking_id), { lat: location.lat, lng: location.lng }])
        );
        setPendingLocations(result.pending ?? 0);
        retryTimer = window.setTimeout(() => void loadCoordinates(), result.pending ? 2000 : 30000);
        setCoordinatesById((current) =>
          JSON.stringify(current) === JSON.stringify(nextCoordinates) ? current : nextCoordinates
        );
      } catch {
        if (!controller.signal.aborted) retryTimer = window.setTimeout(() => void loadCoordinates(), 10000);
      }
    };

    void loadCoordinates();

    return () => {
      controller.abort();
      window.clearTimeout(retryTimer);
    };
  }, [projectSignature]);

  const selectedCoordinates = selectedProjectId ? coordinatesById[selectedProjectId] : undefined;
  const allCoordinates = useMemo(() => Object.values(coordinatesById), [coordinatesById]);
  const locatedProjects = useMemo(
    () => projects.filter((project) => coordinatesById[project.id]),
    [projects, coordinatesById]
  );

  return (
    <div className="relative isolate z-0 h-[340px] sm:h-[430px] w-full">
    <MapContainer center={PHILIPPINES_CENTER} zoom={6} scrollWheelZoom={false} dragging={false} touchZoom={false} className="h-full w-full">
      <MapGestures />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <RecenterMap coordinates={selectedCoordinates} allCoordinates={allCoordinates} />
      {locatedProjects.map((project) => {
        const coordinates = coordinatesById[project.id];
        return (
          <Marker
            key={project.id}
            position={[coordinates.lat, coordinates.lng]}
            icon={redPinIcon}
            eventHandlers={{ click: () => onSelectProject(project.id) }}
          >
            <Popup>
              <div className="w-44 max-w-[60vw] space-y-1 break-words text-xs">
                <p className="text-sm font-bold text-slate-900">{project.clientName}</p>
                <p className="font-semibold text-red-600">{project.projectDetails || 'Client project'}</p>
                <p><strong>Address:</strong> {project.locationName}</p>
                {project.landmark && <p><strong>Landmark:</strong> {project.landmark}</p>}
                <p><strong>Status:</strong> {project.status}</p>
                <p><strong>Progress:</strong> {project.progress}%</p>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
    {pendingLocations > 0 && <p role="status" className="absolute bottom-7 left-3 z-[1000] rounded-lg bg-white/95 px-3 py-2 text-xs text-slate-600 shadow">Locating {pendingLocations} project {pendingLocations === 1 ? 'address' : 'addresses'}...</p>}
    </div>
  );
}

export default memo(FleetProjectMap);
