"use client";

import { memo, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { apiFetch, getApiUrl } from '@/lib/api';

export interface FleetMapProject {
  id: string;
  clientName: string;
  locationName: string;
  fullAddress?: string;
  landmark?: string;
  projectDetails?: string;
  projectDescription?: string;
  status: string;
  progress: number;
}

interface Coordinates {
  lat: number;
  lng: number;
  precision?: 'address' | 'area';
  matchedAddress?: string;
}

interface FleetProjectMapProps {
  projects: FleetMapProject[];
  selectedProjectId?: string;
  selectionRevision?: number;
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

function RecenterMap({ coordinates, allCoordinates, selectedProjectId, selectionRevision, markers }: { coordinates?: Coordinates; allCoordinates: Coordinates[]; selectedProjectId?: string; selectionRevision: number; markers: RefObject<Record<string, L.Marker>> }) {
  const map = useMap();

  const lat = coordinates?.lat;
  const lng = coordinates?.lng;
  const hasSelection = lat !== undefined && lng !== undefined;
  useEffect(() => {
    map.closePopup();
    if (lat !== undefined && lng !== undefined) {
      map.invalidateSize({ pan: false });
      map.stop();
      map.setView([lat, lng], 16, { animate: false });
      const frame = window.requestAnimationFrame(() => {
        if (selectedProjectId) markers.current[selectedProjectId]?.openPopup();
      });
      return () => window.cancelAnimationFrame(frame);
    }
  }, [lat, lng, map, selectedProjectId, selectionRevision, markers]);
  useEffect(() => {
    if (!hasSelection && allCoordinates.length) {
      map.fitBounds(allCoordinates.map(item => [item.lat, item.lng]), { padding: [40, 40], maxZoom: 14, animate: false });
    }
  }, [hasSelection, allCoordinates, map]);

  return null;
}

function FleetProjectMap({ projects, selectedProjectId, selectionRevision = 0, onSelectProject }: FleetProjectMapProps) {
  const markers = useRef<Record<string, L.Marker>>({});
  const [coordinatesById, setCoordinatesById] = useState<Record<string, Coordinates>>({});
  const [pendingLocations, setPendingLocations] = useState(0);
  const [locationError, setLocationError] = useState('');
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [unresolvedById, setUnresolvedById] = useState<Record<string, string>>({});
  const projectSignature = projects
    .map((project) => `${project.id}:${project.fullAddress || project.locationName}:${project.landmark || ''}`)
    .join('|');

  useEffect(() => {
    const controller = new AbortController();
    let retryTimer: number | undefined;

    const loadCoordinates = async () => {
      try {
        const response = await apiFetch(`${getApiUrl()}/booking/fleet-locations`, { signal: controller.signal, cache: 'no-store' });
        const result: { success?: boolean; pending?: number; unresolved?: Array<{ booking_id: number; reason: string }>; locations?: Array<{ booking_id: number; lat: number; lng: number; precision?: 'address' | 'area'; matched_address?: string }> } = await response.json();
        if (!response.ok || result.success === false) throw new Error('Unable to load project locations.');
        if (controller.signal.aborted) return;
        const nextCoordinates = Object.fromEntries(
          (result.locations ?? [])
            .filter(location => location.lat != null && location.lng != null && Number.isFinite(Number(location.lat)) && Number.isFinite(Number(location.lng)) && Math.abs(Number(location.lat)) <= 90 && Math.abs(Number(location.lng)) <= 180)
            .map(location => [String(location.booking_id), { lat: Number(location.lat), lng: Number(location.lng), precision: location.precision, matchedAddress: location.matched_address }])
        );
        setPendingLocations(result.pending ?? 0);
        setUnresolvedById(Object.fromEntries((result.unresolved ?? []).map(item => [String(item.booking_id), item.reason])));
        setLocationsLoading(false);
        setLocationError('');
        retryTimer = window.setTimeout(() => void loadCoordinates(), result.pending ? 2000 : 30000);
        setCoordinatesById((current) =>
          JSON.stringify(current) === JSON.stringify(nextCoordinates) ? current : nextCoordinates
        );
      } catch {
        if (!controller.signal.aborted) {
          setLocationsLoading(false);
          setLocationError('Unable to load project locations. Retrying automatically.');
          retryTimer = window.setTimeout(() => void loadCoordinates(), 10000);
        }
      }
    };

    void loadCoordinates();

    return () => {
      controller.abort();
      window.clearTimeout(retryTimer);
    };
  }, [projectSignature]);

  const selectedCoordinates = selectedProjectId ? coordinatesById[selectedProjectId] : undefined;
  const selectedProject = projects.find(project => project.id === selectedProjectId);
  const allCoordinates = useMemo(() => projects.flatMap(project => coordinatesById[project.id] ? [coordinatesById[project.id]] : []), [projects, coordinatesById]);
  const locatedProjects = useMemo(
    () => projects.filter((project) => coordinatesById[project.id]),
    [projects, coordinatesById]
  );

  return (
    <div className="relative isolate z-0 h-[360px] sm:h-[430px] w-full">
    <MapContainer center={PHILIPPINES_CENTER} zoom={6} scrollWheelZoom={false} dragging={false} touchZoom={false} className="h-full w-full">
      <MapGestures />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <RecenterMap coordinates={selectedCoordinates} allCoordinates={allCoordinates} selectedProjectId={selectedProjectId} selectionRevision={selectionRevision} markers={markers} />
      {locatedProjects.map((project) => {
        const coordinates = coordinatesById[project.id];
        return (
          <Marker
            key={project.id}
            ref={marker => { if (marker) markers.current[project.id] = marker; else delete markers.current[project.id]; }}
            position={[coordinates.lat, coordinates.lng]}
            icon={redPinIcon}
            title={`Project #${project.id}: ${project.clientName}`}
            eventHandlers={{ click: () => onSelectProject(project.id) }}
          >
            <Popup className="fleet-project-popup" minWidth={160} maxWidth={280} autoPanPadding={[12, 12]}>
              <div className="fleet-project-details">
                <p className="fleet-project-ref">Project #{project.id}</p>
                <h2>{project.clientName}</h2>
                <p className="fleet-project-service">{project.projectDetails || 'Client project'}</p>

                {coordinates.precision === 'area' && <p className="fleet-location-accuracy">Approximate area location</p>}
                <dl>


                  <div><dt>Status</dt><dd>{project.status}</dd></div>
                  <div><dt>Progress</dt><dd>{project.progress}% complete</dd></div>
                </dl><button type="button" className="fleet-popup-details-button" aria-controls="fleet-selected-project-details" onClick={()=>{onSelectProject(project.id);document.getElementById('fleet-selected-project-details')?.scrollIntoView({behavior:'smooth',block:'start'});}}>View full project details</button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
    {locationError ? <p role="alert" className="fleet-location-notice">{locationError}</p> : selectedProject && !selectedCoordinates ? (
      <p role="status" className="fleet-location-notice">{locationsLoading || pendingLocations > 0 ? 'Locating' : unresolvedById[selectedProject.id] === 'unavailable' ? 'Map lookup temporarily unavailable for' : 'Address needs map confirmation for'} {selectedProject.clientName}, project #{selectedProject.id}.{!locationsLoading && pendingLocations === 0 && ' The booking details are saved; an exact map match is not available yet.'}</p>
    ) : pendingLocations > 0 ? <p role="status" className="fleet-location-notice">Locating {pendingLocations} more project {pendingLocations === 1 ? 'address' : 'addresses'}...</p> : null}

    </div>
  );
}

export default memo(FleetProjectMap);
