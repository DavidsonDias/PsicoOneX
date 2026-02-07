import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, X, FileText, Image as ImageIcon, File, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface PendingFile {
  id: string;
  file: File;
  preview?: string;
}

interface AttachmentUploaderProps {
  pendingFiles: PendingFile[];
  onFilesChange: (files: PendingFile[]) => void;
  onPreview?: (file: PendingFile) => void;
  disabled?: boolean;
  className?: string;
}

export function AttachmentUploader({ 
  pendingFiles, 
  onFilesChange, 
  onPreview,
  disabled = false,
  className 
}: AttachmentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="h-4 w-4 text-primary" />;
    if (type === "application/pdf") return <FileText className="h-4 w-4 text-destructive" />;
    return <File className="h-4 w-4 text-muted-foreground" />;
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    const newFiles: PendingFile[] = [];

    Array.from(files).forEach(file => {
      if (file.size > maxSize) {
        return; // Skip files over 10MB
      }

      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      let preview: string | undefined;

      if (file.type.startsWith("image/")) {
        preview = URL.createObjectURL(file);
      }

      newFiles.push({ id, file, preview });
    });

    onFilesChange([...pendingFiles, ...newFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removeFile = (id: string) => {
    const file = pendingFiles.find(f => f.id === id);
    if (file?.preview) {
      URL.revokeObjectURL(file.preview);
    }
    onFilesChange(pendingFiles.filter(f => f.id !== id));
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
          isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={() => !disabled && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={disabled}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
        />
        <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          Arraste arquivos ou <span className="text-primary font-medium">clique para selecionar</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Imagens, PDFs e documentos (máx. 10MB cada)
        </p>
      </div>

      {/* Pending Files List */}
      {pendingFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              Arquivos selecionados ({pendingFiles.length})
            </p>
            <Badge variant="secondary" className="text-xs">
              Serão salvos com o prontuário
            </Badge>
          </div>
          <div className="grid gap-2">
            {pendingFiles.map((pf) => (
              <div
                key={pf.id}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg group"
              >
                {/* Preview or Icon */}
                {pf.preview ? (
                  <img
                    src={pf.preview}
                    alt={pf.file.name}
                    className="h-10 w-10 object-cover rounded"
                  />
                ) : (
                  <div className="h-10 w-10 bg-background rounded flex items-center justify-center">
                    {getFileIcon(pf.file.type)}
                  </div>
                )}

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{pf.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(pf.file.size)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {onPreview && (pf.file.type.startsWith("image/") || pf.file.type === "application/pdf") && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreview(pf);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(pf.id);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
