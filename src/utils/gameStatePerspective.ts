import type { GameState } from '../types/game';

/**
 * Flips a GameState between the two players' perspectives.
 *
 * The sender always encodes from their own perspective (playerHand = my cards).
 * The receiver calls this so that playerHand = their own cards.
 */
export function flipGameStatePerspective(state: GameState): GameState {
  return {
    ...state,
    playerHand:            state.opponentHand,
    opponentHand:          state.playerHand,
    playerTacticsPlayed:   state.opponentTacticsPlayed,
    opponentTacticsPlayed: state.playerTacticsPlayed,
    gameStatus: state.gameStatus === 'playerWon'   ? 'opponentWon'
              : state.gameStatus === 'opponentWon' ? 'playerWon'
              : state.gameStatus,
    flags: state.flags.map(f => ({
      ...f,
      formation: {
        player:   { ...f.formation.opponent },
        opponent: { ...f.formation.player },
      },
      winner: f.winner === 'player' ? 'opponent'
            : f.winner === 'opponent' ? 'player'
            : null,
    })),
    playerPlayedTactics:   state.opponentPlayedTactics,
    opponentPlayedTactics: state.playerPlayedTactics,
    // Selection and pending modal states are local-only — always clear on receipt.
    selectedCard:      null,
    selectedFlag:      null,
    pendingTactics:    null,
    pendingTraitor:    null,
    deserterActive:    false,
    traitorActive:     false,
    redeployState:     false,
    leaderPending:     undefined,
    companionPending:  undefined,
    shieldPending:     undefined,
    scoutDrawStep:     null,
  };
}
