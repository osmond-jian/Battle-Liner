import { useState } from 'react';
import { GameManager } from './components/GameManager';
import { LandingPage } from './components/LandingPage';

function App() {
  const [inGame, setInGame] = useState(false);

  if (!inGame) {
    return <LandingPage onStart={() => setInGame(true)} />;
  }

  return <GameManager onExit={() => setInGame(false)} />;
}

export default App;