import { Grid } from '@react-three/drei';

export function GroundGrid() {
  return (
    <Grid args={[20, 20]} position={[0, -0.001, 0]} cellSize={0.1} cellThickness={0.5} cellColor="#303040" sectionSize={1} sectionThickness={1} sectionColor="#505070" fadeDistance={15} fadeStrength={1} infiniteGrid />
  );
}
