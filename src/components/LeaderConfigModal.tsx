import { useState } from 'react';
import { CardColor, Card as CardType, CardValue } from '../types/game';

interface LeaderConfigModalProps {
  card: CardType;
  onConfirm: (color: CardColor, value: CardValue) => void;
  onCancel: () => void;
}

export function LeaderConfigModal({ onConfirm, onCancel }: LeaderConfigModalProps) {
  const [selectedColor, setSelectedColor] = useState<CardColor>('red');
  const [selectedValue, setSelectedValue] = useState<CardValue>(1);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50">
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 max-w-md w-full">
        <h2 className="text-xl text-yellow-400 font-bold mb-4">Customize Leader Card</h2>
        
        <div className="mb-4">
          <label className="block text-white font-medium mb-1">Select Color:</label>
          <select
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value as CardColor)}
            className="w-full p-2 rounded bg-gray-700 text-white"
          >
            {['red', 'blue', 'green', 'orange', 'purple', 'yellow'].map((color) => (
              <option key={color} value={color}>{color[0].toUpperCase() + color.slice(1)}</option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-white font-medium mb-1">Select Value:</label>
          <select
            value={selectedValue}
            onChange={(e) => setSelectedValue(parseInt(e.target.value) as CardValue)}
            className="w-full p-2 rounded bg-gray-700 text-white"
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map((val) => (
              <option key={val} value={val}>{val}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="bg-gray-600 px-4 py-2 rounded">Cancel</button>
          <button onClick={() => onConfirm(selectedColor, selectedValue)} className="bg-blue-500 px-4 py-2 rounded">Confirm</button>
        </div>
      </div>
    </div>
  );
}
