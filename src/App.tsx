import { useState } from 'react';
import { GameManager } from './components/GameManager';
import { LandingPage } from './components/LandingPage';
import { hasSave, loadGame, getSaveDate, type LoadedSave } from './utils/saveGame';

function App() {
  const [inGame, setInGame] = useState(false);
  const [loadedSave, setLoadedSave] = useState<LoadedSave | null>(null);
  // Re-check save existence whenever we return to the landing page.
  const [saveExists, setSaveExists] = useState(() => hasSave());

  const handleStart = () => {
    setLoadedSave(null);
    setInGame(true);
  };

  const handleContinue = () => {
    const save = loadGame();
    if (save) {
      setLoadedSave(save);
      setInGame(true);
    }
  };

  const handleExit = () => {
    setInGame(false);
    setSaveExists(hasSave());
  };

  if (!inGame) {
    return (
      <LandingPage
        onStart={handleStart}
        onContinue={handleContinue}
        hasSave={saveExists}
        saveDate={getSaveDate()}
      />
    );
  }

  return (
    <GameManager
      onExit={handleExit}
      initialState={loadedSave ?? undefined}
    />
  );
}

export default App;
