
import React from 'react';
import { Trash2, ImageIcon, Film } from 'lucide-react';
import { Album } from '../../types';

interface AlbumCardProps {
  album: Album;
  onClick: () => void;
  onDelete: () => void;
}

const AlbumCard: React.FC<AlbumCardProps> = ({ album, onClick, onDelete }) => {
  const imagesCount = album.assets.filter(a => a.type === 'image').length;
  const videosCount = album.assets.filter(a => a.type === 'video').length;

  // Tenta pegar a primeira imagem como capa, senão usa a coverImage padrão
  const firstImageAsset = album.assets.find(a => a.type === 'image');
  const displayCover = firstImageAsset ? firstImageAsset.url : album.coverImage;

  return (
    <div className="group relative bg-slate-900/50 border border-slate-800 rounded-[2rem] overflow-hidden hover:border-[var(--primary-color)]/50 transition-all duration-500 shadow-xl hover:shadow-[var(--primary-color)]/10">
      {/* Thumbnail */}
      <div
        onClick={onClick}
        className="aspect-[4/3] bg-cover bg-center cursor-pointer transition-transform duration-700 group-hover:scale-110"
        style={{ backgroundImage: `url(${displayCover})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-90" />
      </div>

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-6 pointer-events-none">
        <div className="transform translate-y-2 group-hover:translate-y-0 transition-all duration-500">
          <span className="text-[7px] font-black uppercase tracking-[0.3em] text-[var(--primary-color)] bg-[var(--primary-color)]/10 px-2 py-1 rounded-md border border-[var(--primary-color)]/20 mb-3 inline-block backdrop-blur-sm">
            {album.category}
          </span>
          <h3 className="text-white font-black text-xl leading-tight uppercase tracking-tighter group-hover:text-[var(--primary-color)] transition-colors mb-2">
            {album.title}
          </h3>
          <div className="flex items-center gap-4 opacity-60 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
              <ImageIcon size={12} className="text-[var(--primary-color)]" /> {imagesCount}
            </div>
            <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
              <Film size={12} className="text-[var(--primary-color)]" /> {videosCount}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-2.5 bg-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white rounded-2xl backdrop-blur-md transition-all border border-rose-500/20 pointer-events-auto"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

export default AlbumCard;
