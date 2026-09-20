import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: {
    port: 5173,
    // strictPort : sans cela, si le port 5173 est déjà pris, Vite démarre
    // silencieusement sur 5174, 5175… Or ces origines ne figurent pas dans
    // CORS_ORIGIN côté backend : le navigateur bloque alors toutes les réponses
    // de l'API et l'application affiche « Impossible de contacter le serveur »,
    // sans indiquer la vraie cause. On préfère un échec explicite au démarrage.
    strictPort: true,
  },
});
