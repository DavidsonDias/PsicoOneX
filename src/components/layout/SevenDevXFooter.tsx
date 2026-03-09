import { ExternalLink } from "lucide-react";

export function SevenDevXFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="flex items-center justify-center gap-2 py-3 px-6 text-xs text-muted-foreground border-t bg-muted/20">
      <span>© {currentYear} SevenDevX — Todos os direitos reservados.</span>
      <span className="text-muted-foreground/70">|</span>
      <a
        href="https://SevenDevX.com"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 hover:text-primary transition-colors"
      >
        <span>Powered by SevenDevX</span>
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}