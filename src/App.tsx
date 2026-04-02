import { useState } from 'react';
import { GameManager } from './components/GameManager';
import { LandingPage } from './components/LandingPage';
import { MultiplayerLobby } from './components/MultiplayerLobby';
import { hasSave, loadGame, getSaveDate, type LoadedSave } from './utils/saveGame';
import { decodeGameFromUrl, clearGameParam } from './utils/urlGameState';
import { getOrCreateProfile } from './utils/playerProfile';
import type { MultiplayerConfig } from './types/multiplayer';

type Screen = 'landing' | 'game' | 'lobby';

/**
 * On first render, check if the URL contains a ?game= param (invite link).
 * If so, decode it immediately and launch straight into the game.
 */
function resolveInitialScreen(): {
  screen: Screen;
  loadedSave: LoadedSave | null;
  multiplayerConfig: MultiplayerConfig | undefined;
} {
  const profile = getOrCreateProfile();
  const fromUrl = decodeGameFromUrl(profile);
  if (fromUrl) {
    clearGameParam();
    return {
      screen: 'game',
      loadedSave: { gameState: fromUrl.gameState, turnPhase: fromUrl.turnPhase, savedAt: new Date() },
      multiplayerConfig: fromUrl.multiplayerConfig,
    };
  }
  return { screen: 'landing', loadedSave: null, multiplayerConfig: undefined };
}

const initial = resolveInitialScreen();

function App() {
  const [screen, setScreen] = useState<Screen>(initial.screen);
  const [loadedSave, setLoadedSave] = useState<LoadedSave | null>(initial.loadedSave);
  const [multiplayerConfig, setMultiplayerConfig] = useState<MultiplayerConfig | undefined>(initial.multiplayerConfig);
  const [saveExists, setSaveExists] = useState(() => hasSave());

  const handleStartSolo = () => {
    setLoadedSave(null);
    setMultiplayerConfig(undefined);
    setScreen('game');
  };

  const handleContinue = () => {
    const save = loadGame();
    if (save) {
      setLoadedSave(save);
      setMultiplayerConfig(undefined);
      setScreen('game');
    }
  };

  const handleExit = () => {
    setScreen('landing');
    setSaveExists(hasSave());
  };

  const handleStartMultiplayer = (config: MultiplayerConfig) => {
    setMultiplayerConfig(config);
    setLoadedSave(null);
    setScreen('game');
  };

  if (screen === 'lobby') {
    return (
      <MultiplayerLobby
        onBack={() => setScreen('landing')}
        onStartGame={handleStartMultiplayer}
      />
    );
  }

  if (screen === 'game') {
    return (
      <GameManager
        onExit={handleExit}
        initialState={loadedSave ?? undefined}
        multiplayerConfig={multiplayerConfig}
      />
    );
  }

  return (
    <LandingPage
      onStart={handleStartSolo}
      onMultiplayer={() => setScreen('lobby')}
      onContinue={handleContinue}
      hasSave={saveExists}
      saveDate={getSaveDate()}
    />
  );
}

export default App;
