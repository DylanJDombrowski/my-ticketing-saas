"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Keyboard, Navigation, Settings, Zap } from "lucide-react";
import {
  useGlobalKeyboardShortcuts,
  pageShortcuts,
  formatShortcut,
} from "@/hooks/use-keyboard-shortcuts";
import { usePathname } from "next/navigation";

export function KeyboardShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const globalShortcuts = useGlobalKeyboardShortcuts();

  // Determine current page shortcuts
  const getCurrentPageShortcuts = () => {
    if (pathname.includes("/time-entries")) return pageShortcuts.timeEntries;
    if (pathname.includes("/clients")) return pageShortcuts.clients;
    if (pathname.includes("/invoices")) return pageShortcuts.invoices;
    if (pathname.includes("/reports")) return pageShortcuts.reports;
    return [];
  };

  const currentPageShortcuts = getCurrentPageShortcuts();

  // Listen for the custom event to show the modal
  useEffect(() => {
    const handleShowModal = () => setIsOpen(true);

    window.addEventListener("show-shortcuts-modal", handleShowModal);

    return () => {
      window.removeEventListener("show-shortcuts-modal", handleShowModal);
    };
  }, []);

  const getPageName = () => {
    if (pathname.includes("/time-entries")) return "Time Entries";
    if (pathname.includes("/clients")) return "Clients";
    if (pathname.includes("/invoices")) return "Invoices";
    if (pathname.includes("/reports")) return "Reports";
    return "Dashboard";
  };

  const ShortcutRow = ({
    shortcut,
    description,
  }: {
    shortcut: string;
    description: string;
  }) => (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{description}</span>
      <Badge variant="outline" className="font-mono text-xs">
        {shortcut}
      </Badge>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Boost your productivity with these keyboard shortcuts. Press{" "}
            <Badge variant="outline" className="font-mono text-xs mx-1">
              Shift + ?
            </Badge>{" "}
            to view this help.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Global Navigation Shortcuts */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Navigation className="h-4 w-4" />
              <h3 className="font-semibold">Navigation</h3>
            </div>
            <div className="space-y-1">
              {globalShortcuts
                .filter((s) => s.description.startsWith("Go to"))
                .map((shortcut, index) => (
                  <ShortcutRow
                    key={index}
                    shortcut={formatShortcut(shortcut)}
                    description={shortcut.description}
                  />
                ))}
            </div>
          </div>

          <Separator />

          {/* Global Actions */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Settings className="h-4 w-4" />
              <h3 className="font-semibold">Global Actions</h3>
            </div>
            <div className="space-y-1">
              {globalShortcuts
                .filter((s) => !s.description.startsWith("Go to"))
                .map((shortcut, index) => (
                  <ShortcutRow
                    key={index}
                    shortcut={formatShortcut(shortcut)}
                    description={shortcut.description}
                  />
                ))}
            </div>
          </div>

          {/* Page-specific shortcuts */}
          {currentPageShortcuts.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-4 w-4" />
                  <h3 className="font-semibold">{getPageName()} Actions</h3>
                </div>
                <div className="space-y-1">
                  {currentPageShortcuts.map((shortcut, index) => (
                    <ShortcutRow
                      key={index}
                      shortcut={formatShortcut(shortcut)}
                      description={shortcut.description}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Tips */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">💡 Tips</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>
                • Shortcuts work globally except when typing in input fields
              </li>
              <li>
                • Use{" "}
                <Badge variant="outline" className="font-mono text-xs mx-1">
                  Alt
                </Badge>{" "}
                + letter for navigation
              </li>
              <li>
                • Use{" "}
                <Badge variant="outline" className="font-mono text-xs mx-1">
                  Ctrl
                </Badge>{" "}
                + letter for actions
              </li>
              <li>
                • Press{" "}
                <Badge variant="outline" className="font-mono text-xs mx-1">
                  F
                </Badge>{" "}
                to focus search fields
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
