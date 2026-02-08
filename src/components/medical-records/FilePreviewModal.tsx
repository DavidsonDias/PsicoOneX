import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileText, Image as ImageIcon, File, ZoomIn, ZoomOut, RotateCw, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface FilePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: {
    name: string;
    type: string;
    size: number;
    url: string;
    createdAt?: string;
  } | null;
  onDownload: () => void;
}

export function FilePreviewModal({ open, onOpenChange, file, onDownload }: FilePreviewModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [imageLoading, setImageLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  // Reset state when file changes
  useEffect(() => {
    if (file?.url) {
      setImageLoading(true);
      setLoadError(false);
      setBlobUrl(file.url);
    }
    return () => {
      // Cleanup blob URL when component unmounts or file changes
      if (blobUrl && blobUrl.startsWith('blob:')) {
        // Don't revoke here as it may still be in use
      }
    };
  }, [file?.url]);

  if (!file) return null;

  const isImage = file.type.startsWith("image/");
  const isPDF = file.type === "application/pdf";
  const isHEIC = file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
  const isPreviewable = (isImage && !isHEIC) || isPDF;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const resetView = () => {
    setZoom(1);
    setRotation(0);
    setImageLoading(true);
    setLoadError(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetView();
    }
    onOpenChange(newOpen);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
    setLoadError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setLoadError(true);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isImage ? (
                <ImageIcon className="h-5 w-5 text-primary" />
              ) : isPDF ? (
                <FileText className="h-5 w-5 text-destructive" />
              ) : (
                <File className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <DialogTitle className="text-base font-semibold">{file.name}</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatFileSize(file.size)}
                  {file.createdAt && ` • ${format(new Date(file.createdAt), "dd/MM/yyyy HH:mm")}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onDownload} className="gap-2">
                <Download className="h-4 w-4" />
                Baixar
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Toolbar for images */}
        {isImage && !isHEIC && !loadError && (
          <div className="px-6 py-2 border-b border-border flex items-center justify-center gap-2 bg-muted/30">
            <Button variant="ghost" size="sm" onClick={handleZoomOut} disabled={zoom <= 0.5}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button variant="ghost" size="sm" onClick={handleZoomIn} disabled={zoom >= 3}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <div className="w-px h-4 bg-border mx-2" />
            <Button variant="ghost" size="sm" onClick={handleRotate}>
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto bg-muted/20 flex items-center justify-center p-4 min-h-[400px]">
          {isHEIC ? (
            <div className="text-center py-12">
              <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">Formato HEIC não suportado</p>
              <p className="text-muted-foreground mb-4 max-w-md">
                Arquivos HEIC não podem ser visualizados diretamente no navegador. 
                Baixe o arquivo para visualizar ou converta para JPG/PNG.
              </p>
              <Button onClick={onDownload} className="gap-2">
                <Download className="h-4 w-4" />
                Baixar arquivo
              </Button>
            </div>
          ) : isImage ? (
            <div className="relative">
              {imageLoading && !loadError && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              )}
              {loadError ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">Erro ao carregar imagem</p>
                  <p className="text-muted-foreground mb-4">
                    Não foi possível carregar a pré-visualização
                  </p>
                  <Button onClick={onDownload} className="gap-2">
                    <Download className="h-4 w-4" />
                    Baixar arquivo
                  </Button>
                </div>
              ) : (
                <img
                  src={blobUrl || file.url}
                  alt={file.name}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  className={cn(
                    "max-w-full max-h-[60vh] object-contain transition-all duration-200 rounded-lg shadow-lg",
                    imageLoading && "opacity-0"
                  )}
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  }}
                />
              )}
            </div>
          ) : isPDF ? (
            <div className="w-full h-[70vh] flex flex-col items-center justify-center">
              <object
                data={blobUrl || file.url}
                type="application/pdf"
                className="w-full h-full rounded-lg border border-border"
              >
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-destructive mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">PDF Viewer</p>
                  <p className="text-muted-foreground mb-4">
                    Seu navegador não suporta visualização de PDF inline
                  </p>
                  <Button onClick={onDownload} className="gap-2">
                    <Download className="h-4 w-4" />
                    Baixar PDF
                  </Button>
                </div>
              </object>
            </div>
          ) : (
            <div className="text-center py-12">
              <File className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                Pré-visualização não disponível para este tipo de arquivo
              </p>
              <Button onClick={onDownload} className="gap-2">
                <Download className="h-4 w-4" />
                Baixar arquivo
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}