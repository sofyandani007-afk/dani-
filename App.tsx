
import React, { useState, useRef } from 'react';
import { SundaTheme, Accessory, GenerationHistory, AppState } from './types';
import { generateSundaImage, editSundaImage } from './services/geminiService';

const PRESET_PROMPTS: Record<SundaTheme, string> = {
  [SundaTheme.TEA_GARDEN]: "A sprawling, lush green tea plantation in Puncak, West Java, morning mist, hyper-realistic.",
  [SundaTheme.RICE_FIELD_SALAK]: "Beautiful terraced rice fields in Bogor with a clear view of Mount Salak in the background, blue sky, hyper-realistic.",
  [SundaTheme.WATERFALL]: "A majestic hidden waterfall (Curug) in a deep Sundanese jungle, crystalline water, sunlight rays, 8k resolution.",
  [SundaTheme.RIVER]: "A clean, rocky river flowing through a quiet Sundanese village, bamboo trees, midday sun, photorealistic.",
  [SundaTheme.VILLAGE]: "A peaceful traditional Sundanese village, houses with 'Julang Ngapak' roofs, surrounded by greenery.",
  [SundaTheme.EIFFEL]: "The Eiffel Tower in Paris, France, under a clear blue sky with beautiful flower gardens in the foreground, cinematic lighting.",
  [SundaTheme.LONDON]: "Big Ben and the Palace of Westminster in London, moody overcast sky, Thames river in the foreground with a red bus passing by.",
  [SundaTheme.FUJI]: "Mount Fuji in Japan with pink cherry blossoms (sakura) framing the view, clear lake reflecting the mountain, hyper-realistic.",
  [SundaTheme.CHINA]: "The Great Wall of China winding along the top of green, lush mountains, bright clear sky, midday sun, photorealistic, 8k resolution.",
  [SundaTheme.LIBERTY]: "The Statue of Liberty standing tall on Liberty Island, New York Harbor, viewed from the green grassy park nearby, bright blue sky with wispy clouds, cinematic lighting."
};

const ACCESSORY_ICONS: Record<Accessory, string> = {
  [Accessory.SUNGLASSES]: "fa-glasses",
  [Accessory.HAT]: "fa-hat-cowboy",
  [Accessory.PECI]: "fa-hat-wizard",
  [Accessory.CAPING]: "fa-mountain",
  [Accessory.ANGKLUNG]: "fa-music",
  [Accessory.PANGSI]: "fa-shirt",
  [Accessory.JACKET]: "fa-user-ninja"
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    isGenerating: false,
    currentImage: null,
    history: [],
    error: null,
    watermarkLogo: null,
    selectedAccessories: [],
  });
  const [userPrompt, setUserPrompt] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<SundaTheme | 'CUSTOM'>(SundaTheme.TEA_GARDEN);
  const [showQR, setShowQR] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const toggleAccessory = (acc: Accessory) => {
    setState(prev => ({
      ...prev,
      selectedAccessories: prev.selectedAccessories.includes(acc)
        ? prev.selectedAccessories.filter(a => a !== acc)
        : [...prev.selectedAccessories, acc]
    }));
  };

  const handleMainAction = async () => {
    setState(prev => ({ ...prev, isGenerating: true, error: null }));
    try {
      let resultUrl = '';
      const isEditing = !!state.currentImage;
      const themePrompt = selectedTheme === 'CUSTOM' ? userPrompt : PRESET_PROMPTS[selectedTheme as SundaTheme];
      
      const accessoriesPrompt = state.selectedAccessories.length > 0 
        ? `The subject should be wearing or holding: ${state.selectedAccessories.join(', ')}.`
        : "";

      if (isEditing) {
        const editInstruction = `
          Replace the entire background with: ${themePrompt}.
          ${accessoriesPrompt}
          Ensure the items (accessories/clothes) are blended naturally onto the subject with perfect perspective, scale, lighting, and shadows.
          It must look like a high-quality professional photograph.
          Match color grading and global illumination precisely.
        `;
        
        resultUrl = await editSundaImage(state.currentImage!, editInstruction);
      } else {
        const fullPrompt = `${themePrompt} A person in the foreground. ${accessoriesPrompt} Hyper-realistic photograph, 8k, cinematic lighting.`;
        resultUrl = await generateSundaImage(fullPrompt);
      }
      
      const newHistory: GenerationHistory = {
        id: Date.now().toString(),
        url: resultUrl,
        prompt: themePrompt,
        timestamp: Date.now(),
        type: isEditing ? 'edit' : 'generate',
        watermarkLogo: state.watermarkLogo || undefined
      };

      setState(prev => ({
        ...prev,
        currentImage: resultUrl,
        history: [newHistory, ...prev.history],
        isGenerating: false
      }));
    } catch (err: any) {
      setState(prev => ({ ...prev, error: err.message, isGenerating: false }));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isLogo: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (isLogo) {
        setState(prev => ({ ...prev, watermarkLogo: base64 }));
      } else {
        setState(prev => ({ ...prev, currentImage: base64, error: null }));
      }
    };
    reader.readAsDataURL(file);
  };

  const downloadWithWatermark = (url: string) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const padding = img.width * 0.03;

        if (state.watermarkLogo) {
          const logoImg = new Image();
          logoImg.onload = () => {
            // Updated to 200px as requested
            const targetWidth = 200;
            const logoWidth = Math.min(targetWidth, img.width * 0.4);
            const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
            
            // Top-left placement
            ctx.drawImage(logoImg, padding, padding, logoWidth, logoHeight);
            finishDownload(canvas);
          };
          logoImg.src = state.watermarkLogo;
        } else {
          finishDownload(canvas);
        }
      }
    };
    img.src = url;
  };

  const finishDownload = (canvas: HTMLCanvasElement) => {
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `sundascape-200px-${Date.now()}.png`;
    link.click();
  };

  const handleNativeShare = async () => {
    if (!state.currentImage) return;
    try {
      const res = await fetch(state.currentImage);
      const blob = await res.blob();
      const file = new File([blob], "sundascape.png", { type: 'image/png' });
      if (navigator.share) {
        await navigator.share({ files: [file], title: 'SundaScape AI', text: 'Tingali abdi nuju aya di lokasi ieu!' });
      }
    } catch (err) { console.error(err); }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="sticky top-0 z-50 glass-effect border-b border-emerald-100 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-emerald-600 p-2 rounded-lg shadow-lg">
              <i className="fa-solid fa-kaaba text-white text-xl"></i>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-800 to-teal-600 bg-clip-text text-transparent">SundaScape AI</h1>
              <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">Travel & Culture AI</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 lg:px-8 py-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
        
        {/* Column 1: Source & Theme (span 3) */}
        <div className="lg:col-span-3 space-y-6 overflow-y-auto max-h-[calc(100vh-120px)] pr-2 scrollbar-hide">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
              <i className="fa-solid fa-user-circle mr-3 text-emerald-600"></i> Gambar & Aksesoris
            </h2>

            <div className="space-y-3 mb-6">
              <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => handleFileUpload(e)} accept="image/*" />
              <input type="file" ref={cameraInputRef} className="hidden" onChange={(e) => handleFileUpload(e)} accept="image/*" capture="user" />
              
              <button onClick={() => fileInputRef.current?.click()} className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 border-dashed transition-all group ${state.currentImage ? 'border-emerald-500 bg-emerald-50 shadow-inner' : 'border-slate-100 hover:border-emerald-500 hover:bg-emerald-50'}`}>
                <div className="flex items-center space-x-3 text-left">
                  <div className={`p-2 rounded-xl ${state.currentImage ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}><i className="fa-solid fa-cloud-arrow-up"></i></div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">Unggah Foto</p>
                    <p className="text-[10px] text-slate-400">{state.currentImage ? 'Ganti foto' : 'Media/Galeri'}</p>
                  </div>
                </div>
                {state.currentImage && <i className="fa-solid fa-check-circle text-emerald-500"></i>}
              </button>

              <button onClick={() => cameraInputRef.current?.click()} className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-dashed border-slate-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all group">
                <div className="flex items-center space-x-3">
                  <div className="bg-slate-100 text-slate-400 p-2 rounded-xl group-hover:bg-teal-600 group-hover:text-white transition"><i className="fa-solid fa-camera"></i></div>
                  <p className="text-sm font-bold text-slate-700">Kaméra Selfie</p>
                </div>
              </button>
            </div>

            <div className="h-px bg-slate-100 mb-6"></div>

            <h2 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-widest">Aksesoris</h2>
            <div className="flex flex-wrap gap-2 mb-6">
              {Object.values(Accessory).map((acc) => (
                <button
                  key={acc}
                  onClick={() => toggleAccessory(acc)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-[10px] font-bold border transition-all ${state.selectedAccessories.includes(acc) ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-slate-50 border-slate-100 text-slate-500 hover:border-emerald-200'}`}
                >
                  <i className={`fa-solid ${ACCESSORY_ICONS[acc]}`}></i>
                  <span>{acc}</span>
                </button>
              ))}
            </div>

            <div className="h-px bg-slate-100 mb-6"></div>

            <h2 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-widest">Latar Tukang</h2>
            <div className="grid grid-cols-1 gap-1.5 overflow-y-auto max-h-[300px] pr-1 scrollbar-hide">
              {Object.values(SundaTheme).map((theme) => (
                <button
                  key={theme}
                  onClick={() => setSelectedTheme(theme)}
                  className={`text-left px-4 py-3 rounded-xl text-xs font-semibold border transition-all ${selectedTheme === theme ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'}`}
                >
                  {theme}
                </button>
              ))}
              <button onClick={() => setSelectedTheme('CUSTOM')} className={`text-left px-4 py-3 rounded-xl text-xs font-semibold border transition-all ${selectedTheme === 'CUSTOM' ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-500'}`}>Edit Bebas / Prompt</button>
            </div>
            
            {selectedTheme === 'CUSTOM' && (
              <textarea value={userPrompt} onChange={(e) => setUserPrompt(e.target.value)} placeholder="Contoh: 'Di hareupen Menara Pisa...'" className="w-full h-24 mt-3 px-4 py-3 rounded-2xl border border-slate-200 text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-emerald-500" />
            )}

            <button onClick={handleMainAction} disabled={state.isGenerating || (selectedTheme === 'CUSTOM' && !userPrompt)} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-200 text-white font-bold py-4 rounded-2xl transition-all shadow-xl flex items-center justify-center space-x-3 mt-6">
              {state.isGenerating ? <><i className="fa-solid fa-spinner fa-spin"></i><span>Nuju Diolah...</span></> : <><i className={`fa-solid ${state.currentImage ? 'fa-wand-magic-sparkles' : 'fa-image'}`}></i><span>{state.currentImage ? 'Prosés Visual' : 'Jieun Gambar'}</span></>}
            </button>
          </div>
        </div>

        {/* Column 2: Watermark Column (span 2) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 h-full">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
              <i className="fa-solid fa-stamp mr-3 text-emerald-600"></i> Watermark
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Logo Branding (200px)</label>
                <input type="file" ref={logoInputRef} className="hidden" onChange={(e) => handleFileUpload(e, true)} accept="image/*" />
                <button 
                  onClick={() => logoInputRef.current?.click()}
                  className={`w-full group flex flex-col items-center justify-center p-6 rounded-3xl border-2 border-dashed transition-all ${state.watermarkLogo ? 'border-emerald-400 bg-emerald-50 shadow-inner' : 'border-slate-100 hover:border-emerald-300 hover:bg-slate-50'}`}
                >
                  {state.watermarkLogo ? (
                    <div className="relative w-full aspect-square bg-white rounded-2xl p-4 shadow-sm border border-emerald-100">
                      <img src={state.watermarkLogo} className="w-full h-full object-contain" />
                      <div className="absolute -top-2 -right-2 bg-emerald-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] shadow-lg"><i className="fa-solid fa-check"></i></div>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors mb-3">
                        <i className="fa-solid fa-image-portrait text-xl"></i>
                      </div>
                      <span className="text-xs font-bold text-slate-500 group-hover:text-emerald-700">Pilih Logo</span>
                    </>
                  )}
                </button>
                <p className="text-[9px] text-slate-400 text-center mt-3 leading-relaxed">Logo bakal otomatis dikonversi ka ukuran 200px HD dina pojok kénca luhur gambar.</p>
              </div>

              {state.watermarkLogo && (
                <button onClick={() => setState(prev => ({ ...prev, watermarkLogo: null }))} className="w-full py-2 text-[10px] font-bold text-red-400 hover:text-red-600 transition uppercase tracking-widest">
                  Hapus Logo
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Column 3: Preview Column (span 5) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-[2rem] p-6 shadow-2xl border border-slate-100 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4 px-2">
              <h2 className="text-xl font-extrabold text-slate-800">Preview Visual</h2>
              <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Live Edit</span>
              </div>
            </div>

            <div className="relative flex-1 rounded-[1.5rem] overflow-hidden bg-slate-900 flex items-center justify-center border-4 border-slate-50 shadow-inner group">
              {state.currentImage ? (
                <>
                  <img src={state.currentImage} alt="Preview" className="w-full h-full object-contain animate-fade-in" />
                  
                  {/* Watermark Overlay - Fixed to top-left and max 200px */}
                  <div className="absolute top-8 left-8 flex flex-col items-start pointer-events-none select-none drop-shadow-2xl transition-transform duration-500 group-hover:scale-105">
                    {state.watermarkLogo && (
                      <div className="p-3 bg-white/20 backdrop-blur-xl rounded-2xl border border-white/30 mb-2 shadow-2xl">
                        <img src={state.watermarkLogo} className="w-[120px] md:w-[160px] lg:w-[200px] h-auto object-contain" />
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center p-12 text-slate-500">
                  <div className="w-24 h-24 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6 opacity-40 transform rotate-3">
                    <i className="fa-solid fa-camera-rotate text-5xl text-slate-400"></i>
                  </div>
                  <p className="font-bold text-lg text-slate-300">Henteu aya gambar</p>
                  <p className="text-sm mt-1 text-slate-500 px-10">Mangga mimitian ku cara ngunggah foto atanapi milih latar tukang di kolom kénca.</p>
                </div>
              )}

              {state.isGenerating && (
                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-2xl flex flex-col items-center justify-center text-white z-20">
                  <div className="relative mb-10">
                    <div className="w-24 h-24 border-[6px] border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin"></div>
                    <i className="fa-solid fa-wand-magic-sparkles absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-400 text-2xl animate-pulse"></i>
                  </div>
                  <p className="font-bold text-2xl tracking-[0.2em] uppercase text-emerald-400">Nuju Ngolah Visual</p>
                  <p className="text-slate-400 text-sm italic mt-4 text-center px-12 leading-relaxed font-medium">
                    "AI nuju ngagabungkeun subjek, aksesoris, branding, sareng latar pilihan anjeun..."
                  </p>
                </div>
              )}
            </div>

            {state.currentImage && (
              <div className="mt-6 flex flex-wrap gap-3">
                <button onClick={() => downloadWithWatermark(state.currentImage!)} className="flex-1 bg-emerald-600 text-white font-bold py-5 rounded-2xl hover:bg-emerald-700 transition-all flex items-center justify-center space-x-3 shadow-xl shadow-emerald-200/50 group active:scale-95">
                  <i className="fa-solid fa-file-export text-lg group-hover:rotate-12 transition"></i>
                  <span>Simpen HD (200px Logo)</span>
                </button>
                <button onClick={handleNativeShare} className="px-8 bg-slate-900 text-white font-bold py-5 rounded-2xl hover:bg-slate-800 transition flex items-center justify-center active:scale-95 shadow-lg">
                  <i className="fa-solid fa-share-nodes"></i>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Column 4: History & Share (span 2) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Bagikeun</h2>
            <div className="grid grid-cols-1 gap-3">
              <button onClick={() => window.open('https://wa.me/?text=Tingali abdi!', '_blank')} className="flex items-center space-x-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition group w-full">
                <i className="fa-brands fa-whatsapp text-2xl text-emerald-600 group-hover:scale-110 transition"></i>
                <span className="text-xs font-bold text-emerald-800">WhatsApp</span>
              </button>
              <button onClick={() => setShowQR(!showQR)} className="flex items-center space-x-3 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition group w-full">
                <i className="fa-solid fa-qrcode text-2xl text-slate-700 transition"></i>
                <span className="text-xs font-bold text-slate-700">Kode QR</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex-1 flex flex-col min-h-[400px]">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Koléksi</h2>
            <div className="grid grid-cols-1 gap-3 overflow-y-auto max-h-[500px] pr-1 scrollbar-hide">
              {state.history.length === 0 ? (
                <div className="py-20 text-center opacity-20">
                  <i className="fa-solid fa-images text-4xl mb-4"></i>
                  <p className="text-[10px] font-bold uppercase tracking-widest">Kosong</p>
                </div>
              ) : (
                state.history.map((item) => (
                  <div key={item.id} onClick={() => setState(prev => ({ ...prev, currentImage: item.url }))} className="aspect-square rounded-2xl overflow-hidden cursor-pointer border-2 border-transparent hover:border-emerald-500 transition shadow-sm group relative">
                    <img src={item.url} className="w-full h-full object-cover group-hover:scale-110 transition duration-1000" />
                    <div className="absolute inset-0 bg-emerald-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition duration-300">
                      <i className="fa-solid fa-eye text-white text-xl"></i>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
        .glass-effect {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }
      `}</style>
    </div>
  );
};

export default App;
