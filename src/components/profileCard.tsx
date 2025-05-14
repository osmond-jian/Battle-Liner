interface ProfileCardProps {
  name: string;
  avatarUrl?: string;
  isOpponent?: boolean;
}

export function ProfileCard({ name, avatarUrl, isOpponent = false }: ProfileCardProps) {
  return (
    <div className={`flex items-center gap-2 bg-gray-800 p-3 rounded-lg border border-gray-700 shadow ${isOpponent ? 'self-start' : 'self-end'}`}>
      <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-600">
        {avatarUrl ? (
          <img src={avatarUrl} alt={`${name}'s avatar`} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">
            ?
          </div>
        )}
      </div>
      <div className="text-sm font-semibold text-white">{name}</div>
    </div>
  );
}
