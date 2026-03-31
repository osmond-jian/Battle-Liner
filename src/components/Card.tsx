import React from 'react';
import { Card as CardType, CardColor } from '../types/game';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  card: CardType;
  onClick?: () => void;
  selected?: boolean;
  condensed?: boolean;
  id?: string;
  className?: string;
}

type ColorCfg = { header: string; text: string; border: string; symbol: string; condensedBg: string };

const colorConfig: Record<CardColor, ColorCfg> = {
  red:    { header: 'bg-red-600',     text: 'text-red-600',     border: 'border-red-400',     symbol: '♦', condensedBg: 'bg-red-600'     },
  blue:   { header: 'bg-blue-700',    text: 'text-blue-700',    border: 'border-blue-500',    symbol: '♠', condensedBg: 'bg-blue-700'    },
  green:  { header: 'bg-emerald-700', text: 'text-emerald-700', border: 'border-emerald-500', symbol: '♣', condensedBg: 'bg-emerald-700' },
  orange: { header: 'bg-orange-500',  text: 'text-orange-600',  border: 'border-orange-400',  symbol: '◆', condensedBg: 'bg-orange-500'  },
  purple: { header: 'bg-purple-700',  text: 'text-purple-700',  border: 'border-purple-500',  symbol: '♥', condensedBg: 'bg-purple-700'  },
  yellow: { header: 'bg-yellow-500',  text: 'text-yellow-700',  border: 'border-yellow-400',  symbol: '★', condensedBg: 'bg-yellow-500'  },
};

// Symbol and short label for non-wild tactic cards displayed on the board
const tacticMeta: Record<string, { symbol: string; short: string }> = {
  'Fog':      { symbol: '🌫', short: 'Fog'  },
  'Mud':      { symbol: '💧', short: 'Mud'  },
  'Scout':    { symbol: '👁', short: 'Scout' },
  'Redeploy': { symbol: '↩', short: 'Rdply' },
  'Deserter': { symbol: '✕', short: 'Dsrt'  },
  'Traitor':  { symbol: '⇄', short: 'Trtr'  },
};

/**
 * Whether this tactic card has been configured as a wild troop
 * (Leader, Companion Cavalry, Shield Bearers after color/value is set).
 */
function isConfiguredWild(card: CardType): boolean {
  return card.type === 'tactic' && card.color != null && card.value != null;
}

export function Card({ card, onClick, selected, condensed = false, id, className = '', ...rest }: CardProps) {
  const isTactic = card.type === 'tactic';

  // ── Configured wild tactic (Leader / Companion / Shield with color+value set) ──
  // Render as a troop card but with an amber tactic badge so the player knows it's wild.
  if (isTactic && isConfiguredWild(card)) {
    const cfg = colorConfig[card.color!];

    if (condensed) {
      return (
        <div
          id={id}
          className={`w-full h-7 rounded border border-white/20 ${cfg.condensedBg} flex items-center justify-between px-2 shadow-sm ${className}`}
          {...rest}
        >
          <span className="text-xs font-bold text-white">{card.value}</span>
          <span className="text-[9px] font-bold text-amber-300 uppercase">W</span>
        </div>
      );
    }

    return (
      <div
        id={id}
        onClick={onClick}
        className={`
          relative w-20 h-28 rounded-xl border-2 ${cfg.border}
          bg-white cursor-pointer shadow-lg overflow-hidden
          transition-all duration-150
          ${selected
            ? `ring-2 ring-yellow-400 ring-offset-2 ring-offset-slate-900 -translate-y-4 shadow-yellow-400/40`
            : 'hover:-translate-y-1 hover:shadow-xl'}
          ${className}
        `}
        {...rest}
      >
        <div className={`${cfg.header} h-3 w-full`} />
        <div className="absolute top-3.5 left-1.5 leading-none select-none">
          <div className={`text-[13px] font-black leading-none ${cfg.text}`}>{card.value}</div>
          <div className={`text-[10px] leading-none ${cfg.text}`}>{cfg.symbol}</div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center select-none">
          <span className={`text-4xl font-black ${cfg.text}`}>{card.value}</span>
        </div>
        {/* Amber "WILD" badge in top-right corner */}
        <div className="absolute top-1.5 right-1 bg-amber-500 text-black text-[8px] font-black px-1 rounded leading-tight select-none uppercase tracking-tight">
          wild
        </div>
        <div className="absolute bottom-3.5 right-1.5 leading-none rotate-180 select-none">
          <div className={`text-[13px] font-black leading-none ${cfg.text}`}>{card.value}</div>
          <div className={`text-[10px] leading-none ${cfg.text}`}>{cfg.symbol}</div>
        </div>
      </div>
    );
  }

  // ── Non-wild tactic card ───────────────────────────────────────────────────
  if (isTactic) {
    const meta = card.name ? tacticMeta[card.name] : undefined;

    if (condensed) {
      return (
        <div
          id={id}
          className={`w-full h-7 rounded border border-amber-600 bg-slate-800 flex items-center gap-1 px-2 shadow-sm ${className}`}
          {...rest}
        >
          {meta && <span className="text-sm leading-none">{meta.symbol}</span>}
          <span className="text-[10px] font-semibold text-amber-400 truncate">
            {meta ? meta.short : card.name}
          </span>
        </div>
      );
    }

    return (
      <div
        id={id}
        onClick={onClick}
        className={`
          relative w-20 h-28 rounded-xl border-2 border-amber-600 bg-slate-800
          cursor-pointer shadow-lg overflow-hidden
          transition-all duration-150
          ${selected
            ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900 -translate-y-4 shadow-amber-400/40'
            : 'hover:-translate-y-1 hover:shadow-xl'}
          ${className}
        `}
        {...rest}
      >
        <div className="h-2.5 w-full bg-gradient-to-r from-amber-700 to-amber-500" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 pt-1">
          <span className="text-[9px] uppercase tracking-widest text-amber-400 font-bold">Tactic</span>
          {meta && <span className="text-2xl leading-none select-none">{meta.symbol}</span>}
          <span className="text-[11px] font-bold text-center text-amber-100 px-1 leading-tight">{card.name}</span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-700 to-amber-500" />
      </div>
    );
  }

  // ── Troop card ─────────────────────────────────────────────────────────────
  const cfg = colorConfig[card.color!];

  if (condensed) {
    return (
      <div
        id={id}
        className={`w-full h-7 rounded border border-white/20 ${cfg.condensedBg} flex items-center justify-between px-2 shadow-sm ${className}`}
        {...rest}
      >
        <span className="text-xs font-bold text-white">{card.value}</span>
        <span className="text-xs text-white/70">{cfg.symbol}</span>
      </div>
    );
  }

  return (
    <div
      id={id}
      onClick={onClick}
      className={`
        relative w-20 h-28 rounded-xl border-2 ${cfg.border}
        bg-white cursor-pointer shadow-lg overflow-hidden
        transition-all duration-150
        ${selected
          ? `ring-2 ring-yellow-400 ring-offset-2 ring-offset-slate-900 -translate-y-4 shadow-yellow-400/40`
          : 'hover:-translate-y-1 hover:shadow-xl'}
        ${className}
      `}
      {...rest}
    >
      <div className={`${cfg.header} h-3 w-full`} />
      <div className="absolute top-3.5 left-1.5 leading-none select-none">
        <div className={`text-[13px] font-black leading-none ${cfg.text}`}>{card.value}</div>
        <div className={`text-[10px] leading-none ${cfg.text}`}>{cfg.symbol}</div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center select-none">
        <span className={`text-4xl font-black ${cfg.text}`}>{card.value}</span>
      </div>
      <div className="absolute bottom-3.5 right-1.5 leading-none rotate-180 select-none">
        <div className={`text-[13px] font-black leading-none ${cfg.text}`}>{card.value}</div>
        <div className={`text-[10px] leading-none ${cfg.text}`}>{cfg.symbol}</div>
      </div>
    </div>
  );
}
