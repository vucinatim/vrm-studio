"use client";

import React, { useMemo } from "react";

const neonColors = [
  "#ff00ff", // Magenta
  "#00ffff", // Cyan
  "#ffff00", // Yellow
  "#ff007f", // Rose
  "#00ff7f", // Spring Green
];

function Box({
  position,
  args,
  color,
}: {
  position: [number, number, number];
  args: [number, number, number];
  color: string;
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={args} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={2}
        toneMapped={false}
      />
    </mesh>
  );
}

export function BoxStack({
  position = [0, 0, 0],
}: {
  position?: [number, number, number];
}) {
  const boxData = useMemo(() => {
    const data = [];
    const numBoxes = 3 + Math.floor(Math.random() * 3);
    let currentHeight = 0;

    for (let i = 0; i < numBoxes; i++) {
      const width = 0.5 + Math.random() * 0.5;
      const height = 0.5 + Math.random() * 0.5;
      const depth = 0.5 + Math.random() * 0.5;

      const x = Math.random() * 0.2 - 0.1;
      const z = Math.random() * 0.2 - 0.1;
      const y = currentHeight + height / 2;

      const color = neonColors[Math.floor(Math.random() * neonColors.length)];

      data.push({
        id: i,
        position: [x, y, z] as [number, number, number],
        args: [width, height, depth] as [number, number, number],
        color: color,
      });

      currentHeight += height;
    }
    return data;
  }, []);

  return (
    <group position={position}>
      {boxData.map((data) => (
        <Box key={data.id} {...data} />
      ))}
    </group>
  );
}
