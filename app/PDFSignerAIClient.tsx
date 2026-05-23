"use client";
import fontkit from "@pdf-lib/fontkit";
import React, { useState, useEffect, useRef } from "react";
import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";
import { 
  Upload, Download, Type, Layout, Palette, Layers, 
  Eye, RefreshCw, FileText, ShieldCheck, ShieldAlert, 
  Plus, Lock, Zap, CheckCircle2, UserCircle, ZoomIn, ZoomOut, 
  Maximize, Bot, Send, Sparkles, X
} from "lucide-react";

export default function PDFSignerAIClient() {
  // Logic State
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [signatureText, setSignatureText] = useState("");
  const [inkColor, setInkColor] = useState("blue");
  const [position, setPosition] = useState("bottom-right");
  const [fontStyle, setFontStyle] = useState("GreatVibes");
  const [signAllPages, setSignAllPages] = useState(false);
  
  // UI State
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.85);
  const [isAiOpen, setIsAiOpen] = useState(false);

  // AI State
  const [extractedText, setExtractedText] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fonts = [
    { id: 'GreatVibes', name: 'Elegant Script', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/greatvibes/GreatVibes-Regular.ttf' },
    { id: 'AlexBrush', name: 'Classic Calligraphy', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/alexbrush/AlexBrush-Regular.ttf' },
    { id: 'DancingScript', name: 'Casual Cursive', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/dancingscript/DancingScript-Regular.ttf' },
    { id: 'Classic', name: 'Formal Serif', font: StandardFonts.TimesRomanItalic },
    { id: 'Modern', name: 'Modern Sans', font: StandardFonts.HelveticaOblique },
  ];

  const positions = [
    { id: "top-left", label: "Top Left" },
    { id: "top-right", label: "Top Right" },
    { id: "bottom-left", label: "Bottom Left" },
    { id: "bottom-right", label: "Bottom Right" },
  ];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const extractTextAndAnalyze = async (file: File) => {
    setIsAiTyping(true);
    setIsAiOpen(true);
    try {
      // @ts-ignore
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        // @ts-ignore
        fullText += textContent.items.map((item) => item.str || "").join(" ") + " ";
      }
      setExtractedText(fullText);

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'summary', text: fullText.substring(0, 10000) }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || response.statusText || 'AI summary request failed');
      }
      setChatHistory([{ role: 'assistant', content: `📑 **AI Intel Ready**\n\n${data.text}` }]);
    } catch (e) {
      setChatHistory([{ role: 'assistant', content: `Document loaded. AI ready for questions! (${e instanceof Error ? e.message : 'Unknown error'})` }]);
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPdfFile(file);
      extractTextAndAnalyze(file);
      if (previewUrl) setPreviewUrl(null);
    }
  };

  const handleAiChat = async () => {
    if (!userInput.trim() || !extractedText) return;
    const userMsg = { role: 'user', content: userInput };
    setChatHistory((prev) => [...prev, userMsg]);
    setUserInput("");
    setIsAiTyping(true);

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'chat', text: extractedText.substring(0, 20000), question: userInput }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || response.statusText || 'AI chat request failed');
      }
      setChatHistory((prev) => [...prev, { role: 'assistant', content: data.text }]);
    } catch (e) {
      setChatHistory((prev) => [...prev, { role: 'assistant', content: `AI error: ${e instanceof Error ? e.message : 'Unknown error'}` }]);
    } finally {
      setIsAiTyping(false);
    }
  };

  const processSignature = async (isDownload: boolean = false) => {
    if (!pdfFile || !signatureText) return alert("Missing signature info");
    setIsProcessing(true);
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      pdfDoc.registerFontkit(fontkit);
      const selectedFontConfig = fonts.find((f) => f.id === fontStyle) || fonts[0];
      let signatureFont;
      if (selectedFontConfig.url) {
        const fontBytes = await fetch(selectedFontConfig.url).then((res) => res.arrayBuffer());
        signatureFont = await pdfDoc.embedFont(fontBytes);
      } else {
        signatureFont = await pdfDoc.embedFont(selectedFontConfig.font || StandardFonts.TimesRomanItalic);
      }
      const pages = pdfDoc.getPages();
      const fontSize = 35;
      const margin = 60;
      const textWidth = signatureFont.widthOfTextAtSize(signatureText, fontSize);
      pages.forEach((page, index) => {
        if (!signAllPages && index !== 0) return;
        const { width, height } = page.getSize();
        let x = margin,
          y = margin;
        if (position === "top-left") {
          x = margin;
          y = height - margin - 15;
        } else if (position === "top-right") {
          x = width - textWidth - margin;
          y = height - margin - 15;
        } else if (position === "bottom-left") {
          x = margin;
          y = margin + 15;
        } else if (position === "bottom-right") {
          x = width - textWidth - margin;
          y = margin + 15;
        }
        const color = inkColor === "blue" ? rgb(0.2, 0.3, 0.8) : rgb(0, 0, 0);
        page.drawText(signatureText, { x, y, size: fontSize, font: signatureFont, color, rotate: degrees(-3) });
      });
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      if (isDownload) {
        const link = document.createElement("a");
        link.href = url;
        link.download = `Signed_${pdfFile.name}`;
        link.click();
      } else {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(url);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="flex h-screen bg-[#0b0e14] text-slate-300 overflow-hidden font-sans select-none">
      {/* ... rest of UI unchanged ... */}
    </main>
  );
}
