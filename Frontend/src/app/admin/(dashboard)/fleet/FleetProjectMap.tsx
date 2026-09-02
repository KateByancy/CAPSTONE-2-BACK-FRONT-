"use client";

import { useEffect, useMemo, useState } from 'react';
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

function RecenterMap({ coordinates, allCoordinates }: { coordinates?: Coordinates; allCoordinates: Coordinates[] }) {
  const map = useMap();

  useEffect(() => {
    if (coordinates) {
      map.flyTo([coordinates.lat, coordinates.lng], 16, { duration: 1.2 });
    } else if (allCoordinates.length) {
      map.fitBounds(allCoordinates.map((item) => [item.lat, item.lng]), { padding: [40, 40], maxZoom: 14 });
    }
  }, [coordinates, allCoordinates, map]);

  return null;
}

export default function FleetProjectMap({ projects, selectedProjectId, onSelectProject }: FleetProjectMapProps) {
  const [coordinatesById, setCoordinatesById] = useState<Record<string, Coordinates>>({});
  const projectSignature = projects
    .map((project) => `${project.id}:${project.fullAddress || project.locationName}:${project.landmark || ''}`)
    .join('|');

  useEffect(() => {
    let cancelled = false;

    const loadCoordinates = async () => {
      try {
        const response = await fetch(`${getApiUrl()}/booking/fleet-locations`);
        const result: { success?: boolean; locations?: Array<{ booking_id: number; lat: number; lng: number }> } = await response.json();
        if (!response.ok || cancelled) return;
        const nextCoordinates = Object.fromEntries(
          (result.locations ?? []).map((location) => [String(location.booking_id), { lat: location.lat, lng: location.lng }])
        );
        setCoordinatesById((current) =>
          JSON.stringify(current) === JSON.stringify(nextCoordinates) ? current : nextCoordinates
        );
      } catch {
        // Keep the map usable if the location service is temporarily unavailable.
      }
    };

    void loadCoordinates();
    const retryTimer = window.setInterval(() => void loadCoordinates(), 10000);
    return () => {
      cancelled = true;
      window.clearInterval(retryTimer);
    };
  }, [projectSignature]);

  const selectedCoordinates = selectedProjectId ? coordinatesById[selectedProjectId] : undefined;
  const allCoordinates = useMemo(() => Object.values(coordinatesById), [coordinatesById]);
  const locatedProjects = useMemo(
    () => projects.filter((project) => coordinatesById[project.id]),
    [projects, coordinatesById]
  );

  return (
    <MapContainer center={PHILIPPINES_CENTER} zoom={6} scrollWheelZoom className="h-full min-h-[430px] w-full">
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
              <div className="min-w-52 space-y-1 text-xs">
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
  );
}
