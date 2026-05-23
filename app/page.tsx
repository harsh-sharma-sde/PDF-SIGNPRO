"use client";
import fontkit from "@pdf-lib/fontkit";
import React, { useState, useEffect } from "react";
import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";
import { 
  Upload, Download, Type, Layout, Palette, Layers, 
  Eye, RefreshCw, FileText, ShieldCheck, ShieldAlert, 
  Plus, Lock, Zap, CheckCircle2, UserCircle, ZoomIn, ZoomOut, Maximize
} from "lucide-react";

export default function PDFSignerPro() {
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
  const [zoom, setZoom] = useState(0.9); 

  const fonts = [
    { id: 'GreatVibes', name: 'Elegant Script', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/greatvibes/GreatVibes-Regular.ttf' },
    { id: 'AlexBrush', name: 'Classic Calligraphy', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/alexbrush/AlexBrush-Regular.ttf' },
    { id: 'DancingScript', name: 'Casual Cursive', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/dancingscript/DancingScript-Regular.ttf' },
    { id: 'Satisfy', name: 'Brush Script', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/satisfy/Satisfy-Regular.ttf' },
    { id: 'Caveat', name: 'Marker Style', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/caveat/Caveat-Regular.ttf' },
    { id: 'Pacifico', name: 'Bold Script', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/pacifico/Pacifico-Regular.ttf' },
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
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPdfFile(e.target.files[0]);
      if (previewUrl) setPreviewUrl(null);
      setZoom(0.9); 
    }
  };

  const processSignature = async (isDownload: boolean = false) => {
    if (!pdfFile || !signatureText) return alert("Configure settings first");
    setIsProcessing(true);
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      pdfDoc.registerFontkit(fontkit);
      
      const selectedFontConfig = fonts.find((f) => f.id === fontStyle) || fonts[0];
      let signatureFont;

      try {
        if (selectedFontConfig.url) {
          const res = await fetch(selectedFontConfig.url);
          if (!res.ok) throw new Error("Network error");
          const fontBytes = await res.arrayBuffer();
          signatureFont = await pdfDoc.embedFont(fontBytes);
        } else {
          signatureFont = await pdfDoc.embedFont(selectedFontConfig.font || StandardFonts.TimesRomanItalic);
        }
      } catch (err) {
        signatureFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
      }

      const pages = pdfDoc.getPages();
      const fontSize = 35;
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
        page.drawText(signatureText, { x, y, size: fontSize, font: signatureFont, color, rotate: degrees(-3) });
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      if (isDownload) {
        const link = document.createElement('a');
        link.href = url;
        link.download = `Signed_${pdfFile.name}`;
        link.click();
      } else {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(url);
      }
    } catch (error) { console.error(error); } 
    finally { setIsProcessing(false); }
  };

  return (
    <main className="flex h-screen bg-[#0b0e14] text-slate-300 overflow-hidden font-sans select-none">
      
      {/* 
          STRICT SINGLE BLACK SCROLLBAR LOGIC:
          1. Hide standard browser bars on all elements.
          2. Explicitly style the custom master scrollbar.
          3. Hide iframe-internal white scrollbars.
      */}
      <style jsx global>{`
        :root { color-scheme: dark; }

        /* Master Application Dark Scrollbar */
        .master-scrollbar::-webkit-scrollbar {
          width: 10px !important;
        }
        .master-scrollbar::-webkit-scrollbar-track {
          background: #0b0e14 !important;
        }
        .master-scrollbar::-webkit-scrollbar-thumb { 
          background: #1e293b !important; 
          border-radius: 10px !important; 
          border: 2px solid #0b0e14 !important; 
        }
        .master-scrollbar::-webkit-scrollbar-thumb:hover { background: #6366f1 !important; }

        /* Hide the white iframe scrollbar by masking */
        .mask-container {
          width: 100%;
          overflow-x: hidden;
          position: relative;
        }

        .pdf-viewer-iframe {
          width: calc(100% + 40px); /* Push the white bar off-screen */
          height: 100%;
          min-height: 4000px; /* Huge height so it doesn't scroll internally */
          border: none;
          pointer-events: auto;
        }
      `}</style>

      {/* SIDEBAR */}
      <aside className="w-[320px] bg-[#0f172a] border-r border-slate-800 flex flex-col shrink-0 z-20">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="bg-indigo-500/20 p-2 rounded-lg border border-indigo-500/30">
            <FileText className="text-indigo-400 w-5 h-5" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight uppercase">PDFSign Pro</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 master-scrollbar">
          <section>
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Configuration</h3>
            <p className="text-xs font-semibold text-slate-200 mb-2">Document Settings</p>
            <div className="h-px bg-slate-800 mb-6" />
            <div className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${pdfFile ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'}`}>
              <input type="file" accept=".pdf" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
              <Upload className="w-5 h-5 text-indigo-400 mx-auto mb-2" />
              <p className="text-[10px] font-black text-slate-500 uppercase truncate px-2">{pdfFile ? pdfFile.name : "Select PDF"}</p>
            </div>
          </section>

          <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2 tracking-widest">
              <UserCircle className="w-3 h-3" /> Signer Full Name
            </label>
            <input
              type="text"
              placeholder="Ex: Alexander Hamilton"
              value={signatureText}
              onChange={(e) => setSignatureText(e.target.value)}
              className="w-full bg-[#1e293b] border border-slate-700 p-3.5 rounded-xl text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2 tracking-widest">Typography</label>
              <select value={fontStyle} onChange={(e) => setFontStyle(e.target.value)} className="w-full bg-[#1e293b] border border-slate-700 p-2 rounded-lg text-[11px] font-bold text-white outline-none cursor-pointer">
                {fonts.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2 tracking-widest">Ink Color</label>
              <div className="flex bg-[#1e293b] p-1 rounded-lg border border-slate-700">
                <button onClick={() => setInkColor('blue')} className={`flex-1 py-1.5 rounded text-[9px] font-black transition ${inkColor === 'blue' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500'}`}>BLUE</button>
                <button onClick={() => setInkColor('black')} className={`flex-1 py-1.5 rounded text-[9px] font-black transition ${inkColor === 'black' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500'}`}>BLACK</button>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-3 tracking-widest">Placement</label>
            <div className="grid grid-cols-2 gap-2">
              {positions.map((pos) => (
                <button key={pos.id} onClick={() => setPosition(pos.id)} className={`py-3 text-[9px] font-black border rounded-lg transition tracking-widest ${position === pos.id ? 'bg-indigo-500 text-white border-indigo-400 shadow-md' : 'bg-slate-900 text-slate-600 border-slate-800 hover:border-slate-700'}`}>
                  {pos.label.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wider">Sign All Pages</span>
            </div>
            <button onClick={() => setSignAllPages(!signAllPages)} className={`w-10 h-5 rounded-full relative transition ${signAllPages ? 'bg-indigo-500' : 'bg-slate-700'}`}>
              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all shadow-md ${signAllPages ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
        </div>

        <div className="p-6 border-t border-slate-800 bg-[#0f172a]">
          <button onClick={() => processSignature(false)} disabled={isProcessing} className="w-full bg-[#c7d2fe] hover:bg-white text-indigo-900 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50 shadow-xl shadow-indigo-500/10">
            {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />} 
            <span className="text-[10px] uppercase font-black tracking-widest">Preview Changes</span>
          </button>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <div className="flex-1 flex flex-col relative bg-[#0b0e14] overflow-hidden">
        <header className="px-8 py-4 bg-[#0b0e14] border-b border-slate-800 flex justify-between items-center z-20 shadow-xl">
          <div className="flex gap-8">
            {['Documents', 'Templates', 'Archive'].map(tab => (
              <button key={tab} className={`text-[10px] font-bold uppercase tracking-[0.2em] transition ${tab === 'Documents' ? 'text-indigo-400 border-b-2 border-indigo-400 pb-2' : 'text-slate-500 hover:text-slate-300'}`}>{tab}</button>
            ))}
          </div>
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-black text-white shadow-lg">HS</div>
        </header>

        {/* WORKSPACE Area (One and Only Master Scrollbar) */}
        <div className="flex-1 relative flex flex-col items-center p-6 overflow-hidden">
          {previewUrl ? (
            <div className="w-full h-full flex flex-col gap-4 animate-in fade-in duration-500 max-w-[1400px]">
              
              <div className="flex justify-between items-center bg-[#0f172a]/90 backdrop-blur-md p-3 px-6 rounded-2xl border border-slate-800 shadow-2xl z-10 shrink-0">
                 <div className="flex items-center gap-6">
                    <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Live Preview</span>
                    <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-1 border border-slate-800">
                       <button onClick={() => setZoom(prev => Math.max(0.4, prev - 0.1))} className="p-1.5 hover:bg-slate-800 rounded transition text-slate-400"><ZoomOut className="w-3.5 h-3.5" /></button>
                       <span className="text-[9px] font-black text-slate-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
                       <button onClick={() => setZoom(prev => Math.min(2, prev + 0.1))} className="p-1.5 hover:bg-slate-800 rounded transition text-slate-400"><ZoomIn className="w-3.5 h-3.5" /></button>
                       <button onClick={() => setZoom(0.9)} className="p-1.5 hover:bg-slate-800 rounded transition text-slate-400 ml-1 border-l border-slate-800"><Maximize className="w-3.5 h-3.5" /></button>
                    </div>
                 </div>
                 <button onClick={() => processSignature(true)} className="bg-indigo-500 hover:bg-indigo-400 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition shadow-lg active:scale-95"><Download className="w-3.5 h-3.5" /> Download PDF</button>
              </div>

              {/* 
                  MASTER SCROLL CONTAINER (The only scrolling area) 
              */}
              <div className="flex-1 w-full bg-[#111827] rounded-[2rem] border-4 border-slate-800 shadow-2xl overflow-y-auto overflow-x-hidden p-8 master-scrollbar">
                <div 
                  className="origin-top mask-container flex flex-col items-center"
                  style={{ transform: `scale(${zoom})`, transition: 'transform 0.1s ease-out' }}
                >
                  <iframe 
                    src={`${previewUrl}#toolbar=0&navpanes=0`} 
                    className="pdf-viewer-iframe bg-white shadow-2xl rounded"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="m-auto text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 max-w-lg">
              <div className="relative mb-10 inline-block">
                <div className="w-32 h-32 bg-[#0f172a] rounded-[3rem] flex items-center justify-center border-2 border-slate-800 shadow-2xl"><FileText className="w-12 h-12 text-slate-700" /></div>
                <div className="absolute -bottom-2 -right-2 bg-indigo-500 p-2.5 rounded-2xl border-4 border-[#0b0e14] shadow-lg animate-bounce"><Plus className="w-4 h-4 text-white" /></div>
              </div>
              <h2 className="text-4xl font-black text-white tracking-tighter uppercase">Workspace</h2>
              <p className="text-slate-500 text-sm font-medium leading-relaxed italic">Upload your document to begin the signing session.</p>
            </div>
          )}
        </div>

        {/* STATUS FOOTER */}
        <footer className="p-6 z-20 flex justify-between items-center pointer-events-none">
          <div className="bg-[#1e293b] px-4 py-2 rounded-2xl border border-slate-700 flex items-center gap-3 w-fit shadow-xl pointer-events-auto">
             <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
             <span className="text-[9px] font-black text-indigo-200 uppercase tracking-widest">System Active</span>
          </div>
          <p className="text-[9px] font-bold text-slate-700 tracking-widest uppercase">PRO V1.0.8</p>
        </footer>
      </div>
    </main>
  );
}