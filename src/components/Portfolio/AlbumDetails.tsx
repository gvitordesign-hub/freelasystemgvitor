import React, { useState, useRef } from 'react';
import { ChevronLeft, Plus, Image as ImageIcon, Film, Trash2, X, Play, Loader2, Upload, Files } from 'lucide-react';
import { Album, PortfolioAsset } from '../../types';

interface AlbumDetailsProps {
  album: Album;
  onBack: () => void;
  onUpdate: (album: Album) => void;
}

const AlbumDetails: React.FC<AlbumDetailsProps> = ({ album, onBack, onUpdate }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = img.width;
          canvas.height = img.height;
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/webp', 0.8));
          } else reject('Canvas Error');
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleBatchFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Fix: Explicitly cast Array.from result to File[] to avoid 'unknown' inference and fix property access errors
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    setIsProcessing(true);
    setProcessProgress({ current: 0, total: files.length });

    const newAssets: PortfolioAsset[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProcessProgress(prev => ({ ...prev, current: i + 1 }));

      try {
        let url = '';
        let type: 'image' | 'video' = file.type.startsWith('image/') ? 'image' : 'video';

        if (type === 'image') {
          url = await processImage(file);
        } else {
          url = await new Promise((res) => {
            const r = new FileReader();
            r.onload = (ev) => res(ev.target?.result as string);
            r.readAsDataURL(file);
          });
        }

        newAssets.push({
          id: Math.random().toString(36).substr(2, 9),
          type,
          url,
          description: ''
        });
      } catch (err) {
        console.error('Falha ao processar arquivo:', file.name);
      }
    }

    onUpdate({ ...album, assets: [...album.assets, ...newAssets] });
    setIsProcessing(false);
    setIsAdding(false);
  };

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in slide-in-from-right-8 duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-[var(--primary-color)] transition-all text-[10px] font-black uppercase tracking-[0.2em] group">
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 group-hover:border-[var(--primary-color)]/30 transition-all">
            <ChevronLeft size={16} />
          </div>
          Voltar aos Álbuns
        </button>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-3 bg-[var(--primary-color)] hover:brightness-110 text-white px-8 py-4 rounded-2xl font-black transition-all neon-shadow-primary text-xs uppercase tracking-widest group"
        >
          <div className="p-1.5 bg-white/20 rounded-lg group-hover:scale-110 transition-transform">
            <Plus size={18} />
          </div>
          Injetar Mídias
        </button>
      </div>

      <div className="bg-slate-900/40 border border-slate-800 p-10 rounded-[2.5rem] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[var(--primary-color)]/5 blur-[120px] -z-10 group-hover:bg-[var(--primary-color)]/10 transition-all duration-1000" />
        <div className="relative z-10">
          <span className="text-[9px] font-black uppercase tracking-[0.4em] text-[var(--primary-color)] mb-4 block opacity-70">Diretório: {album.category}</span>
          <h1 className="text-4xl md:text-5xl font-black text-white cyber-font uppercase tracking-tighter mb-2">{album.title}</h1>
          <div className="flex gap-4 items-center">
            <div className="h-1 w-12 bg-[var(--primary-color)] rounded-full shadow-[0_0_10px_var(--primary-color)]" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{album.assets.length} Itens Operacionais</span>
          </div>
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-[2.5rem] p-8 space-y-6 animate-in zoom-in-95 duration-500 shadow-2xl">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[var(--primary-color)]/20 rounded-xl text-[var(--primary-color)]">
                  <Upload size={20} />
                </div>
                <div>
                  <h3 className="font-black text-white uppercase text-sm tracking-widest">Upload em Lote</h3>
                  <p className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">Protocolo de Otimização WEBP Ativo</p>
                </div>
              </div>
              <button
                onClick={() => setIsAdding(false)}
                className="p-2 text-slate-600 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div
              onClick={() => !isProcessing && fileInputRef.current?.click()}
              className={`relative h-64 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center cursor-pointer transition-all duration-500 ${isProcessing ? 'border-amber-500/50 bg-amber-500/5 cursor-wait' : 'border-slate-800 hover:border-[var(--primary-color)]/50 bg-slate-800/20'}`}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                multiple
                accept="image/*,video/*"
                onChange={handleBatchFileChange}
              />

              {isProcessing ? (
                <>
                  <div className="relative mb-6">
                    <Loader2 className="text-amber-500 animate-spin" size={48} />
                    <div className="absolute inset-0 bg-amber-500/20 blur-xl animate-pulse rounded-full" />
                  </div>
                  <span className="text-sm font-black uppercase text-amber-500 tracking-[0.2em] mb-2">Sincronizando Mídias</span>
                  <div className="w-48 bg-slate-800 h-1 rounded-full overflow-hidden mt-2">
                    <div
                      className="bg-amber-500 h-full transition-all duration-300 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                      style={{ width: `${(processProgress.current / processProgress.total) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-black text-slate-600 mt-4 uppercase tracking-[0.1em]">{processProgress.current} / {processProgress.total}</span>
                </>
              ) : (
                <>
                  <div className="p-5 bg-slate-900/50 rounded-3xl mb-6 border border-slate-800 group-hover:scale-110 transition-transform duration-500">
                    <Files className="text-slate-500" size={48} />
                  </div>
                  <span className="text-sm font-black text-slate-200 uppercase tracking-widest">Injetar Arquivos</span>
                  <p className="text-[10px] text-slate-600 uppercase mt-2 tracking-tighter font-bold">Arraste ou clique para selecionar</p>
                </>
              )}
            </div>

            <button
              onClick={() => setIsAdding(false)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest transition-all"
            >
              Cancelar Protocolo
            </button>
          </div>
        </div>
      )}

      {album.assets.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {album.assets.map(asset => (
            <div key={asset.id} className="group relative aspect-square bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden hover:border-[var(--primary-color)]/40 transition-all duration-500 shadow-xl">
              {asset.type === 'image' ? (
                <img src={asset.url} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800/50 backdrop-blur-sm">
                  <div className="p-4 bg-[var(--primary-color)]/10 rounded-full border border-[var(--primary-color)]/20 mb-3 group-hover:scale-110 transition-transform">
                    <Play className="text-[var(--primary-color)]" size={32} />
                  </div>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Protocolo Vídeo</span>
                </div>
              )}

              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-4">
                <button
                  onClick={() => onUpdate({ ...album, assets: album.assets.filter(a => a.id !== asset.id) })}
                  className="p-4 bg-rose-500/15 text-rose-500 hover:bg-rose-500 hover:text-white rounded-2xl transition-all border border-rose-500/20 shadow-lg translate-y-2 group-hover:translate-y-0 duration-500"
                >
                  <Trash2 size={24} />
                </button>
                <span className="text-[10px] font-black uppercase text-white/40 tracking-widest opacity-0 group-hover:opacity-100 transition-opacity delay-200">Excluir Item</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-32 border-2 border-dashed border-slate-800 rounded-[3rem] flex flex-col items-center justify-center text-slate-700 space-y-4">
          <div className="p-8 bg-slate-900/50 rounded-full border border-slate-800 opacity-20">
            <ImageIcon size={64} />
          </div>
          <div className="text-center">
            <p className="cyber-font text-sm uppercase font-black tracking-[0.3em]">Repositório Vazio</p>
            <p className="text-[10px] mt-2 font-bold opacity-50 uppercase tracking-tighter">Injete novas mídias para começar o catálogo</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlbumDetails;