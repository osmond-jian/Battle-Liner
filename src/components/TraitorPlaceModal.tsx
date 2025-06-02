interface TraitorPlaceModalProps {
  onPlace: (toFlagIndex: number) => void;
}

export function TraitorPlaceModal({ onPlace }: TraitorPlaceModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-600 shadow-lg">
        <h2 className="text-xl font-bold text-yellow-300 mb-4">Choose where to place the captured card</h2>
        <div className="grid grid-cols-9 gap-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <button
              key={i}
              onClick={() => onPlace(i)}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded"
            >
              Flag {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
