import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { LanguageProvider } from './LanguageContext'
import { AppLayout } from './layout/AppLayout'
import { AlbumDetail } from './pages/AlbumDetail'
import { ArtistDetail } from './pages/ArtistDetail'
import { Home } from './pages/Home'
import { NotFound } from './pages/NotFound'
import { QueuePage } from './pages/QueuePage'
import { SearchResults } from './pages/SearchResults'
import { PlayerProvider } from './player/PlayerContext'
import { ToastProvider } from './ui/ToastContext'
import { UIProvider } from './ui/UIContext'

/**
 * Provider order matters:
 *  - `ToastProvider` is outermost because the player reports stream failures
 *    through it;
 *  - `PlayerProvider` sits above the router so playback and the queue survive
 *    every navigation;
 *  - `UIProvider` owns the queue drawer / now-playing sheet, which the shell and
 *    the player both drive.
 */
export default function App() {
  return (
    <ToastProvider>
      <LanguageProvider>
        <PlayerProvider>
          <UIProvider>
            <BrowserRouter>
              <Routes>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/search" element={<SearchResults />} />
                  <Route path="/album/:token" element={<AlbumDetail />} />
                  <Route path="/artist/:token" element={<ArtistDetail />} />
                  <Route path="/queue" element={<QueuePage />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </UIProvider>
        </PlayerProvider>
      </LanguageProvider>
    </ToastProvider>
  )
}
