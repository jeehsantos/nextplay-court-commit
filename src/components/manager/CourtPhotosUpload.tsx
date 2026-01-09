import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ImagePlus, X, Loader2, GripVertical } from "lucide-react";
import { toast } from "sonner";

interface CourtPhotosUploadProps {
  currentPhotoUrls: string[];
  onPhotosChanged: (urls: string[]) => void;
  maxPhotos?: number;
}

export function CourtPhotosUpload({
  currentPhotoUrls,
  onPhotosChanged,
  maxPhotos = 4,
}: CourtPhotosUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>(currentPhotoUrls || []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxPhotos - photoUrls.length;
    if (remainingSlots <= 0) {
      toast.error(`Maximum ${maxPhotos} photos allowed`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    
    // Validate all files
    for (const file of filesToUpload) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select only image files");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Each image must be less than 5MB");
        return;
      }
    }

    setUploading(true);
    const newUrls: string[] = [];

    try {
      for (const file of filesToUpload) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `courts/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("court-photos")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("court-photos")
          .getPublicUrl(filePath);

        newUrls.push(publicUrl);
      }

      const updatedUrls = [...photoUrls, ...newUrls];
      setPhotoUrls(updatedUrls);
      onPhotosChanged(updatedUrls);
      toast.success(`${newUrls.length} photo${newUrls.length > 1 ? 's' : ''} uploaded`);
    } catch (error: any) {
      console.error("Error uploading photos:", error);
      toast.error(error.message || "Failed to upload photos");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = (index: number) => {
    const updatedUrls = photoUrls.filter((_, i) => i !== index);
    setPhotoUrls(updatedUrls);
    onPhotosChanged(updatedUrls);
  };

  const movePhoto = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= photoUrls.length) return;
    const updatedUrls = [...photoUrls];
    const [movedItem] = updatedUrls.splice(fromIndex, 1);
    updatedUrls.splice(toIndex, 0, movedItem);
    setPhotoUrls(updatedUrls);
    onPhotosChanged(updatedUrls);
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Photo Grid */}
      <div className="grid grid-cols-2 gap-3">
        {photoUrls.map((url, index) => (
          <div 
            key={url} 
            className={`relative group rounded-xl overflow-hidden border border-border bg-muted ${
              index === 0 ? 'col-span-2 aspect-video' : 'aspect-square'
            }`}
          >
            <img
              src={url}
              alt={`Court photo ${index + 1}`}
              className="w-full h-full object-cover"
            />
            {/* Overlay with actions */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              {index > 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => movePhoto(index, 0)}
                  title="Set as main photo"
                >
                  <span className="text-xs font-bold">1st</span>
                </Button>
              )}
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleRemove(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {/* Badge for main photo */}
            {index === 0 && (
              <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full font-medium">
                Main Photo
              </div>
            )}
          </div>
        ))}

        {/* Add Photo Button */}
        {photoUrls.length < maxPhotos && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={`rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 bg-muted/30 hover:bg-muted/50 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
              photoUrls.length === 0 ? 'col-span-2 aspect-video' : 'aspect-square'
            }`}
          >
            {uploading ? (
              <>
                <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                <span className="text-sm text-muted-foreground">Uploading...</span>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <ImagePlus className="h-6 w-6 text-primary" />
                </div>
                <div className="text-center px-2">
                  <p className="font-medium text-foreground text-sm">Add Photo</p>
                  <p className="text-xs text-muted-foreground">
                    {photoUrls.length}/{maxPhotos} photos
                  </p>
                </div>
              </>
            )}
          </button>
        )}
      </div>

      {/* Help text */}
      <p className="text-xs text-muted-foreground text-center">
        Upload up to {maxPhotos} photos. First photo will be the main image. JPG, PNG, WebP up to 5MB each.
      </p>
    </div>
  );
}
