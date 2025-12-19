
// @ts-nocheck
import React from 'react';
import * as THREE from 'three';

interface ErrorBoundaryProps {
  fallback: React.ReactNode;
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class TextureErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: any): ErrorBoundaryState {
    // Si cualquier hijo lanza un error (como useLoader cuando falla el fetch), entramos en modo fallback
    return { hasError: true };
  }
  
  componentDidCatch(error: any, errorInfo: any) {
    console.warn("Battle Asset Failed to Load:", error);
  }

  render() { 
      if (this.state.hasError) return this.props.fallback;
      return this.props.children; 
  }
}

const _tempObj = new THREE.Object3D();
const _tempColor = new THREE.Color();

export const FallbackTerrainLayer = React.memo(({ mapData, onTileClick }: any) => {
    const meshRef = React.useRef<THREE.InstancedMesh>(null);
    const count = mapData ? mapData.length : 0;

    React.useLayoutEffect(() => {
        if (!meshRef.current || count === 0) return;
        mapData.forEach((block: any, i: number) => {
            if (!block) return;
            const y = (block.offsetY || 0) + (block.height || 1) / 2;
            _tempObj.position.set(block.x || 0, y, block.z || 0);
            _tempObj.scale.set(0.98, block.height || 1, 0.98);
            _tempObj.updateMatrix();
            meshRef.current!.setMatrixAt(i, _tempObj.matrix);
            _tempColor.set(block.color || '#555');
            meshRef.current!.setColorAt(i, _tempColor);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [mapData, count]);

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]} onClick={(e) => { e.stopPropagation(); onTileClick(mapData[e.instanceId].x, mapData[e.instanceId].z); }}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial roughness={0.8} />
        </instancedMesh>
    );
});
