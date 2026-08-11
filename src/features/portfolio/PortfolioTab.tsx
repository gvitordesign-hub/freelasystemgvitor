
import React, { useState } from 'react';
import { Plus, Briefcase, Trash2 } from 'lucide-react';
import { Album, UserStats } from '../../types';
import AlbumCard from './AlbumCard';
import AlbumDetails from './AlbumDetails';

interface PortfolioTabProps {
  albums: Album[];
  stats: UserStats;
  onUpdateAlbums: (albums: Album[]) => void;
  onUpdateStats: (stats: Partial<UserStats>) => void;
  onPreviewPublic: () => void;
}

const PortfolioTab: React.FC<PortfolioTabProps> = ({ albums, stats, onUpdateAlbums, onUpdateStats, onPreviewPublic }) => {
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newAlbum, setNewAlbum] = useState({
    title: '',
    category: stats.portfolioCategories?.[0] || 'Social Media',
    coverImage: 'https://placehold.co/600x400/1e293b/a855f7?text=CAPA'
  });

  const categories = stats.portfolioCategories || ['Social Media', 'Motion Design', 'Identidade Visual', 'Web Design'];

  const handleCreateAlbum = (e: React.FormEvent) => {
    e.preventDefault();
    const album: Album = {
      id: Math.random().toString(36).substr(2, 9),
      title: newAlbum.title,
      category: newAlbum.category,
      coverImage: newAlbum.coverImage,
      assets: [],
      createdAt: new Date().toISOString()
    };
    onUpdateAlbums([...albums, album]);
    setIsCreating(false);
    setNewAlbum({
      title: '',
      category: categories[0] || 'Social Media',
      coverImage: 'https://placehold.co/600x400/1e293b/a855f7?text=CAPA'
    });
  };


  if (selectedAlbum) {
    return <AlbumDetails album={selectedAlbum} onBack={() => setSelectedAlbum(null)} onUpdate={(updated) => onUpdateAlbums(albums.map(a => a.id === updated.id ? updated : a))} />;
  }

  return (
    <div className="p-4 md:p-8 space-y-8 animate-reveal pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold cyber-font text-white uppercase">Frella Portfolio System</h1>
          <p className="text-slate-400 text-sm">Gerencie sua vitrine pública e identidade visual</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 bg-[var(--primary-color)] hover:brightness-110 text-white px-6 py-3 rounded-2xl font-black transition-all neon-shadow-primary text-xs uppercase tracking-widest"
          >
            <Plus size={18} /> Novo Álbum
          </button>
        </div>
      </div>


      {isCreating && (
        <form onSubmit={handleCreateAlbum} className="bg-slate-900 border border-[var(--primary-color)]/30 p-6 rounded-3xl grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-4">
          <div className="md:col-span-1">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Título do Álbum</label>
            <input
              required
              type="text"
              value={newAlbum.title}
              onChange={e => setNewAlbum({ ...newAlbum, title: e.target.value })}
              placeholder="Ex: Branding 2024"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-[var(--primary-color)] outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Categoria</label>
            <select
              value={newAlbum.category}
              onChange={e => setNewAlbum({ ...newAlbum, category: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-[var(--primary-color)] outline-none appearance-none"
            >
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div className="flex items-end gap-3">
            <button type="submit" className="flex-1 bg-[var(--primary-color)] text-white font-bold py-3 rounded-xl uppercase text-[10px] tracking-widest">Confirmar</button>
            <button type="button" onClick={() => setIsCreating(false)} className="px-4 bg-slate-800 text-slate-400 py-3 rounded-xl font-bold uppercase text-[10px]">Cancelar</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {albums.map(album => (
          <AlbumCard
            key={album.id}
            album={album}
            onClick={() => setSelectedAlbum(album)}
            onDelete={() => onUpdateAlbums(albums.filter(a => a.id !== album.id))}
          />
        ))}
        {albums.length === 0 && !isCreating && (
          <div className="col-span-full py-20 border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center text-slate-600">
            <Briefcase size={48} className="mb-4 opacity-20" />
            <p className="cyber-font text-xs uppercase font-bold tracking-widest">Nenhum álbum operacional</p>
            <p className="text-[10px] mt-2">Inicie um novo catálogo clicando em "Novo Álbum"</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortfolioTab;
