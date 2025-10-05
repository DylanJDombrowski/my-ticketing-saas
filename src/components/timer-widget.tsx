"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Clock } from "lucide-react";

interface TimerData {
  isRunning: boolean;
  elapsedTime: number;
  ticketTitle?: string;
}

export function TimerWidget() {
  const [timerData, setTimerData] = useState<TimerData | null>(null);
  const [displayTime, setDisplayTime] = useState(0);

  // Listen for timer updates from localStorage or global state
  useEffect(() => {
    const checkTimer = () => {
      const stored = localStorage.getItem('activeTimer');
      if (stored) {
        try {
          const timer = JSON.parse(stored);
          setTimerData(timer);

          if (timer.isRunning) {
            const now = Date.now();
            const elapsed = timer.elapsedTime + (now - timer.startTime);
            setDisplayTime(elapsed);
          } else {
            setDisplayTime(timer.elapsedTime);
          }
        } catch (error) {
          console.error('Failed to parse timer data:', error);
        }
      } else {
        setTimerData(null);
        setDisplayTime(0);
      }
    };

    // Check immediately
    checkTimer();

    // Set up polling to check for timer updates
    const interval = setInterval(checkTimer, 1000);

    // Listen for storage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'activeTimer') {
        checkTimer();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const navigateToTimeEntries = () => {
    window.location.href = '/dashboard/time-entries';
  };

  if (!timerData) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-1 sm:px-2 font-mono text-xs sm:text-sm"
        >
          <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
          <span className="hidden xs:inline">{formatTime(displayTime)}</span>
          <span className="xs:hidden">{formatTime(displayTime).replace(/^0:/, '')}</span>
          {timerData.isRunning && (
            <div className="ml-1 sm:ml-2 h-2 w-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 sm:w-80" align="end" sideOffset={8}>
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm sm:text-base">Active Timer</h4>
            <Badge variant={timerData.isRunning ? "default" : "secondary"} className="text-xs">
              {timerData.isRunning ? "Running" : "Paused"}
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-mono font-bold">
                {formatTime(displayTime)}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                {timerData.ticketTitle || "Active time tracking"}
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-center">
            <Button
              size="sm"
              variant="outline"
              onClick={navigateToTimeEntries}
              className="flex-1 text-xs sm:text-sm"
            >
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              Open Timer
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Tap to manage your time tracking session
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}