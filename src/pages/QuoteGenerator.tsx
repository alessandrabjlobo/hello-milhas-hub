import { ArrowLeft, Upload, X, Copy, Download, Save, Plus } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect, useMemo, type ChangeEvent } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RoundTripForm } from "@/components/calculator/RoundTripForm";
import { type FlightSegment } from "@/components/sales/FlightSegmentForm";
import { useStorage } from "@/hooks/useStorage";
import { useToast } from "@/hooks/use-toast";
import { usePaymentInterestConfig } from "@/hooks/usePaymentInterestConfig";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { supabase } from "@/integrations/supabase/client";
import { formatNumber } from "@/lib/utils";

type TripType = "one_way" | "round_trip" | "multi_city";

const parseLocalDateFromInput = (value: string) => {
  if (!value) return null;
  const [year, month, day] = value.split("-");
  return new Date(Number(year), Number(month) - 1, Number(day));
};

export default function QuoteGenerator() {
  const navigate = useNavigate();
  const { quoteId } = useParams();
  const { toast } = useToast();
  const { uploading, uploadTicketFile, refreshSignedUrls } = useStorage();
  const { configs: interestConfigs, calculateInstallmentValue } = usePaymentInterestConfig();
  const { activeMethods } = usePaymentMethods();

  // ========== ESTADOS ==========
  const [isEditMode, setIsEditMode] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(false);
  // Dados do Cliente
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [airline, setAirline] = useState("");

  // Dados da Viagem
  const [tripType, setTripType] = useState<TripType>("round_trip");
  const [roundTripData, setRoundTripData] = useState({
    origin: "",
    destination: "",
    departureDate: "",
    returnDate: "",
    miles: 0, // usado só para “Só Ida”
    milesOutbound: 0, // ida / pax
    milesReturn: 0, // volta / pax
  });

  // Multi-city segments
  const [flightSegments, setFlightSegments] = useState<FlightSegment[]>([
    { from: "", to: "", date: "", miles: 0 },
  ]);

  // Calculadora (milhas/pax)
  const [tripMiles, setTripMiles] = useState("50000");
  const [milesUsed, setMilesUsed] = useState("50000"); // milhas/pax
  const [costPerMile, setCostPerMile] = useState("29,00"); // valor do milheiro (salvo no banco)
  const [boardingFee, setBoardingFee] = useState("35,00");
  const [passengers, setPassengers] = useState("2");
  const [targetMargin, setTargetMargin] = useState("20"); // markup nas milhas
  const [manualPrice, setManualPrice] = useState("");

  // Caderno do Orçamento
  const [quoteTitle, setQuoteTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // UI
  const [saving, setSaving] = useState(false);
  const [activeMessageTab, setActiveMessageTab] = useState("client");

  // ========== AUTO-GERAÇÃO DO NOME DO ORÇAMENTO ==========
  useEffect(() => {
    if (
      clientName &&
      roundTripData.destination &&
      roundTripData.departureDate &&
      !quoteTitle
    ) {
      try {
        const date = parseLocalDateFromInput(roundTripData.departureDate);

        if (date) {
          const monthYear = format(date, "MMM/yyyy", { locale: ptBR });
          const autoTitle = `Viagem ${clientName} - ${roundTripData.destination} ${monthYear}`;
          setQuoteTitle(autoTitle);
        }
      } catch {
        // ignore
      }
    }
  }, [clientName, roundTripData.destination, roundTripData.departureDate, quoteTitle]);

  // ========== CARREGAR ORÇAMENTO EXISTENTE ==========
  const loadExistingQuote = async (id: string) => {
    try {
      setLoadingQuote(true);
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        console.log("📦 [QuoteGenerator] Carregando orçamento existente:", data);

        setClientName(data.client_name || "");
        setClientPhone(data.client_phone || "");
        setAirline(data.company_name || "");

        setTripType((data.trip_type || "round_trip") as TripType);
        setPassengers(data.passengers?.toString() || "1");

        // milhas/pax salvas no orçamento
        setMilesUsed(data.miles_needed?.toString() || "0");
        setBoardingFee(data.boarding_fee?.toString() || "0");

        // 🔢 Valor do milheiro salvo
        if (data.cost_per_mile != null) {
          const formatted = Number(data.cost_per_mile).toFixed(2).replace(".", ",");
          setCostPerMile(formatted);
          console.log(`✅ [LOAD] Valor do milheiro carregado: R$ ${formatted}`);
        } else {
          setCostPerMile("29,00");
          console.warn("⚠️ [LOAD] cost_per_mile não encontrado, usando padrão: R$ 29,00");
        }

        // 🔁 Montar roundTripData de acordo com o tipo
        if (data.trip_type === "round_trip") {
          const segment = (data.flight_segments?.[0] as any) || {};

          const totalMilesPerPassenger = data.miles_needed || 0;
          const defaultPerLeg = totalMilesPerPassenger > 0 ? totalMilesPerPassenger / 2 : 0;

          const milesOutbound = segment.milesOutbound ?? segment.miles_ida ?? defaultPerLeg;
          const milesReturn = segment.milesReturn ?? segment.miles_volta ?? defaultPerLeg;

          setRoundTripData({
            origin: segment.origin || "",
            destination: segment.destination || "",
            departureDate: segment.departureDate || segment.departure_date || "",
            returnDate: segment.returnDate || segment.return_date || "",
            miles: 0,
            milesOutbound,
            milesReturn,
          });

          const milesPerPassenger = (milesOutbound || 0) + (milesReturn || 0);
          if (milesPerPassenger > 0) {
            const v = milesPerPassenger.toString();
            setMilesUsed(v);
            setTripMiles(v);
          }
        } else if (data.trip_type === "one_way") {
          const segment = (data.flight_segments?.[0] as any) || {};

          const milesPerPassenger = data.miles_needed || segment.miles || 0;

          setRoundTripData({
            origin: segment.origin || "",
            destination: segment.destination || "",
            departureDate: segment.departureDate || segment.departure_date || "",
            returnDate: "",
            miles: milesPerPassenger,
            milesOutbound: 0,
            milesReturn: 0,
          });

          if (milesPerPassenger > 0) {
            const v = milesPerPassenger.toString();
            setMilesUsed(v);
            setTripMiles(v);
          }
        } else if (data.trip_type === "multi_city" && Array.isArray(data.flight_segments)) {
          setFlightSegments(data.flight_segments as unknown as FlightSegment[]);
        }

        if (Array.isArray(data.attachments) && data.attachments.length > 0) {
          toast({
            title: "Carregando anexos...",
            description: "Validando imagens do orçamento",
          });

          const refreshedUrls = await refreshSignedUrls(data.attachments as string[]);
          setAttachments(refreshedUrls);

          if (JSON.stringify(refreshedUrls) !== JSON.stringify(data.attachments)) {
            await supabase
              .from("quotes")
              .update({ attachments: refreshedUrls })
              .eq("id", quoteId);
            console.log("[LOAD] URLs atualizadas no banco");
          }
        }

        setNotes(data.notes || "");
        setQuoteTitle(data.quote_title || "");
        setIsEditMode(true);

        toast({
          title: "Orçamento carregado",
          description: "Dados carregados com sucesso",
        });
      }
    } catch (error: any) {
      console.error("❌ [QuoteGenerator] Erro ao carregar:", error);
      toast({
        title: "Erro ao carregar orçamento",
        description: error.message,
        variant: "destructive",
      });
      navigate("/quotes");
    } finally {
      setLoadingQuote(false);
    }
  };

  useEffect(() => {
    if (quoteId) {
      loadExistingQuote(quoteId);
    }
  }, [quoteId]);

  // ========== SINCRONIZAÇÃO FORMULÁRIO ↔ CALCULADORA ==========
  useEffect(() => {
    if (tripMiles !== milesUsed) {
      setMilesUsed(tripMiles);
    }
  }, [tripMiles]);

  useEffect(() => {
    if (milesUsed !== tripMiles) {
      setTripMiles(milesUsed);
    }
  }, [milesUsed]);

  // Para ida / ida e volta: usar soma ida+volta como milhas/pax
  useEffect(() => {
    if (tripType === "round_trip") {
      const milesPerPassenger =
        (roundTripData.milesOutbound || 0) + (roundTripData.milesReturn || 0);

      if (milesPerPassenger > 0) {
        const v = milesPerPassenger.toString();
        if (milesUsed !== v) setMilesUsed(v);
        if (tripMiles !== v) setTripMiles(v);
      }
    } else if (tripType === "one_way" && roundTripData.miles && roundTripData.miles > 0) {
      const v = roundTripData.miles.toString();
      if (milesUsed !== v) setMilesUsed(v);
      if (tripMiles !== v) setTripMiles(v);
    }
  }, [
    tripType,
    roundTripData.miles,
    roundTripData.milesOutbound,
    roundTripData.milesReturn,
    milesUsed,
    tripMiles,
  ]);

  // ========== MULTI-TRECHOS: CALCULAR TOTAL DE MILHAS ==========
  const totalMilesFromSegments = useMemo(
    () => flightSegments.reduce((sum, seg) => sum + (seg.miles || 0), 0),
    [flightSegments]
  );

  useEffect(() => {
    if (tripType === "multi_city" && totalMilesFromSegments > 0) {
      const v = totalMilesFromSegments.toString();
      setMilesUsed(v);
      setTripMiles(v);
    }
  }, [tripType, totalMilesFromSegments]);

  // ========== FUNÇÕES MULTI-TRECHOS ==========
  const handleAddSegment = () => {
    setFlightSegments([...flightSegments, { from: "", to: "", date: "", miles: 0 }]);
  };

  const handleRemoveSegment = (index: number) => {
    if (flightSegments.length > 1) {
      setFlightSegments(flightSegments.filter((_, i) => i !== index));
    }
  };

  const handleUpdateSegment = (
    index: number,
    field: keyof FlightSegment,
    value: string | number
  ) => {
    const updated = [...flightSegments];
    updated[index] = { ...updated[index], [field]: value };
    setFlightSegments(updated);
  };

  // Helpers de parse
  const parseMiles = (value: string) =>
    parseFloat(value.replace(/\./g, "").replace(",", ".")) || 0;

  // >>> parseCurrency, aceitanto BR e US e distintos milhares <<<
  const parseCurrency = (value: string) => {
    if (!value) return 0;
    const cleaned = value.replace(/\s/g, "");
    if (!cleaned) return 0;

    // Tem vírgula: formato BR -> vírgula decimal, ponto de milhar
    if (cleaned.includes(",")) {
      return parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
    }

    // Sem vírgula: se for "123.45" ou "29.0" (1–2 casas), trata ponto como decimal
    if (/^\d+\.\d{1,2}$/.test(cleaned)) {
      return parseFloat(cleaned);
    }

    // Caso contrário, trata ponto como separador de milhar: "2.970" -> 2970
    return parseFloat(cleaned.replace(/\./g, ""));
  };

  // ========== DESCRIÇÃO DE PAGAMENTO ==========
  const paymentOptionsDescription = useMemo(() => {
    if (!activeMethods || activeMethods.length === 0) {
      return "Pix, Cartão de Crédito e Cartão de Débito";
    }
    const labels = activeMethods.map((m) => m.method_name).filter(Boolean);

    if (labels.length === 0) {
      return "Pix, Cartão de Crédito e Cartão de Débito";
    }

    return labels.join(" | ");
  }, [activeMethods]);

  const calculatedValues = useMemo(() => {
    const milesPerPassenger = parseMiles(milesUsed); // milhas/pax
    const costPerMileNum = parseCurrency(costPerMile); // valor do milheiro
    const boardingFeeNum = parseCurrency(boardingFee);
    const passengersNum = parseInt(passengers) || 1;
    const marginNum = parseCurrency(targetMargin);

    const totalMiles = milesPerPassenger * passengersNum;

    const costMilesPerPassenger = (milesPerPassenger / 1000) * costPerMileNum;
    const totalMilesCost = costMilesPerPassenger * passengersNum;

    const costPerPassenger = costMilesPerPassenger + boardingFeeNum;
    const totalCost = costPerPassenger * passengersNum;

    // 💡 preço sugerido por passageiro (usando markup)
    const suggestedPricePerPassenger =
      costMilesPerPassenger * (1 + marginNum / 100) + boardingFeeNum;
    const suggestedPrice = suggestedPricePerPassenger * passengersNum;

    // 🔹 AGORA: manualPrice é valor *por passageiro*
    let finalPricePerPassenger = suggestedPricePerPassenger;

    if (manualPrice) {
      const manualPerPassenger = parseCurrency(manualPrice);
      if (manualPerPassenger > 0) {
        finalPricePerPassenger = manualPerPassenger;
      }
    }

    const finalPrice = finalPricePerPassenger * passengersNum;

    const profit = finalPrice - totalCost;
    const profitMargin = finalPrice > 0 ? (profit / finalPrice) * 100 : 0;

    const effectiveMilesPricePerPassenger = Math.max(
      finalPricePerPassenger - boardingFeeNum,
      0
    );

    let milesMarkup = 0;
    if (costMilesPerPassenger > 0) {
      milesMarkup =
        ((effectiveMilesPricePerPassenger - costMilesPerPassenger) /
          costMilesPerPassenger) *
        100;
    }

    return {
      totalCost,
      price: finalPrice, // TOTAL
      profit,
      profitMargin,
      milesPerPassenger,
      totalMiles,
      costMilesPerPassenger,
      totalMilesCost,
      costPerPassenger,
      finalPricePerPassenger, // 💰 preço POR PASSAGEIRO
      suggestedPrice,
      suggestedPricePerPassenger,
      milesMarkup,
    };
  }, [milesUsed, costPerMile, boardingFee, passengers, targetMargin, manualPrice]);

  // ========== UPLOAD DE IMAGENS ==========
  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Erro de autenticação",
        description: "Faça login para fazer upload de imagens",
        variant: "destructive",
      });
      return;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("supplier_id")
      .eq("id", user.id)
      .single();

    if (!profileData?.supplier_id) {
      toast({
        title: "Erro",
        description: "Perfil de fornecedor não encontrado",
        variant: "destructive",
      });
      return;
    }

    const tempQuoteId = `quote-${Date.now()}`;
    const url = await uploadTicketFile(profileData.supplier_id, tempQuoteId, file);

    if (url) {
      setAttachments([...attachments, url]);
      toast({
        title: "Print adicionado!",
        description: "Imagem salva com sucesso",
      });
    }

    e.target.value = "";
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
    toast({
      title: "Print removido",
      description: "Imagem removida do orçamento",
    });
  };

  // ========== DESCRIÇÃO DE PARCELAMENTO COM TABELA ==========
  const buildInstallmentsDescription = () => {
    if (!interestConfigs || interestConfigs.length === 0) return "";

    const lines: string[] = [];

    // 1) Crédito - COM TABELA DE PARCELAS
    const creditConfigs = interestConfigs.filter(
      (c) => c.payment_type === "credit" && c.is_active
    );
    if (creditConfigs.length > 0) {
      const maxInstallments = Math.max(...creditConfigs.map((c) => c.installments));

      lines.push(`💳 *Cartão de Crédito:*`);

      for (let i = 1; i <= maxInstallments; i++) {
        const result = calculateInstallmentValue(calculatedValues.price, i, "credit");

        const installmentValueFormatted = result.installmentValue
          .toFixed(2)
          .replace(".", ",");

        lines.push(`  ${i}x de R$ ${installmentValueFormatted}`);
      }
    }

    // 2) Débito - sempre 1x, mas respeitando juros configurados
    const debitConfigs = interestConfigs.filter(
      (c) => c.payment_type === "debit" && c.is_active
    );

    if (debitConfigs.length > 0) {
      const result = calculateInstallmentValue(calculatedValues.price, 1, "debit");

      const debitValueFormatted = result.installmentValue
        .toFixed(2)
        .replace(".", ",");

      lines.push(`\n💳 *Débito à vista:* R$ ${debitValueFormatted}`);
    }

    // 3) Pix à vista
    const hasPix = activeMethods?.some((m) =>
      m.method_name?.toLowerCase().includes("pix")
    );
    if (hasPix && !interestConfigs.some((c) => c.payment_type === ("pix" as any))) {
      const pixValueFormatted = calculatedValues.price.toFixed(2).replace(".", ",");

      lines.push(`\n🔁 *Pix à vista:* R$ ${pixValueFormatted}`);
    }

    return lines.length > 0 ? lines.join("\n") : "";
  };

  // ========== MENSAGEM CLIENTE ==========
  const generateClientMessage = () => {
    const route =
      roundTripData.origin && roundTripData.destination
        ? `${roundTripData.origin} → ${roundTripData.destination}`
        : "Consulte o roteiro completo";

    const departureDateObj = parseLocalDateFromInput(roundTripData.departureDate);
    const returnDateObj =
      tripType === "round_trip" ? parseLocalDateFromInput(roundTripData.returnDate) : null;

    const departureFormatted = departureDateObj
      ? format(departureDateObj, "dd/MM/yyyy", { locale: ptBR })
      : "A definir";

    const returnFormatted =
      tripType === "round_trip" && returnDateObj
        ? format(returnDateObj, "dd/MM/yyyy", { locale: ptBR })
        : null;

    const datesBlock =
      tripType === "round_trip" && returnFormatted
        ? `📅 *Data Ida:* ${departureFormatted}\n📅 *Data Volta:* ${returnFormatted}`
        : `📅 *Data:* ${departureFormatted}`;

    const tripTypeText =
      tripType === "round_trip"
        ? "Ida e Volta"
        : tripType === "one_way"
        ? "Somente Ida"
        : "Múltiplos Trechos";

    const installmentsText = buildInstallmentsDescription();
    const paymentText =
      paymentOptionsDescription || "Pix, Cartão de Crédito e Cartão de Débito";

    const pricePerPassengerFormatted =
      calculatedValues.finalPricePerPassenger.toFixed(2).replace(".", ",");
    const totalPriceFormatted = calculatedValues.price.toFixed(2).replace(".", ",");

    return `🎫 *Orçamento de Passagem Aérea*

Olá *${clientName || "Cliente"}*! 👋

📍 *Rota:* ${route}
✈️ *Tipo:* ${tripTypeText}
${datesBlock}
👥 *Passageiros:* ${passengers}

💰 *Valor por pessoa:* R$ ${pricePerPassengerFormatted}
💰 *Valor Total:* R$ ${totalPriceFormatted}

✅ Milhas incluídas
✅ Taxas de embarque incluídas
✅ Opções de pagamento: ${paymentText}
${installmentsText ? `\n${installmentsText}` : ""}

Para confirmar sua viagem, basta enviar uma mensagem! 😊`;
  };

  // ========== MENSAGEM BALCÃO ==========
  const generateSupplierMessage = () => {
    const milesPerPassenger = parseMiles(milesUsed);
    const passengersNum = parseInt(passengers) || 1;
    const totalMiles = milesPerPassenger * passengersNum;

    const costPerMileNum = parseCurrency(costPerMile);
    const costPerMileFormatted = costPerMileNum.toFixed(2).replace(".", ",");

    return `Compro *${airline || "cia aérea a definir"}*

${formatNumber(totalMiles)} milhas
${passengersNum} CPF(s)
R$ ${costPerMileFormatted} o milheiro`;
  };

  // ========== COPIAR MENSAGENS ==========
  const handleCopyMessage = async (message: string, type: string) => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(message);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = message;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }

      toast({
        title: "Mensagem copiada!",
        description: `Mensagem para ${type} copiada para a área de transferência`,
      });
    } catch (error) {
      console.error("Erro ao copiar mensagem:", error);
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar a mensagem. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // ========== EXPORTAR COMO PDF PARA CLIENTE ==========
  const handleExportAsPDF = () => {
    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();

      // Cabeçalho
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(120, 120, 120);
      pdf.text("HELLO MILHAS HUB", 10, 15);

      pdf.setFontSize(16);
      pdf.setTextColor(20, 20, 20);
      pdf.text("Orçamento de Passagens Aéreas", 10, 25);

      const todayStr = format(new Date(), "dd/MM/yyyy");
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Data: ${todayStr}`, pageWidth - 10, 20, { align: "right" });

      let cursorY = 35;

      // Dados da viagem
      const routeText =
        roundTripData.origin && roundTripData.destination
          ? `${roundTripData.origin} → ${roundTripData.destination}`
          : "A definir";

      const departureDateObj = parseLocalDateFromInput(roundTripData.departureDate);
      const returnDateObj =
        tripType === "round_trip"
          ? parseLocalDateFromInput(roundTripData.returnDate)
          : null;

      const departureFormatted = departureDateObj
        ? format(departureDateObj, "dd/MM/yyyy", { locale: ptBR })
        : "A definir";

      const returnFormatted =
        tripType === "round_trip" && returnDateObj
          ? format(returnDateObj, "dd/MM/yyyy", { locale: ptBR })
          : null;

      const tripTypeText =
        tripType === "round_trip"
          ? "Ida e Volta"
          : tripType === "one_way"
          ? "Somente Ida"
          : "Múltiplos Trechos";

      const totalPriceFormatted = calculatedValues.price.toFixed(2).replace(".", ",");
      const pricePerPassengerFormatted =
        calculatedValues.finalPricePerPassenger.toFixed(2).replace(".", ",");

      // ========= BLOCO: DADOS DO CLIENTE =========
      pdf.setFontSize(11);
      pdf.setTextColor(80, 80, 80);
      pdf.text("Dados do Cliente", 10, cursorY);
      cursorY += 5;

      pdf.setFontSize(10);
      pdf.setTextColor(30, 30, 30);
      pdf.text(`Nome: ${clientName || "Cliente não informado"}`, 10, cursorY);
      cursorY += 5;
      pdf.text(
        `Telefone/WhatsApp: ${clientPhone || "Não informado"}`,
        10,
        cursorY
      );
      cursorY += 8;

      // ========= BLOCO: DADOS DA VIAGEM =========
      pdf.setFontSize(11);
      pdf.setTextColor(80, 80, 80);
      pdf.text("Dados da Viagem", 10, cursorY);
      cursorY += 5;

      pdf.setFontSize(10);
      pdf.setTextColor(30, 30, 30);
      pdf.text(`Rota: ${routeText}`, 10, cursorY);
      cursorY += 5;
      pdf.text(`Tipo: ${tripTypeText}`, 10, cursorY);
      cursorY += 5;
      pdf.text(`Data ida: ${departureFormatted}`, 10, cursorY);
      cursorY += 5;
      if (tripType === "round_trip") {
        pdf.text(`Data volta: ${returnFormatted ?? "A definir"}`, 10, cursorY);
        cursorY += 5;
      }
      pdf.text(`Passageiros: ${passengers || "1"}`, 10, cursorY);
      cursorY += 5;
      if (airline) {
        pdf.text(`Cia aérea preferencial: ${airline}`, 10, cursorY);
        cursorY += 8;
      } else {
        cursorY += 5;
      }

      pdf.setDrawColor(220, 220, 220);
      pdf.line(10, cursorY, pageWidth - 10, cursorY);
      cursorY += 8;

      // ========= BLOCO: RESUMO DO ORÇAMENTO (CLIENTE) =========
      pdf.setFontSize(11);
      pdf.setTextColor(80, 80, 80);
      pdf.text("Resumo do Orçamento", 10, cursorY);
      cursorY += 6;

      pdf.setFontSize(10);
      pdf.setTextColor(30, 30, 30);
      pdf.text(
        `Valor por passageiro: R$ ${pricePerPassengerFormatted}`,
        10,
        cursorY
      );
      cursorY += 5;
      pdf.text(`Valor total do orçamento: R$ ${totalPriceFormatted}`, 10, cursorY);
      cursorY += 8;

      const resumoExtra =
        "Valores incluem emissão com milhas e taxas de embarque. " +
        "Os valores estão sujeitos à disponibilidade e podem sofrer alteração até a emissão das passagens.";
      const resumoLines = pdf.splitTextToSize(resumoExtra, pageWidth - 20);
      pdf.setFontSize(9);
      pdf.setTextColor(70, 70, 70);
      pdf.text(resumoLines, 10, cursorY);
      cursorY += resumoLines.length * 4 + 8;

      // ========= BLOCO: FORMAS DE PAGAMENTO =========
      const paymentDescription =
        buildInstallmentsDescription() ||
        `Pix, Cartão de Crédito e Cartão de Débito.\n\nConsulte condições especiais para pagamento à vista.`;

      pdf.setFontSize(11);
      pdf.setTextColor(80, 80, 80);
      pdf.text("Formas de Pagamento", 10, cursorY);
      cursorY += 6;

      pdf.setFontSize(9);
      pdf.setTextColor(40, 40, 40);
      const paymentLines = pdf.splitTextToSize(paymentDescription, pageWidth - 20);
      pdf.text(paymentLines, 10, cursorY);
      cursorY += paymentLines.length * 4 + 8;

      // ========= BLOCO: OBSERVAÇÕES =========
      pdf.setFontSize(11);
      pdf.setTextColor(80, 80, 80);
      pdf.text("Observações", 10, cursorY);
      cursorY += 6;

      pdf.setFontSize(9);
      pdf.setTextColor(40, 40, 40);
      const notesText =
        notes ||
        "Após a confirmação do pagamento, realizaremos a emissão das passagens e enviaremos todos os bilhetes por e-mail ou WhatsApp.";
      const notesLines = pdf.splitTextToSize(notesText, pageWidth - 20);
      pdf.text(notesLines, 10, cursorY);
      cursorY += notesLines.length * 4 + 8;

      // ========= RODAPÉ =========
      pdf.setFontSize(8);
      pdf.setTextColor(140, 140, 140);
      pdf.text(
        "Orçamento válido por 24 horas a partir da data de emissão ou até alteração de tarifa pela companhia aérea.",
        pageWidth - 10,
        290,
        { align: "right" }
      );
      pdf.text(
        "Hello Milhas Hub - Emissão de passagens com milhas para uso próprio e viagens em família.",
        pageWidth - 10,
        295,
        { align: "right" }
      );

      const filename = clientName
        ? `orcamento-${clientName.replace(/\s+/g, "-").toLowerCase()}.pdf`
        : "orcamento-cliente.pdf";

      pdf.save(filename);

      toast({
        title: "Orçamento exportado!",
        description: "PDF para o cliente gerado com sucesso",
      });
    } catch (error) {
      console.error("Erro ao exportar PDF (cliente):", error);
      toast({
        title: "Erro ao exportar PDF",
        description: "Não foi possível gerar o PDF do cliente",
        variant: "destructive",
      });
    }
  };

  // ========== EXPORTAR COMO PDF INTERNO (ANÁLISE) ==========
  const handleExportAsInternalPDF = () => {
    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();

      const routeText =
        roundTripData.origin && roundTripData.destination
          ? `${roundTripData.origin} → ${roundTripData.destination}`
          : "A definir";

      const departureDateObj = parseLocalDateFromInput(roundTripData.departureDate);
      const returnDateObj =
        tripType === "round_trip"
          ? parseLocalDateFromInput(roundTripData.returnDate)
          : null;

      const departureFormatted = departureDateObj
        ? format(departureDateObj, "dd/MM/yyyy", { locale: ptBR })
        : "A definir";

      const returnFormatted =
        tripType === "round_trip" && returnDateObj
          ? format(returnDateObj, "dd/MM/yyyy", { locale: ptBR })
          : null;

      const tripTypeText =
        tripType === "round_trip"
          ? "Ida e Volta"
          : tripType === "one_way"
          ? "Somente Ida"
          : "Múltiplos Trechos";

      const milesPerPassenger = calculatedValues.milesPerPassenger || 0;
      const totalMiles = calculatedValues.totalMiles || 0;

      const totalCostFormatted = calculatedValues.totalCost.toFixed(2).replace(".", ",");
      const totalPriceFormatted = calculatedValues.price.toFixed(2).replace(".", ",");
      const pricePerPassengerFormatted =
        calculatedValues.finalPricePerPassenger.toFixed(2).replace(".", ",");
      const profitFormatted = calculatedValues.profit.toFixed(2).replace(".", ",");
      const profitMarginFormatted = calculatedValues.profitMargin.toFixed(1);
      const milesMarkupFormatted = calculatedValues.milesMarkup.toFixed(1);

      // Cabeçalho
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(120, 120, 120);
      pdf.text("HELLO MILHAS HUB", 10, 15);

      pdf.setFontSize(16);
      pdf.setTextColor(20, 20, 20);
      pdf.text("Análise Interna do Orçamento", 10, 25);

      const todayStr = format(new Date(), "dd/MM/yyyy");
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Data: ${todayStr}`, pageWidth - 10, 20, { align: "right" });

      let cursorY = 35;

      // Dados gerais
      pdf.setFontSize(11);
      pdf.setTextColor(80, 80, 80);
      pdf.text("Resumo da Viagem", 10, cursorY);
      cursorY += 6;

      pdf.setFontSize(10);
      pdf.setTextColor(30, 30, 30);
      pdf.text(`Cliente: ${clientName || "Não informado"}`, 10, cursorY);
      cursorY += 5;
      pdf.text(`Rota: ${routeText}`, 10, cursorY);
      cursorY += 5;
      pdf.text(`Tipo: ${tripTypeText}`, 10, cursorY);
      cursorY += 5;
      pdf.text(`Data ida: ${departureFormatted}`, 10, cursorY);
      cursorY += 5;
      if (tripType === "round_trip") {
        pdf.text(`Data volta: ${returnFormatted ?? "A definir"}`, 10, cursorY);
        cursorY += 5;
      }
      pdf.text(`Passageiros: ${passengers || "1"}`, 10, cursorY);
      cursorY += 5;
      if (airline) {
        pdf.text(`Cia aérea preferencial: ${airline}`, 10, cursorY);
        cursorY += 8;
      } else {
        cursorY += 6;
      }

      pdf.setDrawColor(220, 220, 220);
      pdf.line(10, cursorY, pageWidth - 10, cursorY);
      cursorY += 8;

      // Bloco financeiro interno
      pdf.setFontSize(11);
      pdf.setTextColor(80, 80, 80);
      pdf.text("Resumo Financeiro Interno", 10, cursorY);
      cursorY += 6;

      pdf.setFontSize(10);
      pdf.setTextColor(30, 30, 30);
      pdf.text(
        `Milhas por passageiro: ${formatNumber(milesPerPassenger || 0)} milhas`,
        10,
        cursorY
      );
      cursorY += 5;
      pdf.text(
        `Total de milhas: ${formatNumber(totalMiles || 0)} milhas`,
        10,
        cursorY
      );
      cursorY += 5;
      pdf.text(
        `Custo total (milhas + taxas): R$ ${totalCostFormatted}`,
        10,
        cursorY
      );
      cursorY += 5;
      pdf.text(
        `Valor de venda por passageiro: R$ ${pricePerPassengerFormatted}`,
        10,
        cursorY
      );
      cursorY += 5;
      pdf.text(`Valor de venda total: R$ ${totalPriceFormatted}`, 10, cursorY);
      cursorY += 5;
      pdf.text(`Lucro estimado: R$ ${profitFormatted}`, 10, cursorY);
      cursorY += 5;
      pdf.text(
        `Margem sobre o preço: ${profitMarginFormatted}%`,
        10,
        cursorY
      );
      cursorY += 5;
      pdf.text(
        `Markup das milhas (interno): ${milesMarkupFormatted}%`,
        10,
        cursorY
      );
      cursorY += 8;

      // Observações internas
      pdf.setFontSize(11);
      pdf.setTextColor(80, 80, 80);
      pdf.text("Observações Internas", 10, cursorY);
      cursorY += 6;

      pdf.setFontSize(9);
      pdf.setTextColor(50, 50, 50);
      const internalNotes =
        notes ||
        "Use este espaço para anotações internas sobre a negociação, limites mínimos de preço e estratégias de desconto.";
      const notesLines = pdf.splitTextToSize(internalNotes, pageWidth - 20);
      pdf.text(notesLines, 10, cursorY);
      cursorY += notesLines.length * 4 + 8;

      // Rodapé interno
      pdf.setFontSize(8);
      pdf.setTextColor(140, 140, 140);
      pdf.text(
        "Documento de uso interno. Não enviar para o cliente.",
        pageWidth - 10,
        290,
        { align: "right" }
      );
      pdf.text(
        "Hello Milhas Hub - Controle interno de margem e lucratividade.",
        pageWidth - 10,
        295,
        { align: "right" }
      );

      const filename = clientName
        ? `analise-interna-${clientName.replace(/\s+/g, "-").toLowerCase()}.pdf`
        : "analise-interna.pdf";

      pdf.save(filename);

      toast({
        title: "Análise interna exportada!",
        description: "PDF interno gerado com sucesso",
      });
    } catch (error) {
      console.error("Erro ao exportar PDF interno:", error);
      toast({
        title: "Erro ao exportar PDF interno",
        description: "Não foi possível gerar o PDF interno",
        variant: "destructive",
      });
    }
  };

  // ========== EXPORTAR COMO JPG (CLIENTE) ==========
  const handleExportAsJPG = () => {
    try {
      const canvas = document.createElement("canvas");
      // Proporção aproximada A4 em pixels
      const width = 1240;
      const height = 1754;
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        toast({
          title: "Erro ao exportar",
          description: "Não foi possível inicializar o canvas",
          variant: "destructive",
        });
        return;
      }

      // Fundo
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      const routeText =
        roundTripData.origin && roundTripData.destination
          ? `${roundTripData.origin} → ${roundTripData.destination}`
          : "A definir";

      const departureDateObj = parseLocalDateFromInput(roundTripData.departureDate);
      const returnDateObj =
        tripType === "round_trip"
          ? parseLocalDateFromInput(roundTripData.returnDate)
          : null;

      const departureFormatted = departureDateObj
        ? format(departureDateObj, "dd/MM/yyyy", { locale: ptBR })
        : "A definir";

      const returnFormatted =
        tripType === "round_trip" && returnDateObj
          ? format(returnDateObj, "dd/MM/yyyy", { locale: ptBR })
          : null;

      const tripTypeText =
        tripType === "round_trip"
          ? "Ida e Volta"
          : tripType === "one_way"
          ? "Somente Ida"
          : "Múltiplos Trechos";

      const totalPriceFormatted = calculatedValues.price.toFixed(2).replace(".", ",");
      const pricePerPassengerFormatted =
        calculatedValues.finalPricePerPassenger.toFixed(2).replace(".", ",");

      // Cabeçalho
      let y = 100;
      ctx.fillStyle = "#64748b";
      ctx.font = "bold 26px Arial";
      ctx.fillText("HELLO MILHAS HUB", 80, y);
      y += 36;

      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 34px Arial";
      ctx.fillText("Orçamento de Passagens Aéreas", 80, y);
      y += 40;

      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(80, y);
      ctx.lineTo(width - 80, y);
      ctx.stroke();
      y += 30;

      // Dados do cliente
      ctx.fillStyle = "#6b7280";
      ctx.font = "bold 18px Arial";
      ctx.fillText("Dados do Cliente", 80, y);
      y += 26;

      ctx.fillStyle = "#111827";
      ctx.font = "16px Arial";
      ctx.fillText(`Nome: ${clientName || "Cliente não informado"}`, 80, y);
      y += 24;
      ctx.fillText(
        `Telefone/WhatsApp: ${clientPhone || "Não informado"}`,
        80,
        y
      );
      y += 36;

      // Dados da viagem
      ctx.fillStyle = "#6b7280";
      ctx.font = "bold 18px Arial";
      ctx.fillText("Dados da Viagem", 80, y);
      y += 26;

      ctx.fillStyle = "#111827";
      ctx.font = "16px Arial";
      ctx.fillText(`Rota: ${routeText}`, 80, y);
      y += 24;
      ctx.fillText(`Tipo: ${tripTypeText}`, 80, y);
      y += 24;
      ctx.fillText(`Data ida: ${departureFormatted}`, 80, y);
      y += 24;
      if (tripType === "round_trip") {
        ctx.fillText(`Data volta: ${returnFormatted ?? "A definir"}`, 80, y);
        y += 24;
      }
      ctx.fillText(`Passageiros: ${passengers || "1"}`, 80, y);
      y += 24;
      if (airline) {
        ctx.fillText(`Cia aérea preferencial: ${airline}`, 80, y);
        y += 30;
      } else {
        y += 10;
      }

      // Linha
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(80, y);
      ctx.lineTo(width - 80, y);
      ctx.stroke();
      y += 30;

      // Resumo do orçamento (sem custos/lucro internos)
      ctx.fillStyle = "#6b7280";
      ctx.font = "bold 18px Arial";
      ctx.fillText("Resumo do Orçamento", 80, y);
      y += 26;

      ctx.fillStyle = "#111827";
      ctx.font = "16px Arial";
      ctx.fillText(
        `Valor por passageiro: R$ ${pricePerPassengerFormatted}`,
        80,
        y
      );
      y += 24;
      ctx.fillText(
        `Valor total do orçamento: R$ ${totalPriceFormatted}`,
        80,
        y
      );
      y += 32;

      ctx.fillStyle = "#4b5563";
      ctx.font = "14px Arial";
      const textResumo =
        "Valores incluem emissão com milhas e taxas de embarque. " +
        "Os valores estão sujeitos à disponibilidade e podem sofrer alteração até a emissão das passagens.";
      const wrapText = (text: string, x: number, maxWidth: number) => {
        const words = text.split(" ");
        let line = "";
        const lines: string[] = [];

        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + " ";
          const metrics = ctx.measureText(testLine);
          const testWidth = metrics.width;
          if (testWidth > maxWidth && n > 0) {
            lines.push(line);
            line = words[n] + " ";
          } else {
            line = testLine;
          }
        }
        lines.push(line);
        return lines;
      };

      const resumoLines = wrapText(textResumo, 80, width - 160);
      resumoLines.forEach((line) => {
        ctx.fillText(line, 80, y);
        y += 22;
      });

      // Rodapé simples
      ctx.fillStyle = "#9ca3af";
      ctx.font = "14px Arial";
      ctx.fillText(
        "Orçamento gerado pelo Hello Milhas Hub. Válido por 24 horas a partir da data de emissão.",
        80,
        height - 120
      );

      const filename = clientName
        ? `orcamento-${clientName.replace(/\s+/g, "-").toLowerCase()}.jpg`
        : "orcamento.jpg";

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/jpeg", 0.9);
      link.download = filename;
      link.click();

      toast({
        title: "Orçamento exportado!",
        description: "Imagem JPG gerada com sucesso",
      });
    } catch (error) {
      console.error("Erro ao exportar JPG:", error);
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível gerar a imagem JPG",
        variant: "destructive",
      });
    }
  };

  // ========== SALVAR ORÇAMENTO ==========
  const handleSaveQuote = async () => {
    const errors: string[] = [];

    if (!clientName.trim()) errors.push("Nome do cliente");
    if (!roundTripData.destination && flightSegments.every((s) => !s.to)) {
      errors.push("Destino da viagem");
    }
    if (calculatedValues.price <= 0) errors.push("Valores calculados");

    if (errors.length > 0) {
      toast({
        title: "Campos obrigatórios faltando",
        description: `Preencha: ${errors.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const passengersNum = parseInt(passengers) || 1;
      const route =
        tripType === "round_trip"
          ? `${roundTripData.origin} → ${roundTripData.destination}`
          : tripType === "one_way"
          ? `${roundTripData.origin} → ${roundTripData.destination}`
          : "Multi-city";

      // milhas/pax (parseando corretamente 50.000 -> 50000)
      const totalMiles = parseMiles(milesUsed);
      const costPerMileNum = parseCurrency(costPerMile);

      console.log("[SAVE QUOTE] Dados a serem salvos:", {
        user_id: user.id,
        client_name: clientName,
        miles_needed: totalMiles,
        total_price: calculatedValues.price,
        passengers: passengersNum,
        trip_type: tripType,
        cost_per_mile: costPerMileNum,
        attachments_count: attachments.length,
        flight_segments_count: tripType === "multi_city" ? flightSegments.length : 1,
      });

      const flightSegmentsToSave =
        tripType === "multi_city"
          ? flightSegments
          : [
              {
                origin: roundTripData.origin,
                destination: roundTripData.destination,
                departureDate: roundTripData.departureDate,
                returnDate: roundTripData.returnDate,
                miles: roundTripData.miles || 0,
                milesOutbound: roundTripData.milesOutbound || 0,
                milesReturn: roundTripData.milesReturn || 0,
              },
            ];

      const quoteData = {
        user_id: user.id,
        quote_title: quoteTitle || null,
        client_name: clientName,
        client_phone: clientPhone || null,
        company_name: airline || null,
        route,
        departure_date: roundTripData.departureDate || null,
        miles_needed: totalMiles,
        total_price: calculatedValues.price,
        passengers: passengersNum,
        trip_type: tripType,
        boarding_fee: parseCurrency(boardingFee),
        cost_per_mile: costPerMileNum,
        notes: notes || null,
        attachments: attachments.length > 0 ? attachments : null,
        flight_segments: flightSegmentsToSave as any,
        status: "pending" as const,
      };

      let savedQuoteId: string;

      if (isEditMode && quoteId) {
        const { error } = await supabase.from("quotes").update(quoteData).eq("id", quoteId);

        if (error) {
          console.error("[SAVE QUOTE] Erro detalhado:", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          });
          throw error;
        }

        savedQuoteId = quoteId;

        console.log("[SAVE QUOTE] Orçamento atualizado com sucesso!");

        toast({
          title: "Orçamento atualizado!",
          description: "As alterações foram salvas com sucesso",
        });
      } else {
        const { data, error } = await supabase
          .from("quotes")
          .insert([quoteData])
          .select()
          .single();

        if (error) {
          console.error("[SAVE QUOTE] Erro detalhado:", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          });
          throw error;
        }

        savedQuoteId = data.id;

        console.log("[SAVE QUOTE] Orçamento salvo com sucesso!");

        toast({
          title: "Orçamento salvo!",
          description: "O orçamento foi criado com sucesso",
        });
      }

      setTimeout(() => {
        navigate("/quotes");
      }, 1500);
    } catch (error: any) {
      toast({
        title: "Erro ao salvar orçamento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // ========== RENDER ==========
  if (loadingQuote) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted p-6">
        <Card className="max-w-7xl mx-auto">
          <CardHeader>
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div id="quote-workspace" className="container max-w-7xl mx-auto p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Gerador de Orçamentos</h1>
            <p className="text-muted-foreground">
              Sistema integrado para criar orçamentos profissionais
            </p>
          </div>
        </div>
      </div>

      {/* GRID PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
        {/* COLUNA ESQUERDA */}
        <div className="space-y-4">
          {/* DADOS DO ORÇAMENTO */}
          <Card>
            <CardHeader>
              <CardTitle>📝 Dados do Orçamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Cliente */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Cliente</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="clientName">Nome Completo *</Label>
                    <Input
                      id="clientName"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Nome do cliente"
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientPhone">Telefone / WhatsApp</Label>
                    <Input
                      id="clientPhone"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Detalhes da Viagem */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Detalhes da Viagem</h3>

                {/* Tipo de Viagem */}
                <div>
                  <Label>Tipo de Viagem</Label>
                  <RadioGroup
                    value={tripType}
                    onValueChange={(value) => setTripType(value as TripType)}
                    className="flex flex-wrap gap-4 mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="round_trip" id="round_trip" />
                      <Label htmlFor="round_trip" className="cursor-pointer font-normal">
                        Ida e Volta
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="one_way" id="one_way" />
                      <Label htmlFor="one_way" className="cursor-pointer font-normal">
                        Só Ida
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="multi_city" id="multi_city" />
                      <Label htmlFor="multi_city" className="cursor-pointer font-normal">
                        Múltiplos Trechos
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Cia Aérea */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="airline">Cia Aérea</Label>
                    <Input
                      id="airline"
                      value={airline}
                      onChange={(e) => setAirline(e.target.value)}
                      placeholder="Ex: LATAM, GOL..."
                    />
                  </div>
                </div>

                {/* Round trip */}
                {tripType === "round_trip" && (
                  <RoundTripForm data={roundTripData} onChange={setRoundTripData} />
                )}

                {/* Só ida */}
                {tripType === "one_way" && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <Label htmlFor="origin">Origem *</Label>
                      <Input
                        id="origin"
                        value={roundTripData.origin}
                        onChange={(e) =>
                          setRoundTripData({ ...roundTripData, origin: e.target.value })
                        }
                        placeholder="Ex: GRU"
                      />
                    </div>
                    <div>
                      <Label htmlFor="destination">Destino *</Label>
                      <Input
                        id="destination"
                        value={roundTripData.destination}
                        onChange={(e) =>
                          setRoundTripData({
                            ...roundTripData,
                            destination: e.target.value,
                          })
                        }
                        placeholder="Ex: MIA"
                      />
                    </div>
                    <div>
                      <Label htmlFor="departureDate">Data *</Label>
                      <Input
                        id="departureDate"
                        type="date"
                        value={roundTripData.departureDate}
                        onChange={(e) =>
                          setRoundTripData({
                            ...roundTripData,
                            departureDate: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="oneWayMiles">Milhas/pax</Label>
                      <Input
                        id="oneWayMiles"
                        value={roundTripData.miles ? roundTripData.miles.toString() : ""}
                        onChange={(e) => {
                          const numeric = e.target.value.replace(/\D/g, "");
                          const milesValue = numeric ? Number(numeric) : 0;
                          setRoundTripData({
                            ...roundTripData,
                            miles: milesValue,
                          });
                        }}
                        placeholder="30000"
                      />
                    </div>
                  </div>
                )}

                {/* Multi-city */}
                {tripType === "multi_city" && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      {flightSegments.map((segment, index) => (
                        <div
                          key={index}
                          className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end border rounded-lg p-3 bg-muted/40"
                        >
                          <div>
                            <Label>Origem</Label>
                            <Input
                              value={segment.from}
                              onChange={(e) =>
                                handleUpdateSegment(index, "from", e.target.value)
                              }
                              placeholder="Ex: GRU"
                            />
                          </div>
                          <div>
                            <Label>Destino</Label>
                            <Input
                              value={segment.to}
                              onChange={(e) =>
                                handleUpdateSegment(index, "to", e.target.value)
                              }
                              placeholder="Ex: MIA"
                            />
                          </div>
                          <div>
                            <Label>Data</Label>
                            <Input
                              type="date"
                              value={segment.date}
                              onChange={(e) =>
                                handleUpdateSegment(index, "date", e.target.value)
                              }
                            />
                          </div>
                          <div>
                            <Label>Milhas/pax</Label>
                            <div className="flex gap-2">
                              <Input
                                value={segment.miles || ""}
                                onChange={(e) =>
                                  handleUpdateSegment(
                                    index,
                                    "miles",
                                    Number(e.target.value.replace(/\D/g, "")) || 0
                                  )
                                }
                                placeholder="10000"
                              />
                              {flightSegments.length > 1 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleRemoveSegment(index)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddSegment}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar trecho
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      As milhas/pax de cada trecho são somadas automaticamente e enviadas
                      para a calculadora de margem.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* CALCULADORA */}
          <Card>
            <CardHeader>
              <CardTitle>🧮 Calculadora de Margem</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="milesUsed">Milhas/pax</Label>
                  <Input
                    id="milesUsed"
                    value={milesUsed}
                    onChange={(e) => setMilesUsed(e.target.value)}
                    placeholder="30000"
                  />
                </div>
                <div>
                  <Label htmlFor="costPerMile">Valor Milheiro (R$)</Label>
                  <Input
                    id="costPerMile"
                    value={costPerMile}
                    onChange={(e) => setCostPerMile(e.target.value)}
                    placeholder="29,00"
                  />
                </div>
                <div>
                  <Label htmlFor="boardingFee">Taxa Embarque/pax (R$)</Label>
                  <Input
                    id="boardingFee"
                    value={boardingFee}
                    onChange={(e) => setBoardingFee(e.target.value)}
                    placeholder="35,00"
                  />
                </div>
                <div>
                  <Label htmlFor="passengers">Nº de Passageiros / CPFs</Label>
                  <Input
                    id="passengers"
                    value={passengers}
                    onChange={(e) => setPassengers(e.target.value)}
                    placeholder="2"
                  />
                </div>
                <div>
                  <Label htmlFor="targetMargin">Markup desejado nas milhas (%)</Label>
                  <Input
                    id="targetMargin"
                    value={targetMargin}
                    onChange={(e) => setTargetMargin(e.target.value)}
                    placeholder="20"
                  />
                </div>
                <div>
                  <Label htmlFor="manualPrice">Preço Manual/pax (R$)</Label>
                  <Input
                    id="manualPrice"
                    value={manualPrice}
                    onChange={(e) => setManualPrice(e.target.value)}
                    placeholder="Opcional"
                  />
                </div>
              </div>

              <Separator />

              <div className="p-4 bg-primary/5 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Milhas/pax:</span>
                  <span className="font-semibold">
                    {formatNumber(calculatedValues.milesPerPassenger || 0)} /pax
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total de milhas:</span>
                  <span className="font-semibold">
                    {formatNumber(calculatedValues.totalMiles || 0)}
                  </span>
                </div>

                <Separator className="my-2" />

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Custo Total (incl. taxa):</span>
                  <span className="font-semibold">
                    R$ {calculatedValues.totalCost.toFixed(2).replace(".", ",")}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Preço por passageiro:</span>
                  <span className="font-semibold text-primary">
                    R$ {calculatedValues.finalPricePerPassenger
                      .toFixed(2)
                      .replace(".", ",")}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Preço Total:</span>
                  <span className="font-semibold text-primary">
                    R$ {calculatedValues.price.toFixed(2).replace(".", ",")}
                  </span>
                </div>

                {manualPrice && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Preço sugerido/pax (referência):
                    </span>
                    <span className="font-semibold">
                      R$ {calculatedValues.suggestedPricePerPassenger
                        .toFixed(2)
                        .replace(".", ",")}
                    </span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lucro:</span>
                  <span className="font-semibold text-green-600">
                    R$ {calculatedValues.profit.toFixed(2).replace(".", ",")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Margem sobre o preço:</span>
                  <Badge
                    variant={calculatedValues.profitMargin >= 20 ? "default" : "secondary"}
                  >
                    {calculatedValues.profitMargin.toFixed(1)}%
                  </Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Markup das milhas (interno):</span>
                  <Badge variant="outline">{calculatedValues.milesMarkup.toFixed(1)}%</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* COLUNA DIREITA */}
        <div className="space-y-4">
          {/* CADERNO */}
          <Card>
            <CardHeader>
              <CardTitle>📔 Caderno do Orçamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Prints e Anexos</Label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  disabled={uploading}
                />
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => document.getElementById("file-upload")?.click()}
                  disabled={uploading}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {uploading ? "Enviando..." : "Adicionar Print"}
                </Button>

                {attachments.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {attachments.map((url, idx) => (
                      <div
                        key={idx}
                        className="relative group cursor-pointer"
                        onClick={() => setPreviewImage(url)}
                      >
                        <img
                          src={url}
                          alt={`Anexo ${idx + 1}`}
                          className="w-full h-20 object-cover rounded border border-border hover:border-primary transition-colors"
                        />
                        <Button
                          size="icon"
                          variant="destructive"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveAttachment(idx);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <Label htmlFor="notes">Anotações</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observações, detalhes da negociação..."
                  rows={6}
                  className="mt-2"
                />
              </div>
            </CardContent>
          </Card>

          {/* RESUMO */}
          <Card>
            <CardHeader>
              <CardTitle>💰 Resumo Financeiro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Custo Total:</span>
                <span className="font-semibold">
                  R$ {calculatedValues.totalCost.toFixed(2).replace(".", ",")}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Preço por passageiro:</span>
                <span className="font-semibold">
                  R$ {calculatedValues.finalPricePerPassenger
                    .toFixed(2)
                    .replace(".", ",")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Preço de Venda:</span>
                <span className="text-xl font-bold text-primary">
                  R$ {calculatedValues.price.toFixed(2).replace(".", ",")}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lucro:</span>
                <span className="font-semibold text-green-600">
                  R$ {calculatedValues.profit.toFixed(2).replace(".", ",")}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Margem sobre o preço:</span>
                <Badge
                  variant={calculatedValues.profitMargin >= 20 ? "default" : "secondary"}
                  className="text-sm"
                >
                  {calculatedValues.profitMargin.toFixed(1)}%
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* MENSAGENS */}
          <Card>
            <CardHeader>
              <CardTitle>💬 Mensagens Prontas</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeMessageTab} onValueChange={setActiveMessageTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="client">Cliente</TabsTrigger>
                  <TabsTrigger value="supplier">Balcão</TabsTrigger>
                </TabsList>

                <TabsContent value="client" className="space-y-2 mt-4">
                  <Textarea
                    value={generateClientMessage()}
                    readOnly
                    rows={12}
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      handleCopyMessage(generateClientMessage(), "cliente")
                    }
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar Mensagem do Cliente
                  </Button>
                </TabsContent>

                <TabsContent value="supplier" className="space-y-2 mt-4">
                  <Textarea
                    value={generateSupplierMessage()}
                    readOnly
                    rows={14}
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      handleCopyMessage(generateSupplierMessage(), "balcão")
                    }
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar Mensagem do Balcão
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* AÇÕES - ENXUTO */}
          <div className="space-y-3">
            {/* Grupo: Orçamento Cliente */}
            <div className="rounded-lg border bg-card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">Orçamento para Cliente</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleExportAsPDF}
                >
                  <Download className="mr-2 h-4 w-4" />
                  PDF
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleExportAsJPG}
                >
                  <Download className="mr-2 h-4 w-4" />
                  JPG
                </Button>
              </div>
            </div>

            {/* Grupo: Análise interna */}
            <div className="rounded-lg border bg-card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">Análise interna</span>
              </div>
              <Button
                variant="outline"
                className="w-full mt-1"
                onClick={handleExportAsInternalPDF}
              >
                <Download className="mr-2 h-4 w-4" />
                PDF (uso interno)
              </Button>
            </div>

            {/* Salvar orçamento */}
            <Button
              className="w-full"
              size="lg"
              onClick={handleSaveQuote}
              disabled={saving || uploading}
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Salvando..." : "Salvar Orçamento"}
            </Button>
          </div>
        </div>
      </div>

      {/* PREVIEW IMAGEM */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogTitle className="sr-only">Pré-visualização do anexo</DialogTitle>
          <DialogDescription className="sr-only">
            Visualização ampliada do print/anexo do orçamento.
          </DialogDescription>
          {previewImage && (
            <img src={previewImage} alt="Preview do anexo" className="w-full h-auto rounded" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
