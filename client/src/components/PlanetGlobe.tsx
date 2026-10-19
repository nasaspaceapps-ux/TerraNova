import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Map as MapIcon, Minus, Pause, Play, Plus, RotateCcw } from "lucide-react";
import type { Site } from "@/data/sites";
import type { PlanetaryFeature } from "@/data/planetaryFeatures";
import { planetDefinitions, type PlanetBody } from "@/data/nasaSources";
import "@/planet-globe.css";

type GISMarker = { id: string; latitude: number; longitude: number; name: string };
type GlobeEngine = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  orientation: THREE.Group;
  surfaceGroup: THREE.Group;
  markerGroup: THREE.Group;
  raycaster: THREE.Raycaster;
  pointer: THREE.Vector2;
  animationFrame: number;
};

type Props = {
  world: PlanetBody;
  onWorldChange: (world: PlanetBody) => void;
  onShowMap?: () => void;
  selectedId: string;
  visibleSites: Site[];
  onSelect: (siteId: string) => void;
  features: PlanetaryFeature[];
  selectedFeatureId: string | null;
  onFeatureSelect: (featureId: string) => void;
  gisMarkers: GISMarker[];
};

const worlds: PlanetBody[] = ["Earth", "Moon", "Mars"];

function disposeMaterial(material: THREE.Material) {
  Object.values(material).forEach((value) => {
    if (value instanceof THREE.Texture) value.dispose();
  });
  material.dispose();
}

function disposeGroup(group: THREE.Group) {
  while (group.children.length) {
    const child = group.children[0];
    child.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        (Array.isArray(object.material) ? object.material : [object.material]).forEach(disposeMaterial);
      } else if (object instanceof THREE.Sprite) {
        disposeMaterial(object.material);
      }
    });
    group.remove(child);
  }
}

function latLonVector(lat: number, lonEast: number, radius: number) {
  const latitude = THREE.MathUtils.degToRad(lat);
  const longitude = THREE.MathUtils.degToRad(lonEast);
  return new THREE.Vector3(
    radius * Math.cos(latitude) * Math.cos(longitude),
    radius * Math.sin(latitude),
    -radius * Math.cos(latitude) * Math.sin(longitude),
  );
}

function labelSprite(text: string, color: string, selected: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 112;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.fillStyle = selected ? "rgba(44,58,40,0.94)" : "rgba(12,20,19,0.88)";
  context.fillRect(4, 9, 712, 94);
  context.strokeStyle = selected ? "#d3ef70" : color;
  context.lineWidth = 3;
  context.strokeRect(4, 9, 712, 94);
  context.font = "600 34px 'Space Grotesk', Arial, sans-serif";
  context.textBaseline = "middle";
  context.fillStyle = "#eef3df";
  context.fillText(text, 24, 57, 665);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: true, depthWrite: false, sizeAttenuation: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.54, 0.084, 1);
  return sprite;
}

function makeMarker(color: number, selected: boolean, size = 0.022) {
  const group = new THREE.Group();
  const bead = new THREE.Mesh(
    new THREE.SphereGeometry(selected ? size * 1.28 : size, 16, 12),
    new THREE.MeshBasicMaterial({ color: selected ? 0xd3ef70 : color }),
  );
  group.add(bead);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(size * 1.5, size * 1.9, 24),
    new THREE.MeshBasicMaterial({ color: selected ? 0xd3ef70 : color, transparent: true, opacity: selected ? 0.9 : 0.58, side: THREE.DoubleSide, depthWrite: false }),
  );
  group.add(ring);
  return group;
}

function PlanetGlobe({ world, onWorldChange, onShowMap, selectedId, visibleSites, onSelect, features, selectedFeatureId, onFeatureSelect, gisMarkers }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GlobeEngine | null>(null);
  const onSelectRef = useRef(onSelect);
  const onFeatureSelectRef = useRef(onFeatureSelect);
  const [autoRotate, setAutoRotate] = useState(true);
  const [webglError, setWebglError] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  onSelectRef.current = onSelect;
  onFeatureSelectRef.current = onFeatureSelect;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    } catch {
      setWebglError(true);
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.setSize(mount.clientWidth || 800, mount.clientHeight || 400);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.domElement.className = "planet-canvas";
    renderer.domElement.setAttribute("aria-label", "Interactive 3D NASA planet model. Drag to rotate and use the wheel or pinch to zoom.");
    renderer.domElement.tabIndex = 0;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c1417);
    const camera = new THREE.PerspectiveCamera(34, (mount.clientWidth || 800) / (mount.clientHeight || 400), 0.1, 100);
    camera.position.set(0, 0.04, 3.35);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.enablePan = false;
    controls.rotateSpeed = 0.62;
    controls.zoomSpeed = 0.82;
    controls.minDistance = 2.15;
    controls.maxDistance = 5.6;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.34;
    controls.target.set(0, 0, 0);

    scene.add(new THREE.HemisphereLight(0xdceaff, 0x26302c, 1.05));
    const keyLight = new THREE.DirectionalLight(0xfff5dd, 2.55);
    keyLight.position.set(-3.5, 2.2, 5.5);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x6a95c1, 0.7);
    rimLight.position.set(4, -1.5, -3);
    scene.add(rimLight);

    const starPositions = new Float32Array(660);
    for (let index = 0; index < starPositions.length; index += 3) {
      const theta = Math.random() * Math.PI * 2;
      const z = Math.random() * 2 - 1;
      const radius = 7 + Math.random() * 9;
      const planar = Math.sqrt(1 - z * z);
      starPositions[index] = radius * planar * Math.cos(theta);
      starPositions[index + 1] = radius * z;
      starPositions[index + 2] = radius * planar * Math.sin(theta);
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xc7d4ce, size: 0.018, transparent: true, opacity: 0.7, sizeAttenuation: true }));
    scene.add(stars);

    const orientation = new THREE.Group();
    orientation.rotation.y = -Math.PI / 2;
    scene.add(orientation);
    const surfaceGroup = new THREE.Group();
    const markerGroup = new THREE.Group();
    orientation.add(surfaceGroup, markerGroup);
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const engine: GlobeEngine = { renderer, scene, camera, controls, orientation, surfaceGroup, markerGroup, raycaster, pointer, animationFrame: 0 };
    engineRef.current = engine;

    const resizeObserver = new ResizeObserver(() => {
      if (!mount.clientWidth || !mount.clientHeight) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    });
    resizeObserver.observe(mount);

    const pointerStart = { x: 0, y: 0 };
    const onPointerDown = (event: PointerEvent) => {
      pointerStart.x = event.clientX;
      pointerStart.y = event.clientY;
      renderer.domElement.classList.add("is-dragging");
    };
    const onPointerUp = (event: PointerEvent) => {
      renderer.domElement.classList.remove("is-dragging");
      if (event.target !== renderer.domElement || Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 5) return;
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(markerGroup.children, true).find((entry) => {
        const marker = entry.object.parent?.userData;
        return typeof marker?.siteId === "string" || typeof marker?.featureId === "string";
      });
      const marker = hit?.object.parent?.userData;
      if (typeof marker?.siteId === "string") onSelectRef.current(marker.siteId);
      if (typeof marker?.featureId === "string") onFeatureSelectRef.current(marker.featureId);
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);

    const animate = () => {
      engine.animationFrame = window.requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.cancelAnimationFrame(engine.animationFrame);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      controls.dispose();
      disposeGroup(surfaceGroup);
      disposeGroup(markerGroup);
      starGeometry.dispose();
      (stars.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.domElement.remove();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.controls.autoRotate = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const definition = planetDefinitions[world];
    const loader = new GLTFLoader();
    let cancelled = false;
    setModelReady(false);
    setWebglError(false);
    disposeGroup(engine.surfaceGroup);
    loader.load(definition.model, (gltf) => {
      if (cancelled) {
        disposeGroup(gltf.scene);
        return;
      }
      const model = gltf.scene;
      model.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(model);
      const center = bounds.getCenter(new THREE.Vector3());
      const size = bounds.getSize(new THREE.Vector3());
      const scale = 2 / Math.max(size.x, size.y, size.z);
      model.scale.setScalar(scale);
      model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
      model.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        if (!object.geometry.attributes.normal) object.geometry.computeVertexNormals();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          if (material.map) material.map.colorSpace = THREE.SRGBColorSpace;
        });
      });
      engine.surfaceGroup.add(model);
      const atmosphere = new THREE.Mesh(
        new THREE.SphereGeometry(1.035, 64, 48),
        new THREE.MeshBasicMaterial({ color: definition.glow, side: THREE.BackSide, transparent: true, opacity: world === "Earth" ? 0.105 : 0.055, depthWrite: false }),
      );
      engine.surfaceGroup.add(atmosphere);
      setModelReady(true);
    }, undefined, () => {
      if (!cancelled) setWebglError(true);
    });
    engine.camera.position.set(0, 0.04, 3.35);
    engine.controls.target.set(0, 0, 0);
    engine.controls.update();
    return () => {
      cancelled = true;
      disposeGroup(engine.surfaceGroup);
    };
  }, [world]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    disposeGroup(engine.markerGroup);
    if (world === "Earth") {
      for (const site of visibleSites) {
        if (site.lat === null || site.lon === null) continue;
        const selected = site.id === selectedId;
        const color = site.kind === "Reference analog" ? 0x75d8d1 : 0xd3ef70;
        const marker = makeMarker(color, selected, 0.022);
        marker.userData.siteId = site.id;
        marker.position.copy(latLonVector(site.lat, site.lon, 1.025));
        const normal = marker.position.clone().normalize();
        const ring = marker.children[1] as THREE.Mesh;
        ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
        engine.markerGroup.add(marker);
      }
      return;
    }

    for (const feature of features.filter((item) => item.body === world)) {
      const selected = feature.id === selectedFeatureId;
      const color = world === "Moon" ? 0xb9c4d0 : 0xe28a60;
      const marker = makeMarker(color, selected, 0.019);
      marker.userData.featureId = feature.id;
      marker.position.copy(latLonVector(feature.latitude, feature.longitudeEast, 1.025));
      const normal = marker.position.clone().normalize();
      const ring = marker.children[1] as THREE.Mesh;
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      const label = labelSprite(feature.name, world === "Moon" ? "#aebcca" : "#e28a60", selected);
      if (label) {
        label.position.copy(marker.position).addScaledVector(normal, 0.15);
        marker.add(label);
      }
      engine.markerGroup.add(marker);
    }

    for (const item of gisMarkers.slice(0, 300)) {
      const marker = new THREE.Group();
      marker.userData.gisId = item.id;
      marker.position.copy(latLonVector(item.latitude, item.longitude, 1.017));
      marker.add(new THREE.Mesh(
        new THREE.OctahedronGeometry(0.012, 0),
        new THREE.MeshBasicMaterial({ color: 0xd3ef70, transparent: true, opacity: 0.8 }),
      ));
      engine.markerGroup.add(marker);
    }
  }, [world, visibleSites, selectedId, features, selectedFeatureId, gisMarkers]);

  const zoom = (factor: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    const current = engine.camera.position.length();
    const next = THREE.MathUtils.clamp(current * factor, engine.controls.minDistance, engine.controls.maxDistance);
    engine.camera.position.multiplyScalar(next / current);
    engine.controls.update();
  };

  const resetView = () => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.controls.reset();
    engine.camera.position.set(0, 0.04, 3.35);
    engine.controls.target.set(0, 0, 0);
    engine.controls.update();
  };

  const current = planetDefinitions[world];
  const visibleEarthSiteCount = visibleSites.filter((site) => site.lat !== null && site.lon !== null).length;
  return (
    <div className="planet-globe">
      <div className="planet-topline">
        <div className="planet-world-tabs" role="tablist" aria-label="Select 3D world">
          {worlds.map((body) => <button key={body} className={`planet-world-tab ${world === body ? "active" : ""}`} onClick={() => onWorldChange(body)} role="tab" aria-selected={world === body}>
            <i className={`planet-world-dot ${body.toLowerCase()}`} />{body}
          </button>)}
        </div>
        <div className="planet-topline-right"><span className="planet-sites-counter">{world === "Earth" ? `${visibleEarthSiteCount} MAPPED SITES` : `${features.filter((item) => item.body === world).length} NAMED FEATURES · ${world.toUpperCase()}`}</span>{onShowMap && <button className="planet-map-return" onClick={onShowMap}><MapIcon size={13} /> Earth map / Satellite</button>}</div>
      </div>
      <div className={`planet-viewport ${webglError ? "has-error" : ""}`} ref={mountRef}>
        {webglError && <div className="planet-fallback"><img src={current.texture} alt={`${world} surface map preview`} /><span>3D rendering is unavailable in this browser; showing the NASA basemap preview.</span></div>}
        {!modelReady && !webglError && <div className="planet-loading"><i />Loading NASA {world} 3D model…</div>}
        {!webglError && <>
          <div className="planet-instructions"><span>DRAG TO ROTATE</span><i /> SCROLL OR PINCH TO ZOOM</div>
          <div className="planet-controls" aria-label="3D globe controls">
            <button onClick={() => zoom(0.82)} aria-label="Zoom in"><Plus size={15} /></button>
            <button onClick={() => zoom(1.22)} aria-label="Zoom out"><Minus size={15} /></button>
            <button onClick={resetView} aria-label="Reset 3D view"><RotateCcw size={14} /></button>
            <button onClick={() => setAutoRotate((value) => !value)} aria-label={autoRotate ? "Pause auto-rotation" : "Resume auto-rotation"} aria-pressed={autoRotate}>{autoRotate ? <Pause size={14} /> : <Play size={14} />}</button>
          </div>
          <div className="planet-credit"><a href={current.sourceUrl} target="_blank" rel="noreferrer">{current.source}</a><span>{current.note}</span></div>
        </>}
      </div>
      <div className="planet-legend">
        {world === "Earth" ? <><span><i className="planet-legend-dot reference" /> Context reference</span><span><i className="planet-legend-dot candidate" /> Candidate / AI lead</span><span className="planet-legend-help">Only records with a coordinate appear as markers.</span></> : <><span>{world} names follow USGS/IAU Gazetteer; marker centers are for orientation only.</span><span className="planet-legend-help">Select a labelled feature to inspect its region and signed-east coordinates.</span></>}
      </div>
    </div>
  );
}

export default PlanetGlobe;
