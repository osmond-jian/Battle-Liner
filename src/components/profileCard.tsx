interface ProfileCardProps {
  name: string;
  avatarUrl?: string;
  isOpponent?: boolean;
}

export function ProfileCard({ name, isOpponent = false }: ProfileCardProps) {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className={`flex flex-col items-center gap-1.5 shrink-0`}>
      <div className={`
        w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold select-none shadow-lg
        ${isOpponent
          ? 'bg-gradient-to-br from-red-800 to-red-600 text-red-100 ring-2 ring-red-500/40'
          : 'bg-gradient-to-br from-blue-700 to-blue-500 text-blue-100 ring-2 ring-blue-400/40'}
      `}>
        {initials || '?'}
      </div>
      <span className="text-[11px] font-semibold text-slate-400 tracking-wide">{name}</span>
    </div>
  );
}
