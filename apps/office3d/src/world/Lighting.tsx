import React from "react";

export const Lighting: React.FC = () => {
  return (
    <>
      {/* Base readable ambient light - ensures natural architectural visibility */}
      <ambientLight color="#f8fafc" intensity={1.2} />

      {/* Main directional key light with soft shadow mapping */}
      <directionalLight
        position={[22, 32, 20]}
        intensity={1.4}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={60}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
        shadow-bias={-0.0005}
      />

      {/* Cool architectural fill light from opposite side */}
      <directionalLight position={[-20, 24, -18]} intensity={0.7} color="#e2e8f0" />

      {/* Front soft fill light */}
      <directionalLight position={[0, 20, 25]} intensity={0.5} color="#f8fafc" />

      {/* Hemisphere light for balanced natural bounce */}
      <hemisphereLight args={["#f1f5f9", "#1e293b", 0.6]} />

      {/* Central atrium architectural downlight */}
      <spotLight
        position={[0, 16, 0]}
        target-position={[0, 0, 0]}
        intensity={1.1}
        color="#ffffff"
        angle={Math.PI / 3}
        penumbra={0.8}
      />

      {/* Subtle department accent lights (architectural tones, restrained intensity) */}
      {/* Engineering Floor (Soft cool daylight) */}
      <pointLight position={[-10, 4, 0]} color="#e0f2fe" intensity={0.9} distance={18} decay={2} />

      {/* Executive / Management Area (Warm architectural white) */}
      <pointLight position={[0, 4, -10]} color="#fef3c7" intensity={0.9} distance={18} decay={2} />

      {/* QA Lab (Neutral clean task light) */}
      <pointLight position={[10, 4, 4]} color="#f8fafc" intensity={0.8} distance={18} decay={2} />

      {/* DevOps Server Room (Balanced architectural illumination) */}
      <pointLight position={[8, 4, -8]} color="#e2e8f0" intensity={0.9} distance={16} decay={2} />

      {/* Security Operations (Soft warm tone) */}
      <pointLight position={[-10, 4, 8]} color="#fef3c7" intensity={0.8} distance={16} decay={2} />
    </>
  );
};
