"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "./ui/scroll-area";

interface DebugPanelProps {
  morphTargetDictionary?: { [key: string]: number };
}

export function DebugPanel({ morphTargetDictionary }: DebugPanelProps) {
  if (!morphTargetDictionary) {
    return null;
  }

  const dictionaryString = JSON.stringify(morphTargetDictionary, null, 2);

  return (
    <Card className="bg-background/30 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Avatar Debug</CardTitle>
        <CardDescription>
          Available morph targets for the loaded model.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <pre className="p-4 bg-zinc-900/50 rounded-md overflow-x-auto text-sm text-white">
            <code>{dictionaryString}</code>
          </pre>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
