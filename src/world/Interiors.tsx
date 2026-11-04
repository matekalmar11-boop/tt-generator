/** Kulissen für Alltags-/Erklär-Geschichten: neutrale Bühne und Innenraum (alles aus Blöcken, wie die übrigen Kulissen). */
import React from 'react';
import {Box, Glow} from '../lib/Box';
import {shade} from '../lib/color';

/* ---------- Neutrale Bühne: Farbverlauf-Hintergrund + Bodenplatte mit feinem Raster ---------- */
export const EmptyStage: React.FC<{floor?: string; grid?: boolean; accent?: string}> = ({floor = '#3a3f5c', grid = true, accent = '#7fe8ff'}) => (
  <group>
    <Box p={[0, -0.2, 0]} s={[34, 0.4, 34]} c={shade(floor, 0.7)} cast={false} />
    <Box p={[0, -0.02, 0]} s={[30, 0.04, 30]} c={floor} cast={false} />
    {grid && Array.from({length: 15}, (_, i) => {
      const x = -14 + i * 2;
      return (
        <React.Fragment key={i}>
          <Box p={[x, 0.01, 0]} s={[0.04, 0.02, 30]} c={shade(floor, 1.25)} cast={false} recv={false} />
          <Box p={[0, 0.01, x]} s={[30, 0.02, 0.04]} c={shade(floor, 1.25)} cast={false} recv={false} />
        </React.Fragment>
      );
    })}
    {/* leuchtender Rand der Bühne */}
    <Glow p={[0, 0.0, -15]} s={[30, 0.06, 0.08]} c={accent} />
    <Glow p={[0, 0.0, 15]} s={[30, 0.06, 0.08]} c={accent} />
    <Glow p={[-15, 0.0, 0]} s={[0.08, 0.06, 30]} c={accent} />
    <Glow p={[15, 0.0, 0]} s={[0.08, 0.06, 30]} c={accent} />
  </group>
);

/* ---------- Innenraum (Küche/Wohnraum): Rückwand + zwei Seitenwände, Vorderseite offen für die Kamera ---------- */
export const RoomSet: React.FC<{wall?: string; floor?: string; trim?: string; accent?: string; window?: boolean; furniture?: boolean}> =
  ({wall = '#d9c9a8', floor = '#9a6b43', trim = '#f4efe6', accent = '#c4553d', window: win = true, furniture = true}) => (
    <group>
      {/* Boden: Dielen entlang z */}
      {Array.from({length: 15}, (_, i) => (
        <Box key={i} p={[-7 + i, -0.1, 6]} s={[0.97, 0.2, 20]} c={i % 2 ? floor : shade(floor, 0.9)} cast={false} />
      ))}
      {/* Wände */}
      <Box p={[0, 3.5, -4.1]} s={[14.4, 7, 0.2]} c={wall} />
      <Box p={[-7.1, 3.5, 6]} s={[0.2, 7, 20]} c={shade(wall, 0.92)} />
      <Box p={[7.1, 3.5, 6]} s={[0.2, 7, 20]} c={shade(wall, 0.92)} />
      <Box p={[0, 0.25, -3.95]} s={[14, 0.5, 0.1]} c={trim} />
      <Box p={[-6.95, 0.25, 6]} s={[0.1, 0.5, 20]} c={trim} />
      <Box p={[6.95, 0.25, 6]} s={[0.1, 0.5, 20]} c={trim} />
      {win && (
        <group position={[-3.2, 4.2, -3.95]}>
          <Box s={[3.4, 2.8, 0.12]} c={trim} />
          <Glow p={[0, 0, 0.07]} s={[3.0, 2.4, 0.02]} c="#bfe0ff" />
          <Box p={[0, 0, 0.09]} s={[0.12, 2.4, 0.06]} c={trim} />
          <Box p={[0, 0, 0.09]} s={[3.0, 0.12, 0.06]} c={trim} />
          <pointLight position={[0, -0.4, 2.5]} color="#cfe3ff" intensity={22} distance={16} decay={1.6} />
        </group>
      )}
      {furniture && (
        <>
          {/* Tisch (Platte 1.05 hoch) */}
          <Box p={[0, 1.0, -1.8]} s={[3.4, 0.14, 1.7]} c="#8a5a35" />
          {([[-1.55, -2.5], [1.55, -2.5], [-1.55, -1.1], [1.55, -1.1]] as const).map(([x, z], i) => <Box key={i} p={[x, 0.47, z]} s={[0.16, 0.94, 0.16]} c="#6b4226" />)}
          {/* Stühle bei x = -1 und 1, Sitzfläche 0.6 hoch; sitzende Person: at [x,0,-0.45], yaw pi */}
          {[-1, 1].map((x) => (
            <group key={x} position={[x, 0, -0.4]}>
              <Box p={[0, 0.55, 0]} s={[0.9, 0.1, 0.9]} c={accent} />
              <Box p={[0, 1.1, 0.42]} s={[0.9, 1.0, 0.1]} c={accent} />
              {([[-0.38, -0.38], [0.38, -0.38], [-0.38, 0.38], [0.38, 0.38]] as const).map(([dx, dz], i) => <Box key={i} p={[dx, 0.25, dz]} s={[0.1, 0.5, 0.1]} c="#5a3a22" />)}
            </group>
          ))}
          {/* Küchenzeile rechts */}
          <Box p={[5, 0.6, -3.2]} s={[3.6, 1.2, 1.3]} c={shade(wall, 0.75)} />
          <Box p={[5, 1.25, -3.2]} s={[3.8, 0.1, 1.4]} c="#cfd3d8" metal={0.3} rough={0.5} />
          <Box p={[5.9, 0.55, -2.52]} s={[1.2, 0.8, 0.04]} c="#2b2b33" />
          <Glow p={[5.9, 0.7, -2.49]} s={[0.9, 0.35, 0.01]} c="#ffb24d" />
          {/* Regal links */}
          <Box p={[-5.6, 2.2, -3.55]} s={[2.4, 0.1, 0.8]} c="#8a5a35" />
          <Box p={[-5.6, 3.3, -3.55]} s={[2.4, 0.1, 0.8]} c="#8a5a35" />
          <Box p={[-5.6, 2.45, -3.55]} s={[0.35, 0.4, 0.35]} c={accent} />
          <Box p={[-4.9, 3.55, -3.55]} s={[0.4, 0.4, 0.4]} c="#6fa98f" />
          {/* Bild und Lampe */}
          <Box p={[1.0, 4.4, -3.95]} s={[1.6, 1.2, 0.08]} c="#4a3426" />
          <Box p={[1.0, 4.4, -3.9]} s={[1.4, 1.0, 0.04]} c="#8fb7d6" />
          <Box p={[0, 5.6, -1.8]} s={[0.05, 1.4, 0.05]} c="#333" />
          <Glow p={[0, 4.8, -1.8]} s={[0.7, 0.5, 0.7]} c="#ffe9b0" />
          <pointLight position={[0, 4.6, -1.8]} color="#ffd89a" intensity={18} distance={14} decay={1.6} />
        </>
      )}
    </group>
  );
