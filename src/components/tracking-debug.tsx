"use client";

import React, { useEffect, useRef, RefObject } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { TrackingData } from "@/hooks/use-holistic-tracking";

interface TrackingDebugProps {
  trackingDataRef: RefObject<TrackingData>;
}

const POSE_CONNECTIONS: [number, number][] = [
  // Torso
  [11, 12],
  [23, 24],
  [11, 23],
  [12, 24],
  // Left Arm
  [11, 13],
  [13, 15],
  // Right Arm
  [12, 14],
  [14, 16],
  // Left Leg
  [23, 25],
  [25, 27],
  // Right Leg
  [24, 26],
  [26, 28],
];

// Landmark indices for pupils and eye corners
const PUPIL_LANDMARKS = {
  // Iris landmarks
  IRIS_L: 473,
  IRIS_R: 468,
  // Left eye boundary landmarks
  LEFT_EYE_TOP: 159,
  LEFT_EYE_BOTTOM: 145,
  LEFT_EYE_LEFT_CORNER: 33,
  LEFT_EYE_RIGHT_CORNER: 133,
  // Right eye boundary landmarks
  RIGHT_EYE_TOP: 386,
  RIGHT_EYE_BOTTOM: 374,
  RIGHT_EYE_LEFT_CORNER: 362,
  RIGHT_EYE_RIGHT_CORNER: 263,
};

export function TrackingDebug({ trackingDataRef }: TrackingDebugProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameId = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas?.getContext("2d");

    if (!canvas || !container || !ctx) return;

    const resizeCanvas = () => {
      const containerWidth = container.clientWidth;
      canvas.width = containerWidth;
      canvas.height = (containerWidth * 9) / 16;
    };

    const draw = () => {
      const { poseLandmarks, faceLandmarks } = trackingDataRef.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // --- Draw Full Body Pose ---
      if (poseLandmarks.length > 0) {
        ctx.strokeStyle = "lime";
        ctx.lineWidth = 2;

        POSE_CONNECTIONS.forEach(([start, end]) => {
          const p1 = poseLandmarks[start];
          const p2 = poseLandmarks[end];
          if (p1 && p2) {
            ctx.beginPath();
            ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
            ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
            ctx.stroke();
          }
        });
      }

      // --- Draw Eye and Pupil Landmarks for Debugging ---
      if (faceLandmarks.length > 0) {
        // Draw Eye Sockets (White)
        ctx.fillStyle = "white";
        [
          PUPIL_LANDMARKS.LEFT_EYE_TOP,
          PUPIL_LANDMARKS.LEFT_EYE_BOTTOM,
          PUPIL_LANDMARKS.LEFT_EYE_LEFT_CORNER,
          PUPIL_LANDMARKS.LEFT_EYE_RIGHT_CORNER,
          PUPIL_LANDMARKS.RIGHT_EYE_TOP,
          PUPIL_LANDMARKS.RIGHT_EYE_BOTTOM,
          PUPIL_LANDMARKS.RIGHT_EYE_LEFT_CORNER,
          PUPIL_LANDMARKS.RIGHT_EYE_RIGHT_CORNER,
        ].forEach((index) => {
          const p = faceLandmarks[index];
          if (p) {
            ctx.beginPath();
            ctx.arc(p.x * canvas.width, p.y * canvas.height, 2, 0, 2 * Math.PI);
            ctx.fill();
          }
        });

        // Draw Irises (Red)
        ctx.fillStyle = "red";
        [PUPIL_LANDMARKS.IRIS_L, PUPIL_LANDMARKS.IRIS_R].forEach((index) => {
          const p = faceLandmarks[index];
          if (p) {
            ctx.beginPath();
            ctx.arc(p.x * canvas.width, p.y * canvas.height, 2, 0, 2 * Math.PI);
            ctx.fill();
          }
        });
      }

      animationFrameId.current = requestAnimationFrame(draw);
    };

    resizeCanvas();
    draw();

    window.addEventListener("resize", resizeCanvas);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [trackingDataRef]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tracking Debug</CardTitle>
      </CardHeader>
      <CardContent ref={containerRef}>
        <canvas ref={canvasRef} className="rounded-lg w-full h-auto" />
      </CardContent>
    </Card>
  );
}
