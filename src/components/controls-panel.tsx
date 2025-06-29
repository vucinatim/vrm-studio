import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ControlsPanelProps {
  toggleTracking: () => void;
  trackingStatus: string;
}

export function ControlsPanel({
  toggleTracking,
  trackingStatus,
}: ControlsPanelProps) {
  return (
    <Card className="bg-background/30 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Controls</CardTitle>
      </CardHeader>
      <CardContent>
        <Button
          onClick={toggleTracking}
          disabled={trackingStatus === "RUNNING"}
          className="w-full"
        >
          {trackingStatus === "RUNNING" ? "Webcam Active" : "Start Webcam"}
        </Button>
      </CardContent>
    </Card>
  );
}
