"use client";
import fontkit from "@pdf-lib/fontkit";
import React, { useState, useEffect, useRef } from "react";
import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { 
  Upload, Download, Type, Layout, Palette, Layers, 
  Eye, RefreshCw, FileText, ShieldCheck, ShieldAlert, 
  Plus, Lock, Zap, CheckCircle2, UserCircle, ZoomIn, ZoomOut, 
  Maximize, Bot, Send, Sparkles, X
} from "lucide-react";

export default function PDFSignerAI() {
  // Logic State
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [signatureText, setSignatureText] = useState("");
  const [inkColor, setInkColor] = useState("blue");
  const [position, setPosition] = useState("bottom-right");
  const [fontStyle, setFontStyle] = useState("GreatVibes");
  const [signatureFontSize, setSignatureFontSize] = useState(35);
  const [signatureFontWeight, setSignatureFontWeight] = useState("normal");
  const [signAllPages, setSignAllPages] = useState(false);
  
  // UI State
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.85); 
  const [isAiOpen, setIsAiOpen] = useState(false);

  // AI State
  const [extractedText, setExtractedText] = useState("");
  const [chatHistory, setChatHistory] = useState<{role: string, content: string}[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const AI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

  const fonts = [
    { id: 'GreatVibes', name: 'Elegant Script', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/greatvibes/GreatVibes-Regular.ttf' },
    { id: 'AlexBrush', name: 'Classic Calligraphy', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/alexbrush/AlexBrush-Regular.ttf' },
    // { id: 'DancingScript', name: 'Casual Cursive', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/dancingscript/DancingScript-Regular.ttf' },
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
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  // AI Logic
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
      if (!AI_API_KEY) throw new Error("Missing Gemini API key.");
      const genAI = new GoogleGenerativeAI(AI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `Provide a 3-point summary of document obligations: ${fullText.substring(0, 10000)}`;
      const result = await model.generateContent(prompt);
      setChatHistory([{ role: 'assistant', content: `📑 **AI Intel Ready**\n\n${result.response.text()}` }]);
    } catch (e) {
      setChatHistory([{ role: 'assistant', content: "Document loaded. AI ready for questions!" }]);
    } finally { setIsAiTyping(false); }
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
    setChatHistory(prev => [...prev, userMsg]);
    setUserInput("");
    setIsAiTyping(true);
    try {
      if (!AI_API_KEY) throw new Error("Missing Gemini API key.");
      const genAI = new GoogleGenerativeAI(AI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const chat = model.startChat({
        history: [{ role: "user", parts: [{ text: `Context: ${extractedText.substring(0, 20000)}` }] }, { role: "model", parts: [{ text: "Understood." }] }],
      });
      const result = await chat.sendMessage(userInput);
      setChatHistory(prev => [...prev, { role: 'assistant', content: result.response.text() }]);
    } catch (e) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: "API limit reached." }]);
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
        const fontBytes = await fetch(selectedFontConfig.url).then(res => res.arrayBuffer());
        signatureFont = await pdfDoc.embedFont(fontBytes);
      } else {
        signatureFont = await pdfDoc.embedFont(selectedFontConfig.font || StandardFonts.TimesRomanItalic);
      }
      const pages = pdfDoc.getPages();
      const fontSize = signatureFontSize;
      const margin = 60;
      const textWidth = signatureFont.widthOfTextAtSize(signatureText, fontSize);
      pages.forEach((page, index) => {
        if (!signAllPages && index !== 0) return;
        const { width, height } = page.getSize();
        let x = margin, y = margin;
        if (position === "top-left") { x = margin; y = height - margin - 15; }
        else if (position === "top-right") { x = width - textWidth - margin; y = height - margin - 15; }
        else if (position === "bottom-left") { x = margin; y = margin + 15; }
        else if (position === "bottom-right") { x = width - textWidth - margin; y = margin + 15; }
        const color = inkColor === "blue" ? rgb(0.2, 0.3, 0.8) : rgb(0, 0, 0);
        if (signatureFontWeight === "bold") {
          page.drawText(signatureText, { x: x + 0.8, y, size: fontSize, font: signatureFont, color, rotate: degrees(-3) });
        }
        page.drawText(signatureText, { x, y, size: fontSize, font: signatureFont, color, rotate: degrees(-3) });
      });
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      if (isDownload) { const link = document.createElement("a"); link.href = url; link.download = `Signed_${pdfFile.name}`; link.click(); }
      else { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(url); }
    } catch (e) { console.error(e); } finally { setIsProcessing(false); }
  };

  return (
    <main className="flex h-screen bg-[#121212] text-slate-100 overflow-hidden font-sans select-none">
      
      {/* 
          ADVANCED SCROLLBAR HIERARCHY:
          1. Enable Master Scrolling.
          2. Hide iframe's internal white bar by masking it (physical crop).
      */}
      <style jsx global>{`
        :root { color-scheme: dark; }

        /* Master Application Dark Scrollbar */
        .master-scroll::-webkit-scrollbar { width: 10px !important; }
        .master-scroll::-webkit-scrollbar-track { background: #121212 !important; }
        .master-scroll::-webkit-scrollbar-thumb { 
          background: #181818 !important; 
          border-radius: 10px !important; 
          border: 3px solid #121212 !important; 
        }
        .master-scroll::-webkit-scrollbar-thumb:hover { background: #1db954 !important; }

        /* Disable other scrollbars */
        ::-webkit-scrollbar { width: 0px; height: 0px; }
        
        .mechanical-mask {
          width: 100%;
          overflow-x: hidden; /* This physically crops the white bar on the right */
          display: flex;
          justify-content: center;
        }

        .infinite-iframe {
          width: calc(100% + 40px); /* Move native bar 40px to the right outside container */
          height: 100%;
          min-height: 4500px; /* Huge height forces parent container to handle scroll */
          border: none;
        }
      `}</style>

      {/* COLUMN 1: SIDEBAR */}
      <aside className="w-[300px] bg-[#121212] border-r border-[#282828] flex flex-col shrink-0 z-20 shadow-2xl">
        <div className="p-6 border-b border-[#282828] flex items-center gap-3">
          <div className="bg-[#1db954]/15 p-2 rounded-lg border border-[#1db954]/30">
            <Sparkles className="text-[#1db954] w-5 h-5" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight uppercase">DocSign AI</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 master-scroll">
          <section>
             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Intake</h4>
             <div className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${pdfFile ? 'border-[#1db954] bg-[#1db954]/10' : 'border-[#282828] bg-[#181818] hover:border-[#3a3a3a]'}`}>
                <input type="file" accept=".pdf" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                <Upload className="w-5 h-5 text-[#1db954] mx-auto mb-2" />
                <p className="text-[10px] font-bold text-slate-400 truncate uppercase px-2">{pdfFile ? pdfFile.name : "Select PDF"}</p>
             </div>
          </section>

          <div className="space-y-4">
             <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2">
                <UserCircle className="w-3 h-3" /> Identity
             </label>
             <input type="text" placeholder="Full Name" value={signatureText} onChange={(e) => setSignatureText(e.target.value)} className="w-full bg-[#181818] border border-[#282828] p-3.5 rounded-xl text-sm text-white focus:ring-1 focus:ring-[#1db954] outline-none transition shadow-sm" />
             
             <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase mb-2 block tracking-widest">Font</label>
                  <select value={fontStyle} onChange={(e) => setFontStyle(e.target.value)} className="w-full bg-[#181818] border border-[#282828] p-2 rounded-lg text-[10px] text-white outline-none">
                    {fonts.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase mb-2 block tracking-widest">Ink</label>
                  <div className="flex bg-[#181818] rounded-lg p-1 border border-[#282828]">
                    <button onClick={() => setInkColor('blue')} className={`flex-1 py-1 rounded text-[8px] font-black transition ${inkColor === 'blue' ? 'bg-[#1db954] text-black' : 'text-slate-400'}`}>BLUE</button>
                    <button onClick={() => setInkColor('black')} className={`flex-1 py-1 rounded text-[8px] font-black transition ${inkColor === 'black' ? 'bg-[#1db954] text-black' : 'text-slate-400'}`}>BLACK</button>
                  </div>
                </div>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase mb-2 block tracking-widest">Size</label>
                  <div className="flex items-center gap-3">
                    <input type="range" min={24} max={72} value={signatureFontSize} onChange={(e) => setSignatureFontSize(Number(e.target.value))} className="w-full accent-[#1db954]" />
                    <span className="w-10 text-[10px] font-bold text-slate-200 text-right">{signatureFontSize}px</span>
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase mb-2 block tracking-widest">Weight</label>
                  <select value={signatureFontWeight} onChange={(e) => setSignatureFontWeight(e.target.value)} className="w-full bg-[#181818] border border-[#282828] p-2 rounded-lg text-[10px] text-white outline-none">
                    <option value="normal">Normal</option>
                    <option value="bold">Bold</option>
                  </select>
                </div>
             </div>
          </div>

          <div>
             <label className="text-[10px] font-black text-slate-400 uppercase block mb-3">Placement</label>
             <div className="grid grid-cols-2 gap-2">
                {positions.map(pos => (
                  <button key={pos.id} onClick={() => setPosition(pos.id)} className={`py-3 text-[9px] font-black border rounded-lg transition tracking-widest ${position === pos.id ? 'bg-[#1db954] text-black border-[#1db954] shadow-md shadow-[#1db954]/20' : 'bg-[#181818] text-slate-400 border-[#282828]'}`}>
                    {pos.label.toUpperCase()}
                  </button>
                ))}
             </div>
          </div>

          <div className="bg-[#181818] p-4 rounded-xl flex items-center justify-between border border-[#282828]">
             <div className="flex items-center gap-2">
               <Layers className="w-4 h-4 text-[#1db954]" />
               <span className="text-[10px] font-bold text-slate-200 uppercase tracking-widest">Apply All</span>
             </div>
             <button onClick={() => setSignAllPages(!signAllPages)} className={`w-8 h-4 rounded-full relative transition ${signAllPages ? 'bg-[#1db954]' : 'bg-[#2a2a2a]'}`}>
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${signAllPages ? 'left-4.5' : 'left-0.5'}`} />
             </button>
          </div>
        </div>

        <div className="p-6 border-t border-[#282828] bg-[#121212]">
           <button onClick={() => processSignature(false)} disabled={isProcessing} className="w-full bg-[#1db954] hover:bg-[#1ed760] text-black font-black py-4 rounded-xl text-[10px] uppercase tracking-widest transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 shadow-xl shadow-[#1db954]/20">
              <Eye className="w-4 h-4" /> Preview Changes
           </button>
        </div>
      </aside>

      {/* COLUMN 2: WORKSPACE */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-[#121212]">
        <header className="px-8 py-4 border-b border-[#282828] flex justify-between items-center z-20 shadow-2xl">
           <div className="flex gap-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              <span className="text-[#1db954] border-b-2 border-[#1db954] pb-2">workbench</span>
              <span className="hover:text-slate-200 transition cursor-pointer">Archive</span>
           </div>
           <button onClick={() => setIsAiOpen(!isAiOpen)} className={`px-5 py-2 rounded-full border flex items-center gap-2 transition text-[10px] font-black uppercase tracking-widest ${isAiOpen ? 'bg-[#1db954] text-black border-[#1db954] shadow-[0_0_15px_rgba(29,185,84,0.25)]' : 'bg-[#181818] text-[#1db954] border-[#282828] hover:bg-[#1d1d1d]'}`}>
              <Bot className="w-4 h-4" /> AI Intelligence
           </button>
        </header>

        <div className="flex-1 relative flex flex-col items-center p-6 overflow-hidden">
          {previewUrl ? (
            <div className="w-full h-full flex flex-col gap-4 animate-in fade-in duration-500 max-w-[1400px]">
               <div className="bg-[#121212]/90 backdrop-blur-md p-3 px-6 rounded-2xl flex justify-between items-center border border-[#282828] shadow-2xl z-20 shrink-0">
                  <div className="flex items-center gap-6">
                    <span className="text-[10px] font-black uppercase text-[#1db954] tracking-widest">Live Preview</span>
                    <div className="flex items-center gap-1 bg-[#181818] rounded-lg p-1 border border-[#282828]">
                       <button onClick={() => setZoom(z => Math.max(0.4, z - 0.1))} className="p-1.5 text-slate-400 hover:text-white"><ZoomOut className="w-3.5 h-3.5" /></button>
                       <span className="text-[9px] font-black w-10 text-center tracking-widest">{Math.round(zoom*100)}%</span>
                       <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-1.5 text-slate-400 hover:text-white"><ZoomIn className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <button onClick={() => processSignature(true)} className="bg-[#1db954] hover:bg-[#1ed760] text-black px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg transition active:scale-95"><Download className="w-3.5 h-3.5" /> Sign & Export</button>
               </div>

               {/* MASTER DOCUMENT SCROLL CONTAINER (BLACK SCROLLBAR) */}
               <div className="flex-1 w-full bg-[#181818] rounded-[2.5rem] border-4 border-[#282828] shadow-inner overflow-y-auto overflow-x-hidden p-12 flex flex-col items-center master-scroll">
                  <div className="origin-top mechanical-mask" style={{ transform: `scale(${zoom})`, transition: 'transform 0.1s ease-out', minWidth: '100%' }}>
                     <iframe src={`${previewUrl}#toolbar=0&navpanes=0`} className="infinite-iframe bg-white shadow-2xl rounded" />
                  </div>
               </div>
            </div>
          ) : (
            <div className="m-auto text-center space-y-8 animate-in fade-in duration-1000 max-w-lg">
               <div className="w-32 h-32 bg-[#121212] rounded-[3rem] border-2 border-[#282828] flex items-center justify-center mx-auto shadow-2xl transition hover:scale-110"><FileText className="w-12 h-12 text-slate-400" /></div>
               <h2 className="text-4xl font-black text-white tracking-tighter uppercase">Workspace</h2>
               <p className="text-slate-400 text-sm tracking-widest opacity-50 uppercase">Ready for intake.</p>
            </div>
          )}
        </div>
      </div>

      {/* COLUMN 3: AI DRAWER */}
      <div className={`transition-all duration-500 border-l border-[#282828] bg-[#121212] flex flex-col shadow-[-40px_0_80px_rgba(0,0,0,0.6)] z-40 ${isAiOpen ? 'w-[420px]' : 'w-0 opacity-0 overflow-hidden'}`}>
        <div className="p-6 border-b border-[#282828] flex justify-between items-center bg-[#181818]">
           <div className="flex items-center gap-3">
              <div className="bg-[#1db954] p-2 rounded-lg shadow-lg"><Bot className="w-4 h-4 text-black" /></div>
              <span className="text-xs font-black uppercase text-white tracking-widest tracking-[0.2em]">Legal Intel</span>
           </div>
           <button onClick={() => setIsAiOpen(false)} className="p-2 hover:bg-[#1d1d1d] rounded-lg text-slate-100 transition"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 master-scroll">
           {chatHistory.map((msg, i) => (
             <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-[11px] leading-relaxed shadow-lg ${msg.role === 'user' ? 'bg-[#1db954] text-black' : 'bg-[#181818] border border-[#282828] text-slate-200'}`}>
                   {msg.content}
                </div>
             </div>
           ))}
           {isAiTyping && (
             <div className="flex gap-2 p-4 bg-[#181818]/80 rounded-2xl w-fit ml-2">
                <div className="w-1.5 h-1.5 bg-[#1db954] rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-[#1db954] rounded-full animate-bounce [animation-delay:0.15s]" />
                <div className="w-1.5 h-1.5 bg-[#1db954] rounded-full animate-bounce [animation-delay:0.3s]" />
             </div>
           )}
           <div ref={chatEndRef} />
        </div>

        <div className="p-6 border-t border-[#282828] bg-[#181818]">
           <div className="relative group">
              <input type="text" placeholder="Query clauses..." value={userInput} onChange={(e) => setUserInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAiChat()} className="w-full bg-[#181818] border border-[#282828] p-4 pr-12 rounded-2xl text-xs outline-none focus:ring-1 focus:ring-[#1db954] transition shadow-inner placeholder:text-slate-500" />
              <button onClick={handleAiChat} className="absolute right-3 top-2.5 p-2 bg-[#1db954] hover:bg-[#1ed760] rounded-xl text-black shadow-lg transition active:scale-90"><Send className="w-4 h-4" /></button>
           </div>
        </div>
      </div>
    </main>
  );
}