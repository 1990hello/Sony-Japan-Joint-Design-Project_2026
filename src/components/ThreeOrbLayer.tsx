import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export interface ThreeOrbFrame {
  x: number;
  y: number;
  radius: number;
  time: number;
  visible: boolean;
  isDocked: boolean;
  rendererReady: boolean;
}

interface ThreeOrbLayerProps {
  frameRef: { current: ThreeOrbFrame };
}

/**
 * Transparent Three.js rendering layer for the EXORA orb.
 * Position and scale are driven by OrbCanvas' existing 2D physics state,
 * so this first 3D milestone does not change interaction behaviour.
 */
export const ThreeOrbLayer: React.FC<ThreeOrbLayerProps> = ({ frameRef }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let animationId = 0;
    let auraTexture: THREE.CanvasTexture | null = null;

    try {
      const width = Math.max(1, window.innerWidth);
      const height = Math.max(1, window.innerHeight);

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(
        -width / 2,
        width / 2,
        height / 2,
        -height / 2,
        0.1,
        100
      );
      camera.position.set(0, 0, 24);
      camera.lookAt(0, 0, 0);

      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.setSize(width, height, false);
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      renderer.domElement.style.position = 'absolute';
      renderer.domElement.style.inset = '0';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.pointerEvents = 'none';
      mount.appendChild(renderer.domElement);

      const orbGroup = new THREE.Group();
      scene.add(orbGroup);

      scene.add(new THREE.AmbientLight(0xffe8cb, 1.35));

      const keyLight = new THREE.PointLight(0xffe1b1, 2.8, 5);
      keyLight.position.set(-0.7, 0.9, 1.8);
      orbGroup.add(keyLight);

      const coolRimLight = new THREE.PointLight(0xb8d7ff, 1.2, 4);
      coolRimLight.position.set(1.1, -0.6, -0.8);
      orbGroup.add(coolRimLight);

      // Soft halo behind the glass volume.
      const auraCanvas = document.createElement('canvas');
      auraCanvas.width = 128;
      auraCanvas.height = 128;
      const auraContext = auraCanvas.getContext('2d');
      if (auraContext) {
        const gradient = auraContext.createRadialGradient(64, 64, 4, 64, 64, 64);
        gradient.addColorStop(0, 'rgba(255, 225, 175, 0.62)');
        gradient.addColorStop(0.34, 'rgba(246, 198, 132, 0.26)');
        gradient.addColorStop(0.72, 'rgba(168, 196, 238, 0.08)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        auraContext.fillStyle = gradient;
        auraContext.fillRect(0, 0, 128, 128);
      }
      auraTexture = new THREE.CanvasTexture(auraCanvas);
      const aura = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: auraTexture,
          transparent: true,
          opacity: 0.72,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      aura.scale.set(4.5, 4.5, 1);
      aura.position.z = -0.55;
      orbGroup.add(aura);

      // Inner warm light gives the sphere a visible centre even over a bright webcam image.
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.56, 40, 32),
        new THREE.MeshBasicMaterial({
          color: 0xffd18a,
          transparent: true,
          opacity: 0.24,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      core.position.z = 0.08;
      orbGroup.add(core);

      const coreHighlight = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 32, 24),
        new THREE.MeshBasicMaterial({
          color: 0xfff2d8,
          transparent: true,
          opacity: 0.48,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      coreHighlight.position.set(-0.12, 0.14, 0.36);
      orbGroup.add(coreHighlight);

      // Physical glass shell with a fine warm edge highlight.
      const glassShell = new THREE.Mesh(
        new THREE.SphereGeometry(1, 64, 48),
        new THREE.MeshPhysicalMaterial({
          color: 0xf4e6d3,
          metalness: 0.03,
          roughness: 0.075,
          transmission: 0.42,
          thickness: 0.8,
          ior: 1.24,
          transparent: true,
          opacity: 0.48,
          clearcoat: 1,
          clearcoatRoughness: 0.035,
          side: THREE.FrontSide,
        })
      );
      orbGroup.add(glassShell);

      const rim = new THREE.Mesh(
        new THREE.SphereGeometry(1.008, 64, 48),
        new THREE.MeshBasicMaterial({
          color: 0xffedcf,
          transparent: true,
          opacity: 0.12,
          side: THREE.BackSide,
          depthWrite: false,
        })
      );
      orbGroup.add(rim);

      // Three slow orbital filaments provide depth rather than a flat painted pattern.
      const filamentGroup = new THREE.Group();
      orbGroup.add(filamentGroup);
      const filamentColors = [0xffe7bd, 0xd5e6ff, 0xffd08a];
      for (let index = 0; index < 3; index++) {
        const curvePoints: THREE.Vector3[] = [];
        for (let step = 0; step <= 180; step++) {
          const angle = (step / 180) * Math.PI * 2;
          const latitude = Math.sin(angle * 2 + index * 2.05) * 0.32;
          const ringRadius = 0.66;
          curvePoints.push(
            new THREE.Vector3(
              Math.cos(angle) * Math.cos(latitude) * ringRadius,
              Math.sin(angle) * Math.cos(latitude) * ringRadius,
              Math.sin(latitude) * ringRadius
            )
          );
        }
        const curve = new THREE.CatmullRomCurve3(curvePoints);
        const filament = new THREE.Mesh(
          new THREE.TubeGeometry(curve, 180, 0.0065, 5, false),
          new THREE.MeshBasicMaterial({
            color: filamentColors[index],
            transparent: true,
            opacity: index === 1 ? 0.58 : 0.76,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
        );
        filamentGroup.add(filament);
      }

      const equator = new THREE.Mesh(
        new THREE.TorusGeometry(0.94, 0.006, 6, 128),
        new THREE.MeshBasicMaterial({
          color: 0xfff0d7,
          transparent: true,
          opacity: 0.34,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      equator.rotation.x = Math.PI * 0.5;
      filamentGroup.add(equator);

      // Fine points of light drift inside the sphere.
      const particlePositions = new Float32Array(180 * 3);
      for (let index = 0; index < 180; index++) {
        const z = Math.random() * 2 - 1;
        const angle = Math.random() * Math.PI * 2;
        const radial = Math.sqrt(1 - z * z) * (0.15 + Math.random() * 0.72);
        particlePositions[index * 3] = Math.cos(angle) * radial;
        particlePositions[index * 3 + 1] = Math.sin(angle) * radial;
        particlePositions[index * 3 + 2] = z * radial;
      }
      const particleGeometry = new THREE.BufferGeometry();
      particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
      const particles = new THREE.Points(
        particleGeometry,
        new THREE.PointsMaterial({
          color: 0xffedcf,
          size: 0.022,
          transparent: true,
          opacity: 0.86,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      orbGroup.add(particles);

      const resize = () => {
        const nextWidth = Math.max(1, window.innerWidth);
        const nextHeight = Math.max(1, window.innerHeight);
        camera.left = -nextWidth / 2;
        camera.right = nextWidth / 2;
        camera.top = nextHeight / 2;
        camera.bottom = -nextHeight / 2;
        camera.updateProjectionMatrix();
        renderer?.setSize(nextWidth, nextHeight, false);
      };

      const animate = () => {
        const frame = frameRef.current;
        orbGroup.visible = frame.visible;

        if (frame.visible) {
          orbGroup.position.set(frame.x - window.innerWidth / 2, window.innerHeight / 2 - frame.y, 0);
          orbGroup.scale.setScalar(frame.radius);
          orbGroup.rotation.y = frame.time * 0.12;
          orbGroup.rotation.x = Math.sin(frame.time * 0.35) * 0.055;
          filamentGroup.rotation.z = frame.time * 0.11;
          filamentGroup.rotation.y = Math.sin(frame.time * 0.22) * 0.16;
          particles.rotation.y = -frame.time * 0.075;
          particles.rotation.x = Math.sin(frame.time * 0.18) * 0.1;
          core.scale.setScalar(1 + Math.sin(frame.time * 2.1) * 0.035);
          aura.material.opacity = frame.isDocked ? 0.62 : 0.76;
          glassShell.material.opacity = frame.isDocked ? 0.52 : 0.46;
        }

        renderer?.render(scene, camera);
        animationId = window.requestAnimationFrame(animate);
      };

      window.addEventListener('resize', resize);
      frameRef.current.rendererReady = true;
      animate();

      return () => {
        window.cancelAnimationFrame(animationId);
        window.removeEventListener('resize', resize);
        frameRef.current.rendererReady = false;

        scene.traverse((object) => {
          const renderable = object as THREE.Mesh;
          if (renderable.geometry) renderable.geometry.dispose();
          const material = (object as THREE.Mesh).material;
          if (material) {
            if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
            else material.dispose();
          }
        });
        auraTexture?.dispose();
        renderer?.dispose();
        if (renderer?.domElement.parentElement === mount) {
          mount.removeChild(renderer.domElement);
        }
      };
    } catch (error) {
      frameRef.current.rendererReady = false;
      console.warn('[ThreeOrbLayer] WebGL unavailable; keeping the Canvas orb fallback.', error);
      renderer?.dispose();
      return undefined;
    }
  }, [frameRef]);

  return <div ref={mountRef} className="absolute inset-0 z-20 pointer-events-none" aria-hidden="true" />;
};
