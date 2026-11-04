/** STUDIE: GLB-Figur (KayKit Rogue, CC0) mit deterministisch pro Bild gesetzter Skelett-Animation. */
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useLoader} from '@react-three/fiber';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';
import {staticFile} from 'remotion';

const HIDE = ['Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 'Knife', 'Throwable']; // Waffen, die im Modell mitgeliefert werden

export const GlbCharacter: React.FC<{url: string; clip: string; t: number; targetHeight?: number; position?: [number, number, number]; rotationY?: number}> =
  ({url, clip, t, targetHeight = 3.1, position = [0, 0, 0], rotationY = 0}) => {
    const gltf = useLoader(GLTFLoader, staticFile(url));
    const {root, mixer} = useMemo(() => {
      const root = clone(gltf.scene);
      root.traverse((o) => {
        if (HIDE.includes(o.name)) o.visible = false;
        if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; (o as THREE.Mesh).frustumCulled = false; }
      });
      return {root, mixer: new THREE.AnimationMixer(root)};
    }, [gltf]);
    const c = gltf.animations.find((a) => a.name === clip);
    if (!c) throw new Error(`Animation "${clip}" nicht im Modell (vorhanden: ${gltf.animations.map((a) => a.name).slice(0, 12).join(', ')} …)`);
    mixer.stopAllAction();
    mixer.clipAction(c, root).play();
    mixer.setTime(t);           // deterministisch: Pose hängt nur von t ab
    root.updateMatrixWorld(true);
    const s = targetHeight / 2.19;   // Kopfhöhe des Modells in Modelleinheiten
    return <group position={position} rotation={[0, rotationY, 0]} scale={s}><primitive object={root} /></group>;
  };
