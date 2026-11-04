/** Tür mit Klinke für Szenen wie "Die Nachricht von morgen": Vorderseite zeigt zur Kamera (+z). handle: 0..1 (Klinke drückt nach unten), light: Licht unter der Tür. */
import React from 'react';
import {Glow} from '../lib/Box';
import {shade} from '../lib/color';
import {RBox} from './RBox';

export const Door: React.FC<{position?: [number, number, number]; handle?: number; light?: number; color?: string; door?: string}> =
  ({position = [0, 0, 0], handle = 0, light = 0, color = '#b9bec9', door = '#6b4a34'}) => {
    const rot = -Math.min(1, Math.max(0, handle)) * 0.62;      // Klinke dreht sich nach unten
    return (
      <group position={position}>
        <RBox p={[0, 3.55, -0.12]} s={[3.9, 7.1, 0.3]} c={shade(door, 0.55)} r={0.05} outline={0.02} />    {/* Zarge */}
        <RBox p={[0, 3.35, 0]} s={[3.2, 6.7, 0.22]} c={door} r={0.06} outline={0.02} />
        <RBox p={[0, 4.5, 0.13]} s={[2.4, 2.4, 0.05]} c={shade(door, 0.88)} r={0.04} outline={0.012} />    {/* Füllung oben */}
        <RBox p={[0, 1.75, 0.13]} s={[2.4, 2.2, 0.05]} c={shade(door, 0.88)} r={0.04} outline={0.012} />   {/* Füllung unten */}
        <RBox p={[1.15, 3.2, 0.17]} s={[0.34, 1.0, 0.07]} c={shade(color, 0.8)} r={0.06} outline={0.012} /> {/* Schild */}
        <group position={[1.15, 3.3, 0.24]} rotation={[0, 0, rot]}>                                         {/* Klinke: Drehpunkt = Rosette */}
          <RBox p={[0, 0, 0]} s={[0.26, 0.26, 0.12]} c={color} r={0.1} outline={0.012} />
          <RBox p={[-0.5, 0, 0.12]} s={[1.0, 0.16, 0.16]} c={color} r={0.07} outline={0.012} />
        </group>
        <Glow p={[0, 0.03, 0.12]} s={[3.0 * (0.3 + 0.7 * light), 0.07, 0.02]} c="#dfe8ff" opacity={Math.min(1, light * 1.2)} />
        <pointLight position={[0, 0.25, 0.9]} color="#cfe0ff" intensity={light * 14} distance={7} decay={1.6} />
      </group>
    );
  };
