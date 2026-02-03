import { motion } from "framer-motion";
import { Brain, Mail, Phone, MapPin, Linkedin, Instagram, Youtube, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    produto: [
      { label: "Funcionalidades", href: "#features" },
      { label: "Preços", href: "#pricing" },
      { label: "Integrações", href: "#integrations" },
      { label: "Atualizações", href: "#" },
      { label: "Roadmap", href: "#" },
    ],
    recursos: [
      { label: "Blog", href: "#" },
      { label: "Tutoriais", href: "#" },
      { label: "Central de Ajuda", href: "#" },
      { label: "API Docs", href: "#" },
      { label: "Status", href: "#" },
    ],
    empresa: [
      { label: "Sobre Nós", href: "#" },
      { label: "Carreiras", href: "#" },
      { label: "Contato", href: "#" },
      { label: "Parceiros", href: "#" },
      { label: "Imprensa", href: "#" },
    ],
    legal: [
      { label: "Privacidade", href: "#" },
      { label: "Termos de Uso", href: "#" },
      { label: "LGPD", href: "#" },
      { label: "Cookies", href: "#" },
    ],
  };

  const socialLinks = [
    { icon: Linkedin, href: "#", label: "LinkedIn" },
    { icon: Instagram, href: "#", label: "Instagram" },
    { icon: Youtube, href: "#", label: "YouTube" },
    { icon: Twitter, href: "#", label: "Twitter" },
  ];

  return (
    <footer className="bg-muted/50 border-t border-border">
      {/* Newsletter Section */}
      <div className="border-b border-border">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h3 className="text-xl font-bold text-foreground mb-2">
                Fique por dentro das novidades
              </h3>
              <p className="text-muted-foreground">
                Receba dicas, atualizações e conteúdo exclusivo para psicólogos.
              </p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Input 
                type="email" 
                placeholder="Seu melhor email" 
                className="max-w-xs"
              />
              <Button variant="hero">
                Inscrever
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="col-span-2 space-y-6">
            <motion.a 
              href="/"
              className="flex items-center gap-3"
              whileHover={{ scale: 1.02 }}
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg">
                <Brain className="w-7 h-7 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold text-gradient-primary">
                PsicoOne
              </span>
            </motion.a>
            <p className="text-muted-foreground leading-relaxed">
              A plataforma completa para gestão de consultórios e clínicas de psicologia. 
              Automatize sua prática e foque no que importa: seus pacientes.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-primary" />
                <span>contato@psicoone.com.br</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-primary" />
                <span>+55 (11) 99999-9999</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-primary" />
                <span>São Paulo, Brasil</span>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex gap-3">
              {socialLinks.map((social, index) => (
                <motion.a
                  key={index}
                  href={social.href}
                  whileHover={{ scale: 1.1, y: -2 }}
                  className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Produto</h4>
            <ul className="space-y-3 text-sm">
              {footerLinks.produto.map((link, index) => (
                <li key={index}>
                  <a 
                    href={link.href} 
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Recursos</h4>
            <ul className="space-y-3 text-sm">
              {footerLinks.recursos.map((link, index) => (
                <li key={index}>
                  <a 
                    href={link.href} 
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Empresa</h4>
            <ul className="space-y-3 text-sm">
              {footerLinks.empresa.map((link, index) => (
                <li key={index}>
                  <a 
                    href={link.href} 
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Legal</h4>
            <ul className="space-y-3 text-sm">
              {footerLinks.legal.map((link, index) => (
                <li key={index}>
                  <a 
                    href={link.href} 
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground text-center md:text-left">
              © {currentYear} PsicoOne by SevenDevX. Todos os direitos reservados.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">LGPD</span>
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">HIPAA</span>
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">ISO27001</span>
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">CFP</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
