
import React, { useState, useEffect } from 'react';
import { ChevronLeft, MessageCircle, ExternalLink, Play, X, ZoomIn, Instagram, Link2 } from 'lucide-react';
import { UserStats, Album, PortfolioAsset } from '../../types';

interface PublicPortfolioViewProps {
  stats: UserStats;
  albums: Album[];
  onBack: () => void;
}

const PublicPortfolioView: React.FC<PublicPortfolioViewProps> = ({ stats, albums, onBack }) => {
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [lightBoxAsset, setLightBoxAsset] = useState<PortfolioAsset | null>(null);

  useEffect(() => {
    if (stats.portfolioFavicon) {
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement || document.createElement('link');
      link.type = 'image/x-icon';
      link.rel = 'icon';
      link.href = stats.portfolioFavicon;
      document.getElementsByTagName('head')[0].appendChild(link);
    }
  }, [stats.portfolioFavicon]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightBoxAsset || !selectedAlbum) return;

      const currentIndex = selectedAlbum.assets.findIndex(a => a.id === lightBoxAsset.id);
      if (e.key === 'ArrowRight') {
        const nextIndex = (currentIndex + 1) % selectedAlbum.assets.length;
        setLightBoxAsset(selectedAlbum.assets[nextIndex]);
      } else if (e.key === 'ArrowLeft') {
        const prevIndex = (currentIndex - 1 + selectedAlbum.assets.length) % selectedAlbum.assets.length;
        setLightBoxAsset(selectedAlbum.assets[prevIndex]);
      } else if (e.key === 'Escape') {
        setLightBoxAsset(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightBoxAsset, selectedAlbum]);

  const categories = ['Todos', ...Array.from(new Set(albums.map(a => a.category)))];
  const filteredAlbums = activeFilter === 'Todos' ? albums : albums.filter(a => a.category === activeFilter);
  const getAlbumCover = (album: Album) => album.assets.find(a => a.type === 'image')?.url || album.coverImage;

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      {/* Botão Voltar Admin */}
      <div className="fixed top-4 left-4 z-[100] pointer-events-none">
        <button
          onClick={selectedAlbum ? () => setSelectedAlbum(null) : onBack}
          className="pointer-events-auto bg-white/10 backdrop-blur-md border border-white/10 text-white/50 hover:text-white px-4 py-2 rounded-full flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all"
        >
          <ChevronLeft size={14} /> {selectedAlbum ? 'Voltar' : 'Admin'}
        </button>
      </div>

      {/* Cabeçalho Inspirado */}
      <nav className="w-full px-6 md:px-12 py-8 flex flex-col md:flex-row items-center justify-between gap-6 border-b border-white/5 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex gap-8 text-[11px] font-black uppercase tracking-[0.2em] text-white/40">
          <button onClick={() => { setSelectedAlbum(null); window.scrollTo(0, 0); }} className="hover:text-white transition-colors">Início</button>
          <a href={`https://wa.me/${stats.whatsapp}`} target="_blank" rel="noreferrer" className="hover:text-white transition-colors">WhatsApp</a>
        </div>

        <div className="h-12 md:h-16 flex items-center justify-center">
          {stats.portfolioLogo ? (
            <img src={stats.portfolioLogo} className="h-full object-contain max-w-[200px]" alt="Brand Logo" />
          ) : (
            <span className="text-2xl font-black cyber-font tracking-tighter">GVITOR DESIGN</span>
          )}
        </div>

        <div className="flex gap-6 items-center">
          {(stats.socialLinks || []).map((link) => (
            <a key={link.id} href={link.url.startsWith('http') ? link.url : `https://${link.url}`} target="_blank" rel="noreferrer" className="text-white/40 hover:text-white transition-all">
              {link.platform.toLowerCase() === 'instagram' ? <Instagram size={20} /> :
                link.platform.toLowerCase() === 'behance' ? <span className="font-black text-sm">Bē</span> :
                  link.platform.toLowerCase() === 'whatsapp' ? <MessageCircle size={20} /> :
                    <Link2 size={20} />}
            </a>
          ))}
        </div>
      </nav>

      {!selectedAlbum ? (
        <main className="max-w-7xl mx-auto px-6 pt-12 animate-in fade-in duration-700">
          {/* Filtros */}
          <div className="flex flex-wrap justify-center gap-4 mb-16">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`text-[10px] font-black uppercase tracking-[0.3em] px-4 py-2 transition-all ${activeFilter === cat ? 'text-white border-b-2 border-white' : 'text-white/30 hover:text-white'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/10">
            {filteredAlbums.map(album => (
              <div
                key={album.id}
                onClick={() => { setSelectedAlbum(album); window.scrollTo(0, 0); }}
                className="group relative aspect-[16/10] bg-black cursor-pointer overflow-hidden"
              >
                <img
                  src={getAlbumCover(album)}
                  alt={album.title}
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 opacity-80 group-hover:opacity-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-60 transition-opacity" />
                <div className="absolute bottom-10 left-10 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                  <span className="text-[10px] font-black uppercase text-white/50 tracking-[0.3em] mb-2 block">{album.category}</span>
                  <h2 className="text-3xl font-bold uppercase">{album.title}</h2>
                </div>
              </div>
            ))}
          </div>
        </main>
      ) : (
        <main className="max-w-7xl mx-auto px-6 py-20 animate-in slide-in-from-right-8 duration-500">
          <div className="text-center mb-20">
            <span className="text-[11px] font-black uppercase tracking-[0.5em] text-white/40 mb-4 block">{selectedAlbum.category}</span>
            <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter">{selectedAlbum.title}</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {selectedAlbum.assets.map(asset => (
              <div
                key={asset.id}
                onClick={() => asset.type === 'image' ? setLightBoxAsset(asset) : window.open().document.write(`<video autoplay controls src="${asset.url}" style="width:100%;height:100%;background:#000;"></video>`)}
                className="group relative aspect-square bg-white/5 rounded-[2rem] overflow-hidden cursor-zoom-in"
              >
                {asset.type === 'image' ? (
                  <img src={asset.url} alt="" className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-white/5">
                    <Play size={40} className="text-white/20 group-hover:text-white transition-all" />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                    <ZoomIn size={20} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      )}

      {/* Lightbox */}
      {lightBoxAsset && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-8 animate-in fade-in" onClick={() => setLightBoxAsset(null)}>
          <button className="absolute top-10 right-10 text-white/40 hover:text-white"><X size={32} /></button>
          <img src={lightBoxAsset.url} className="max-w-full max-h-full object-contain rounded-xl animate-in zoom-in-95" alt="" />
        </div>
      )}

      {/* Footer CTA */}
      <footer className="py-32 text-center max-w-2xl mx-auto px-6">
        <h2 className="text-3xl font-black uppercase tracking-tighter mb-8">Vamos elevar o seu projeto ao próximo nível?</h2>
        <a
          href={`https://wa.me/${stats.whatsapp}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-4 bg-white text-black px-12 py-5 rounded-full font-black uppercase text-xs tracking-widest hover:scale-105 transition-all active:scale-95"
        >
          Solicitar Orçamento <MessageCircle size={18} />
        </a>
        <div className="mt-12 flex justify-center gap-6">
          {(stats.socialLinks || []).map((link) => (
            <a key={link.id} href={link.url.startsWith('http') ? link.url : `https://${link.url}`} target="_blank" rel="noreferrer" className="text-white/20 hover:text-white transition-all">
              {link.platform.toLowerCase() === 'instagram' ? <Instagram size={16} /> :
                link.platform.toLowerCase() === 'behance' ? <span className="font-black text-xs uppercase tracking-tighter">Behance</span> :
                  link.platform.toLowerCase() === 'whatsapp' ? <MessageCircle size={16} /> :
                    <span className="text-[10px] font-bold uppercase tracking-widest">{link.platform}</span>}
            </a>
          ))}
        </div>
      </footer>

      {/* Botão Flutuante Móvel */}
      <a
        href={`https://wa.me/${stats.whatsapp}`}
        target="_blank"
        rel="noreferrer"
        className="fixed md:hidden bottom-8 right-8 bg-white text-black p-4 rounded-full shadow-2xl z-40 animate-bounce"
      >
        <MessageCircle size={24} />
      </a>
    </div>
  );
};

export default PublicPortfolioView;
