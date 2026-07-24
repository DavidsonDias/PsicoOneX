import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BrandHeader } from "@/components/shared/BrandHeader";

interface DocumentPreviewProps {
  type: "receipt" | "declaration" | "certificate" | "report";
  data: {
    patientName: string;
    patientCpf?: string;
    professionalName: string;
    professionalCrp: string;
    clinicName?: string;
    logoUrl?: string | null;
    value?: number;
    date: Date;
    sessionCount?: number;
    content?: string;
    signature?: string | null;
  };
}

export function DocumentPreview({ type, data }: DocumentPreviewProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const extenso = (valor: number) => {
    const unidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
    const teens = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
    const dezenas = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
    const centenas = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

    if (valor === 0) return "zero reais";
    if (valor === 100) return "cem reais";

    const inteiro = Math.floor(valor);
    const centavos = Math.round((valor - inteiro) * 100);

    let resultado = "";

    if (inteiro >= 100) {
      resultado += centenas[Math.floor(inteiro / 100)];
      const resto = inteiro % 100;
      if (resto > 0) resultado += " e ";
    }

    const resto = inteiro % 100;
    if (resto >= 10 && resto <= 19) {
      resultado += teens[resto - 10];
    } else if (resto >= 20) {
      resultado += dezenas[Math.floor(resto / 10)];
      if (resto % 10 > 0) resultado += " e " + unidades[resto % 10];
    } else if (resto > 0) {
      resultado += unidades[resto];
    }

    resultado += inteiro === 1 ? " real" : " reais";

    if (centavos > 0) {
      resultado += " e ";
      if (centavos >= 10 && centavos <= 19) {
        resultado += teens[centavos - 10];
      } else if (centavos >= 20) {
        resultado += dezenas[Math.floor(centavos / 10)];
        if (centavos % 10 > 0) resultado += " e " + unidades[centavos % 10];
      } else {
        resultado += unidades[centavos];
      }
      resultado += centavos === 1 ? " centavo" : " centavos";
    }

    return resultado;
  };

  // Explicit dark text on white paper — never rely on theme tokens here so the
  // document stays legible both on-screen (light preview) and when printed.
  const ink = "text-slate-900";
  const inkMuted = "text-slate-600";
  const rule = "border-slate-300";

  const Signature = () => (
    <div className={`mt-12 pt-8 border-t ${rule}`}>
      <div className="flex flex-col items-center">
        {data.signature ? (
          <img src={data.signature} alt="Assinatura" className="h-16 mb-2" />
        ) : (
          <div className="w-64 border-b border-slate-900 mb-2" />
        )}
        <p className={`font-medium ${ink}`}>{data.professionalName}</p>
        <p className={`text-sm ${inkMuted}`}>Psicólogo(a) - CRP {data.professionalCrp}</p>
      </div>
    </div>
  );

  const Title = ({ children }: { children: React.ReactNode }) => (
    <div className={`text-center border-b pb-4 ${rule}`}>
      <h2 className={`text-xl font-bold uppercase tracking-wide ${ink}`}>{children}</h2>
    </div>
  );

  const renderReceipt = () => (
    <div className={`space-y-6 ${ink}`}>
      <BrandHeader logoUrl={data.logoUrl} clinicName={data.clinicName} className="mb-2" />
      <Title>Recibo de Pagamento</Title>

      <div className="space-y-4 text-sm leading-relaxed">
        <p>
          Recebi de <strong>{data.patientName}</strong>
          {data.patientCpf && <span> (CPF: {data.patientCpf})</span>},
          a quantia de <strong>{formatCurrency(data.value || 0)}</strong> ({extenso(data.value || 0)}),
          referente a {data.sessionCount || 1} sessão(ões) de atendimento psicológico.
        </p>

        <p className="text-right mt-8">
          {format(data.date, "'Local', dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      <Signature />
    </div>
  );

  const renderDeclaration = () => (
    <div className={`space-y-6 ${ink}`}>
      <BrandHeader logoUrl={data.logoUrl} clinicName={data.clinicName} className="mb-2" />
      <Title>Declaração de Comparecimento</Title>

      <div className="space-y-4 text-sm leading-relaxed">
        <p>
          Declaro, para os devidos fins, que <strong>{data.patientName}</strong>
          {data.patientCpf && <span> (CPF: {data.patientCpf})</span>} compareceu a
          sessão de atendimento psicológico nesta data.
        </p>

        <p>
          Data do atendimento: <strong>{format(data.date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</strong>
        </p>

        <p className="text-right mt-8">
          {format(new Date(), "'Local', dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      <Signature />
    </div>
  );

  const renderCertificate = () => (
    <div className={`space-y-6 ${ink}`}>
      <BrandHeader logoUrl={data.logoUrl} clinicName={data.clinicName} className="mb-2" />
      <Title>Atestado Psicológico</Title>

      <div className="space-y-4 text-sm leading-relaxed">
        <p>
          Atesto, para os devidos fins, que <strong>{data.patientName}</strong>
          {data.patientCpf && <span> (CPF: {data.patientCpf})</span>} encontra-se
          em acompanhamento psicológico desde {format(data.date, "dd/MM/yyyy", { locale: ptBR })}.
        </p>

        {data.content && (
          <div className="bg-slate-100 p-4 rounded-lg">
            <p>{data.content}</p>
          </div>
        )}

        <p className="text-right mt-8">
          {format(new Date(), "'Local', dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      <Signature />
    </div>
  );

  const renderReport = () => (
    <div className={`space-y-6 ${ink}`}>
      <BrandHeader logoUrl={data.logoUrl} clinicName={data.clinicName} className="mb-2" />
      <Title>Relatório Psicológico</Title>

      <div className="space-y-4 text-sm">
        <div>
          <p className="font-medium">Paciente:</p>
          <p>{data.patientName}</p>
          {data.patientCpf && <p className={inkMuted}>CPF: {data.patientCpf}</p>}
        </div>

        <div>
          <p className="font-medium">Data de Emissão:</p>
          <p>{format(new Date(), "dd/MM/yyyy", { locale: ptBR })}</p>
        </div>

        {data.content && (
          <div className="mt-4">
            <p className="font-medium mb-2">Conteúdo:</p>
            <div className="bg-slate-100 p-4 rounded-lg whitespace-pre-wrap">
              {data.content}
            </div>
          </div>
        )}
      </div>

      <Signature />
    </div>
  );

  return (
    <div
      className="bg-white p-8 rounded-lg border shadow-sm min-h-[500px] text-slate-900"
      id="document-preview"
    >
      {type === "receipt" && renderReceipt()}
      {type === "declaration" && renderDeclaration()}
      {type === "certificate" && renderCertificate()}
      {type === "report" && renderReport()}
    </div>
  );
}
