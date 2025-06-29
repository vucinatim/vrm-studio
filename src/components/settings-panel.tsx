"use client";

import React from "react";
import { useEditorStore } from "@/store/editor-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4 py-4 border-b last:border-b-0">
      <h3 className="text-lg font-medium">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Setting({
  label,
  control,
}: {
  label: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <Label>{label}</Label>
      {control}
    </div>
  );
}

export function SettingsPanel() {
  const {
    showGround,
    resetCamera,
    lights,
    setLight,
    modelUrl,
    setModelUrl,
    hideUiOnMouseOut,
    toggleHideUiOnMouseOut,
    showTrackingDebug,
    set,
    isFaceTrackingEnabled,
    toggleFaceTracking,
    isPoseTrackingEnabled,
    togglePoseTracking,
    isHeadTrackingEnabled,
    toggleHeadTracking,
    isHandTrackingEnabled,
    toggleHandTracking,
    isLegTrackingEnabled,
    toggleLegTracking,
    isPupilTrackingEnabled,
    togglePupilTracking,
    smoothingFactor,
    setSmoothingFactor,
    showStats,
    toggleShowStats,
    areShadowsEnabled,
    toggleShadows,
  } = useEditorStore();

  return (
    <Card className="bg-background/30 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <Section title="Camera">
          <Button onClick={resetCamera} className="w-full">
            Reset Camera
          </Button>
        </Section>

        <Section title="Scene">
          <div className="flex items-center justify-between">
            <Label htmlFor="show-ground">Show Ground</Label>
            <Switch
              id="show-ground"
              checked={showGround}
              onCheckedChange={(checked) =>
                set(() => ({ showGround: checked }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="show-tracking-debug">Show Tracking Debug</Label>
            <Switch
              id="show-tracking-debug"
              checked={showTrackingDebug}
              onCheckedChange={(checked) =>
                set(() => ({ showTrackingDebug: checked }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="show-stats">Show Stats</Label>
            <Switch
              id="show-stats"
              checked={showStats}
              onCheckedChange={toggleShowStats}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="show-shadows">Enable Shadows</Label>
            <Switch
              id="show-shadows"
              checked={areShadowsEnabled}
              onCheckedChange={toggleShadows}
            />
          </div>
        </Section>

        <Section title="Lighting">
          <Setting
            label="Ambient Intensity"
            control={
              <Slider
                value={[lights.ambient.intensity]}
                onValueChange={([val]) =>
                  setLight("ambient", { intensity: val })
                }
                max={2}
                step={0.1}
              />
            }
          />
          {/* Add controls for other lights here if needed */}
        </Section>

        <Section title="Model">
          <div className="space-y-2">
            <Label>Model URL</Label>
            <Input
              value={modelUrl}
              onChange={(e) => setModelUrl(e.target.value)}
              placeholder="/avatar.vrm"
            />
          </div>
        </Section>

        <Section title="UI">
          <div className="flex items-center justify-between">
            <Label htmlFor="hide-ui">Hide UI on Mouse Out</Label>
            <Switch
              id="hide-ui"
              checked={hideUiOnMouseOut}
              onCheckedChange={toggleHideUiOnMouseOut}
            />
          </div>
        </Section>

        <Section title="Tracking">
          <div className="flex items-center justify-between">
            <Label htmlFor="face-tracking">Face Expressions</Label>
            <Switch
              id="face-tracking"
              checked={isFaceTrackingEnabled}
              onCheckedChange={toggleFaceTracking}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="pose-tracking">Pose Tracking</Label>
            <Switch
              id="pose-tracking"
              checked={isPoseTrackingEnabled}
              onCheckedChange={togglePoseTracking}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="head-tracking">Head Tracking</Label>
            <Switch
              id="head-tracking"
              checked={isHeadTrackingEnabled}
              onCheckedChange={toggleHeadTracking}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="hand-tracking">Hand Tracking</Label>
            <Switch
              id="hand-tracking"
              checked={isHandTrackingEnabled}
              onCheckedChange={toggleHandTracking}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="leg-tracking">Leg Tracking</Label>
            <Switch
              id="leg-tracking"
              checked={isLegTrackingEnabled}
              onCheckedChange={toggleLegTracking}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="pupil-tracking">Pupil Tracking</Label>
            <Switch
              id="pupil-tracking"
              checked={isPupilTrackingEnabled}
              onCheckedChange={togglePupilTracking}
            />
          </div>
          <Setting
            label="Motion Smoothing"
            control={
              <Slider
                value={[smoothingFactor]}
                onValueChange={([val]) => setSmoothingFactor(val)}
                min={0}
                max={1}
                step={0.01}
              />
            }
          />
        </Section>

        <Section title="Avatar Debug">
          <p className="text-sm text-muted-foreground">
            Available morph targets for the loaded model.
          </p>
        </Section>
      </CardContent>
    </Card>
  );
}
