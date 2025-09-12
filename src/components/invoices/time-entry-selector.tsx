"use client";

import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTimeEntriesStore } from "@/stores/time-entries";
import { useAuthStore } from "@/stores/auth";
import type { TimeEntry } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TimeEntrySelectorProps {
  clientId: string;
  selectedEntries: TimeEntry[];
  onSelectionChange: (entries: TimeEntry[]) => void;
}

export function TimeEntrySelector({ clientId, selectedEntries, onSelectionChange }: TimeEntrySelectorProps) {
  const { profile } = useAuthStore();
  const { timeEntries, fetchUnbilledTimeEntries, loading } = useTimeEntriesStore();
  const [dateFilter, setDateFilter] = useState("thisMonth");

  useEffect(() => {
    if (profile?.tenant_id && clientId) {
      fetchUnbilledTimeEntries(profile.tenant_id, clientId);
    }
  }, [profile?.tenant_id, clientId, fetchUnbilledTimeEntries]);

  const handleToggle = (entry: TimeEntry, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedEntries, entry]);
    } else {
      onSelectionChange(selectedEntries.filter((e) => e.id !== entry.id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(timeEntries);
    } else {
      onSelectionChange([]);
    }
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString();
  const getRate = (entry: TimeEntry) =>
    entry.ticket?.client?.hourly_rate ?? entry.user?.default_hourly_rate ?? 0;
  const formatCurrency = (amount: number) =>
    amount.toLocaleString(undefined, { style: "currency", currency: "USD" });

  const filteredEntries = timeEntries.filter((entry) => {
    if (dateFilter === "thisMonth") {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return new Date(entry.entry_date) >= start;
    }
    if (dateFilter === "lastMonth") {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 1);
      const date = new Date(entry.entry_date);
      return date >= start && date < end;
    }
    return true;
  });

  const allSelected =
    filteredEntries.length > 0 && selectedEntries.length === filteredEntries.length;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="thisMonth">This Month</SelectItem>
            <SelectItem value="lastMonth">Last Month</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={allSelected}
            onCheckedChange={(v) => handleSelectAll(!!v)}
            id="select-all"
          />
          <label htmlFor="select-all" className="text-sm font-medium">
            Select All
          </label>
        </div>
      </div>
      {loading ? (
        <p>Loading time entries...</p>
      ) : filteredEntries.length === 0 ? (
        <p>No billable time entries found.</p>
      ) : (
        <div className="rounded-md border max-h-60 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.map((entry) => {
                const checked = selectedEntries.some((e) => e.id === entry.id);
                const rate = getRate(entry);
                const amount = entry.hours * rate;
                return (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => handleToggle(entry, !!v)}
                      />
                    </TableCell>
                    <TableCell>{formatDate(entry.entry_date)}</TableCell>
                    <TableCell>{entry.description}</TableCell>
                    <TableCell className="text-right">{entry.hours}</TableCell>
                    <TableCell className="text-right">{formatCurrency(rate)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(amount)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

