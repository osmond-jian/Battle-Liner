import { useState } from 'react';
import { GameManager } from './components/GameManager';
import { LandingPage } from './components/LandingPage';
import { MultiplayerLobby } from './components/MultiplayerLobby';
import { hasSave, loadGame, getSaveDate, type LoadedSave } from './utils/saveGame';
import { loadMpSession } from './utils/mpSession';
import type { MultiplayerConfig } from './types/multiplayer';
import type { TurnPhase } from './types/game';

type Screen = 'landing' | 'game' | 'lobby';

function randomFirstTurn(): TurnPhase {
  return Math.random() < 0.5 ? 'player' : 'opponent';
}

function App() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [loadedSave, setLoadedSave] = useState<LoadedSave | null>(null);
  const [multiplayerConfig, setMultiplayerConfig] = useState<MultiplayerConfig | undefined>(undefined);
  const [soloFirstTurn, setSoloFirstTurn] = useState<TurnPhase | undefined>(undefined);
  const [saveExists, setSaveExists] = useState(() => hasSave());
  const [mpSession] = useState(() => loadMpSession());

  const handleStartSolo = () => {
    setLoadedSave(null);
    setMultiplayerConfig(undefined);
    setSoloFirstTurn(randomFirstTurn());
    setScreen('game');
  };

  const handleContinue = () => {
    const save = loadGame();
    if (save) {
      setLoadedSave(save);
      setMultiplayerConfig(undefined);
      setSoloFirstTurn(undefined); // turn phase comes from the save
      setScreen('game');
    }
  };

  const handleExit = () => {
    setScreen('landing');
    setSaveExists(hasSave());
  };

  const handleRejoin = () => {
    if (!mpSession) return;
    const config: MultiplayerConfig = {
      localPlayer: { id: mpSession.playerId, username: mpSession.playerName },
      opponentName: mpSession.opponentName,
      isHost: mpSession.isHost,
      transport: 'realtime',
      hostName:  mpSession.isHost ? mpSession.playerName : mpSession.opponentName,
      guestName: mpSession.isHost ? mpSession.opponentName : mpSession.playerName,
      currentTurnName: mpSession.playerName,
      roomCode: mpSession.roomCode,
    };
    setMultiplayerConfig(config);
    setLoadedSave(
      mpSession.isHost && mpSession.gameState
        ? { gameState: mpSession.gameState, turnPhase: mpSession.turnPhase ?? 'player', savedAt: new Date(mpSession.savedAt) }
        : null
    );
    setSoloFirstTurn(undefined);
    setScreen('game');
  };

  const handleStartMultiplayer = (config: MultiplayerConfig) => {
    setMultiplayerConfig(config);
    setLoadedSave(null);
    // Host starts as 'player' (INIT_STATE will randomise who actually goes first).
    // Guest starts as 'opponent' (waiting) until INIT_STATE arrives.
    const localGoesFirst = config.currentTurnName === config.localPlayer.username;
    setSoloFirstTurn(localGoesFirst ? 'player' : 'opponent');
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
        initialTurnPhase={soloFirstTurn}
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
      onRejoin={mpSession ? handleRejoin : undefined}
      rejoinRoomCode={mpSession?.roomCode}
    />
  );
}

export default App;
