"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/auth";
import { useTimeEntriesStore } from "@/stores/time-entries";
import { useTicketsStore } from "@/stores/tickets";
import { notify } from "@/lib/notifications";
import { Play, Pause, Square, Clock, RotateCcw } from "lucide-react";

interface TimerSession {
  ticketId: string;
  description: string;
  startTime: number;
  elapsedTime: number;
  isRunning: boolean;
  isBillable: boolean;
}

export function TimeTracker() {
  const [session, setSession] = useState<TimerSession | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [displayTime, setDisplayTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const { profile } = useAuthStore();
  const { createTimeEntry } = useTimeEntriesStore();
  const { tickets, fetchTickets } = useTicketsStore();

  useEffect(() => {
    if (profile?.tenant_id) {
      fetchTickets(profile.tenant_id);
    }

    // Load any existing timer from localStorage
    const savedTimer = localStorage.getItem("activeTimer");
    if (savedTimer) {
      try {
        const timer = JSON.parse(savedTimer);
        setSession(timer);
        setDisplayTime(timer.elapsedTime);
      } catch (error) {
        console.error("Failed to load saved timer:", error);
      }
    }
  }, [profile?.tenant_id, fetchTickets]);

  // Find current ticket
  const currentTicket = session
    ? tickets.find((t) => t.id === session.ticketId)
    : null;

  // Save timer state to localStorage whenever session changes
  useEffect(() => {
    if (session) {
      const timerData = {
        ...session,
        ticketTitle: currentTicket?.title,
      };
      localStorage.setItem("activeTimer", JSON.stringify(timerData));
    } else {
      localStorage.removeItem("activeTimer");
    }
  }, [session, currentTicket]);

  useEffect(() => {
    if (session?.isRunning) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = session.elapsedTime + (now - session.startTime);
        setDisplayTime(elapsed);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [session?.isRunning, session?.startTime, session?.elapsedTime]);

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  const getHoursFromMilliseconds = (milliseconds: number) => {
    return Number((milliseconds / (1000 * 60 * 60)).toFixed(2));
  };

  const startTimer = () => {
    if (!session) return;

    const now = Date.now();
    setSession((prev) =>
      prev
        ? {
            ...prev,
            isRunning: true,
            startTime: now,
          }
        : null
    );
  };

  const pauseTimer = () => {
    if (!session || !session.isRunning) return;

    const now = Date.now();
    const elapsed = session.elapsedTime + (now - session.startTime);

    setSession((prev) =>
      prev
        ? {
            ...prev,
            isRunning: false,
            elapsedTime: elapsed,
          }
        : null
    );

    setDisplayTime(elapsed);
  };

  const stopTimer = () => {
    if (!session) return;

    pauseTimer();
    setShowSaveDialog(true);
  };

  const resetTimer = () => {
    setSession(null);
    setDisplayTime(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const createNewSession = (ticketId: string) => {
    if (session && session.elapsedTime > 0) {
      notify.error(
        "Please save or discard the current session before starting a new one"
      );
      return;
    }

    const selectedTicket = tickets.find((t) => t.id === ticketId);
    if (!selectedTicket) return;

    setSession({
      ticketId,
      description: `Working on ${selectedTicket.title}`,
      startTime: Date.now(),
      elapsedTime: 0,
      isRunning: true,
      isBillable: true,
    });
  };

  const saveTimeEntry = async () => {
    if (!session || !profile?.tenant_id || !profile.id) return;

    const totalHours = getHoursFromMilliseconds(displayTime);

    if (totalHours < 0.01) {
      notify.error("Time entry must be at least 0.01 hours");
      return;
    }

    try {
      const { error } = await createTimeEntry(profile.tenant_id, profile.id, {
        ticket_id: session.ticketId,
        description: session.description,
        hours: totalHours,
        is_billable: session.isBillable,
        entry_date: new Date().toISOString().split("T")[0],
      });

      if (error) {
        notify.error(error);
      } else {
        notify.success(`Time entry saved: ${totalHours}h`);
        resetTimer();
        setShowSaveDialog(false);
      }
    } catch (error: any) {
      notify.error(error.message || "Failed to save time entry");
    }
  };

  const discardSession = () => {
    resetTimer();
    setShowSaveDialog(false);
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Time Tracker</CardTitle>
              <CardDescription>
                Track time in real-time with automatic logging
              </CardDescription>
            </div>
            <Clock className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!session ? (
            <div className="space-y-3">
              <Select onValueChange={createNewSession}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a ticket to start tracking" />
                </SelectTrigger>
                <SelectContent>
                  {tickets.map((ticket) => (
                    <SelectItem key={ticket.id} value={ticket.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{ticket.title}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {ticket.client?.name}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Select a ticket to begin time tracking
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-mono font-bold text-primary">
                  {formatTime(displayTime)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {getHoursFromMilliseconds(displayTime).toFixed(2)} hours
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Ticket:</span>
                  <Badge variant="outline">{currentTicket?.title}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Client:</span>
                  <span className="text-sm text-muted-foreground">
                    {currentTicket?.client?.name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status:</span>
                  <Badge variant={session.isRunning ? "default" : "secondary"}>
                    {session.isRunning ? "Running" : "Paused"}
                  </Badge>
                </div>
              </div>

              <div className="flex gap-2 justify-center">
                {session.isRunning ? (
                  <Button onClick={pauseTimer} size="sm">
                    <Pause className="h-4 w-4 mr-1" />
                    Pause
                  </Button>
                ) : (
                  <Button onClick={startTimer} size="sm">
                    <Play className="h-4 w-4 mr-1" />
                    Resume
                  </Button>
                )}

                <Button onClick={stopTimer} variant="outline" size="sm">
                  <Square className="h-4 w-4 mr-1" />
                  Stop & Save
                </Button>

                <Button
                  onClick={resetTimer}
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Save Time Entry</DialogTitle>
            <DialogDescription>
              Review and save your time tracking session
            </DialogDescription>
          </DialogHeader>

          {session && (
            <div className="space-y-4">
              <div className="grid gap-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Time:</span>
                  <span className="text-lg font-mono">
                    {formatTime(displayTime)} (
                    {getHoursFromMilliseconds(displayTime).toFixed(2)}h)
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="font-medium">Ticket:</span>
                  <span>{currentTicket?.title}</span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={session.description}
                    onChange={(e) =>
                      setSession((prev) =>
                        prev ? { ...prev, description: e.target.value } : null
                      )
                    }
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_billable"
                    checked={session.isBillable}
                    onCheckedChange={(checked) =>
                      setSession((prev) =>
                        prev ? { ...prev, isBillable: checked === true } : null
                      )
                    }
                  />
                  <Label htmlFor="is_billable">This time is billable</Label>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={discardSession}>
              Discard
            </Button>
            <Button onClick={saveTimeEntry}>Save Time Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
