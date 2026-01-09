import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ImagePlus, X, Loader2, Camera } from "lucide-react";
import { toast } from "sonner";

interface CourtPhotoUploadProps {
  currentPhotoUrl?: string | null;
  onPhotoUploaded: (url: string) => void;
  onPhotoRemoved: () => void;
}

export function CourtPhotoUpload({
  currentPhotoUrl,
  onPhotoUploaded,
  onPhotoRemoved,
}: CourtPhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhotoUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploading(true);

    try {
      // Create unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `courts/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("court-photos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("court-photos")
        .getPublicUrl(filePath);

      setPreviewUrl(publicUrl);
      onPhotoUploaded(publicUrl);
      toast.success("Photo uploaded successfully");
    } catch (error: any) {
      console.error("Error uploading photo:", error);
      toast.error(error.message || "Failed to upload photo");
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onPhotoRemoved();
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {previewUrl ? (
        <div className="relative group">
          <div className="aspect-video rounded-xl overflow-hidden border border-border bg-muted">
            <img
              src={previewUrl}
              alt="Court preview"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Camera className="h-4 w-4 mr-2" />
              Change
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              disabled={uploading}
            >
              <X className="h-4 w-4 mr-2" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full aspect-video rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 bg-muted/30 hover:bg-muted/50 transition-all flex flex-col items-center justify-center gap-3 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
              <span className="text-sm text-muted-foreground">Uploading...</span>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <ImagePlus className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-medium text-foreground">Upload Court Photo</p>
                <p className="text-sm text-muted-foreground">
                  Click to browse or drag and drop
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG, WebP up to 5MB
                </p>
              </div>
            </>
          )}
        </button>
      )}
    </div>
  );
}