"use client";

import { Download, Link2, LogOut, MoreHorizontal, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** The owner's ⋯ menu in the hero's top-right corner: Edit profile,
 *  MonkeyType (manage when connected, import otherwise), Sign out. */
export function OwnerMenu({
  isMtConnected,
  onEdit,
  onOpenMt,
  onSignOut,
}: {
  isMtConnected: boolean;
  onEdit: () => void;
  onOpenMt: () => void;
  onSignOut: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label="Profile actions"
          className="size-11 text-muted-foreground sm:size-9"
        >
          <MoreHorizontal aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="min-w-52">
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil size={14} aria-hidden className="text-muted-foreground" />
          Edit profile
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onOpenMt}>
          {isMtConnected ? (
            <Link2 size={14} aria-hidden className="text-muted-foreground" />
          ) : (
            <Download size={14} aria-hidden className="text-muted-foreground" />
          )}
          {isMtConnected ? "MonkeyType sync" : "Import from MonkeyType"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onSignOut}>
          <LogOut size={14} aria-hidden className="text-muted-foreground" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
