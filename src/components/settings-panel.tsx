"use client";

import React from "react";
import { useEditorStore } from "@/store/editor-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { usePerformanceStore } from "@/store/performance-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "./ui/input";
import { UploadIcon } from "lucide-react";

function Setting({
  label,
  control,
  description,
}: {
  label?: string;
  control: React.ReactNode;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col">
        {label && <Label className="text-xs">{label}</Label>}
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {control}
    </div>
  );
}

function AccordionSection({
  value,
  title,
  children,
}: {
  value: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <AccordionItem value={value} className="-mx-6 px-6 border-b-0 border-t">
      <AccordionTrigger className="font-semibold">{title}</AccordionTrigger>
      <AccordionContent className="space-y-4">{children}</AccordionContent>
    </AccordionItem>
  );
}

export function SettingsPanel() {
  const {
    showGround,
    resetCamera,
    lights,
    setLight,
    selectedModel,
    setSelectedModel,
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
    showStats,
    toggleShowStats,
    areShadowsEnabled,
    toggleShadows,
    isSmoothingEnabled,
    toggleSmoothing,
    globalSmoothingFactor,
    setGlobalSmoothingFactor,
    isGreenScreenEnabled,
    toggleGreenScreen,
    setCustomModel,
    customModel,
  } = useEditorStore();
  const averageWorkerTime = usePerformanceStore(
    (state) => state.averageWorkerTime
  );
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCustomModel(file);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className="bg-background/30 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <Setting
            label="Avatar Model"
            control={
              <Select onValueChange={setSelectedModel} value={selectedModel}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {customModel && (
                    <SelectItem value={selectedModel}>
                      {customModel.name}
                    </SelectItem>
                  )}
                  <SelectItem value="witch">Witch</SelectItem>
                  <SelectItem value="girl">Girl</SelectItem>
                  <SelectItem value="boy">Boy</SelectItem>
                  <SelectItem value="horny">Horny</SelectItem>
                  <SelectItem value="cute">Cute</SelectItem>
                  <SelectItem value="cat">Cat</SelectItem>
                </SelectContent>
              </Select>
            }
          />
          <Setting
            control={
              <>
                <Input
                  type="file"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".vrm"
                />
                <Button
                  variant="outline"
                  onClick={handleButtonClick}
                  className="w-full"
                >
                  <UploadIcon className="w-4 h-4 mr-2" />
                  Upload .VRM
                </Button>
              </>
            }
          />
          <Button onClick={resetCamera} className="w-full">
            Reset Camera
          </Button>
          <Setting
            label="Hide UI on Mouse Out"
            control={
              <Switch
                id="hide-ui"
                checked={hideUiOnMouseOut}
                onCheckedChange={toggleHideUiOnMouseOut}
              />
            }
          />
        </div>

        <Accordion type="multiple" defaultValue={["scene", "tracking"]}>
          <AccordionSection value="scene" title="Scene">
            <Setting
              label="Show Ground"
              control={
                <Switch
                  id="show-ground"
                  checked={showGround}
                  onCheckedChange={(checked) =>
                    set(() => ({ showGround: checked }))
                  }
                />
              }
            />
            <Setting
              label="Enable Shadows"
              control={
                <Switch
                  id="show-shadows"
                  checked={areShadowsEnabled}
                  onCheckedChange={toggleShadows}
                />
              }
            />
            <Setting
              label="Ambient Light"
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
            <Setting
              label="Enable Green Screen"
              control={
                <Switch
                  id="green-screen"
                  checked={isGreenScreenEnabled}
                  onCheckedChange={toggleGreenScreen}
                />
              }
            />
          </AccordionSection>
          <AccordionSection value="tracking" title="Tracking">
            <Setting
              label="Face Expressions"
              control={
                <Switch
                  id="face-tracking"
                  checked={isFaceTrackingEnabled}
                  onCheckedChange={toggleFaceTracking}
                />
              }
            />
            <Setting
              label="Pose Tracking"
              control={
                <Switch
                  id="pose-tracking"
                  checked={isPoseTrackingEnabled}
                  onCheckedChange={togglePoseTracking}
                />
              }
            />
            <Setting
              label="Head Tracking"
              control={
                <Switch
                  id="head-tracking"
                  checked={isHeadTrackingEnabled}
                  onCheckedChange={toggleHeadTracking}
                />
              }
            />
            <Setting
              label="Hand Tracking"
              control={
                <Switch
                  id="hand-tracking"
                  checked={isHandTrackingEnabled}
                  onCheckedChange={toggleHandTracking}
                />
              }
            />
            <Setting
              label="Leg Tracking"
              control={
                <Switch
                  id="leg-tracking"
                  checked={isLegTrackingEnabled}
                  onCheckedChange={toggleLegTracking}
                />
              }
            />
            <Setting
              label="Pupil Tracking"
              control={
                <Switch
                  id="pupil-tracking"
                  checked={isPupilTrackingEnabled}
                  onCheckedChange={togglePupilTracking}
                />
              }
            />
            <Setting
              label="Enable Smoothing"
              control={
                <Switch
                  id="smoothing-enabled"
                  checked={isSmoothingEnabled}
                  onCheckedChange={toggleSmoothing}
                />
              }
            />
            <Setting
              label="Smoothing Amount"
              control={
                <Slider
                  value={[globalSmoothingFactor]}
                  onValueChange={([val]) => setGlobalSmoothingFactor(val)}
                  min={0}
                  max={1}
                  step={0.01}
                  disabled={!isSmoothingEnabled}
                />
              }
            />
          </AccordionSection>
          <AccordionSection value="debug" title="Debug & Performance">
            <Setting
              label="Avg. Processing Time"
              control={
                <span className="text-sm font-medium font-mono">
                  {averageWorkerTime.toFixed(2)} ms
                </span>
              }
            />
            <Setting
              label="Show Tracking Debug"
              control={
                <Switch
                  id="show-tracking-debug"
                  checked={showTrackingDebug}
                  onCheckedChange={(checked) =>
                    set(() => ({ showTrackingDebug: checked }))
                  }
                />
              }
            />
            <Setting
              label="Show Stats"
              control={
                <Switch
                  id="show-stats"
                  checked={showStats}
                  onCheckedChange={toggleShowStats}
                />
              }
            />
            <p className="text-sm text-muted-foreground pt-4">
              Available morph targets for the loaded model will be shown here.
            </p>
          </AccordionSection>
        </Accordion>
      </CardContent>
    </Card>
  );
}
