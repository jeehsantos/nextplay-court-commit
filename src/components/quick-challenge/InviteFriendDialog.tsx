import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Copy, Check, Share2, MessageCircle } from "lucide-react";

interface InviteFriendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challengeId: string;
  sportName?: string;
  gameMode?: string;
}

export function InviteFriendDialog({
  open,
  onOpenChange,
  challengeId,
  sportName,
  gameMode,
}: InviteFriendDialogProps) {
  const [copied, setCopied] = useState(false);

  const lobbyUrl = `${window.location.origin}/quick-games/${challengeId}`;
  const shareText = `Join my ${sportName || "Quick Game"} match${gameMode ? ` (${gameMode})` : ""}! 🏟️`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(lobbyUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement("input");
      input.value = lobbyUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${sportName || "Quick Game"} - Join the Lobby!`,
          text: shareText,
          url: lobbyUrl,
        });
      } catch (err: any) {
        // User cancelled share - ignore AbortError
        if (err?.name !== "AbortError") {
          console.error("Share failed:", err);
        }
      }
    }
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`${shareText}\n${lobbyUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleFacebook = () => {
    const url = encodeURIComponent(lobbyUrl);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank");
  };

  const supportsNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
            <Share2 size={16} className="text-primary" />
            Invite Friend
          </DialogTitle>
          <DialogDescription className="text-xs">
            Share this link with your friends so they can join the lobby. If they
            don't have an account, they'll be prompted to register first.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-2">
          {/* Copy Link */}
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={lobbyUrl}
              className="text-xs font-mono truncate"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={handleCopy}
            >
              {copied ? (
                <Check size={16} className="text-green-500" />
              ) : (
                <Copy size={16} />
              )}
            </Button>
          </div>

          {/* Share Buttons */}
          <div className="flex flex-col gap-2">
            {supportsNativeShare && (
              <Button
                variant="default"
                className="w-full gap-2 font-bold text-xs uppercase tracking-wide"
                onClick={handleNativeShare}
              >
                <Share2 size={14} />
                Share via...
              </Button>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-2 font-bold text-xs"
                onClick={handleWhatsApp}
              >
                <MessageCircle size={14} className="text-green-500" />
                WhatsApp
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2 font-bold text-xs"
                onClick={handleFacebook}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5 text-blue-600 fill-current"
                >
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Facebook
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
