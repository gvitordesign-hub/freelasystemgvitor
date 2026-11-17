// Quando sai uma versão nova, os arquivos antigos de /assets deixam de existir.
// Quem estava com o app aberto (celular/Windows/navegador) pede uma tela que não existe mais
// e recebe "Failed to fetch dynamically imported module". A solução é recarregar para pegar a versão nova.

const KEY = 'chunk-reload-at';
const GUARD_MS = 30_000; // evita laço infinito de recarregamento

export function isChunkLoadError(error: unknown): boolean {
  const msg = String((error as { message?: string } | null)?.message ?? error ?? '');
  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Loading chunk [\w-]+ failed/i.test(msg) ||
    /Unable to preload CSS/i.test(msg)
  );
}

/** Recarrega a página uma única vez (dentro de 30 s). Retorna true se mandou recarregar. */
export function reloadForNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < GUARD_MS) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* sem sessionStorage: recarrega mesmo assim */
  }
  window.location.reload();
  return true;
}
