"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface VideoPanelProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export function VideoPanel({ videoRef }: VideoPanelProps) {
  return (
    <Card className="bg-background/30 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Webcam Feed</CardTitle>
      </CardHeader>
      <CardContent>
        <video
          ref={videoRef}
          autoPlay
          muted
          className="w-full h-auto rounded-lg"
        />
      </CardContent>
    </Card>
  );
}
