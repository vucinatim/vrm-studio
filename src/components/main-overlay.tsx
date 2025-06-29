import React, { useState, useEffect } from "react";
import { ControlsPanel } from "./controls-panel";
import { VideoPanel } from "./video-panel";
import { TrackingDebug } from "./tracking-debug";
import { SettingsPanel } from "./settings-panel";
import { DebugPanel } from "./debug-panel";
import { TrackingData, TrackingStatus } from "@/hooks/use-holistic-tracking";
import { useEditorStore } from "@/store/editor-store";

interface MainOverlayProps {
  toggleTracking: () => void;
  trackingStatus: TrackingStatus;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  trackingDataRef: React.RefObject<TrackingData>;
}

export function MainOverlay({
  toggleTracking,
  trackingStatus,
  videoRef,
  trackingDataRef,
}: MainOverlayProps) {
  const { showTrackingDebug, hideUiOnMouseOut, morphTargetDictionary } =
    useEditorStore();
  const [uiVisible, setUiVisible] = useState(true);

  useEffect(() => {
    if (!hideUiOnMouseOut) {
      setUiVisible(true);
    } else {
      setUiVisible(false);
    }
  }, [hideUiOnMouseOut]);

  const handleUiEnter = () => {
    if (hideUiOnMouseOut) setUiVisible(true);
  };
  const handleUiLeave = () => {
    if (hideUiOnMouseOut) setUiVisible(false);
  };

  return (
    <div
      className={`fixed inset-0 z-10 flex justify-between pointer-events-none transition-opacity duration-300 ${
        uiVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="w-2/9 overflow-y-auto p-4">
        <div
          className="space-y-4 pointer-events-auto overflow-y-auto"
          onMouseEnter={handleUiEnter}
          onMouseLeave={handleUiLeave}
        >
          <ControlsPanel
            toggleTracking={toggleTracking}
            trackingStatus={trackingStatus}
          />
          <VideoPanel videoRef={videoRef} />
          {showTrackingDebug && (
            <TrackingDebug trackingDataRef={trackingDataRef} />
          )}
        </div>
      </div>
      <div className="w-2/9 overflow-y-auto p-4">
        <div
          className="space-y-4 pointer-events-auto"
          onMouseEnter={handleUiEnter}
          onMouseLeave={handleUiLeave}
        >
          <SettingsPanel />
          <DebugPanel morphTargetDictionary={morphTargetDictionary} />
        </div>
      </div>
    </div>
  );
}
