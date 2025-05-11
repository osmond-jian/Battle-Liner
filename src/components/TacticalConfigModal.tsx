// components/TacticsConfigModal.tsx
import { useState } from 'react';
import { CardColor, CardValue } from '../types/game';

interface Props {
  cardName: string;
  onConfirm: (color: CardColor, value: CardValue) => void;
  onCancel: () => void;
}

const COLORS: CardColor[] = ['red', 'blue', 'green', 'orange', 'purple', 'yellow'];
const VALUES: CardValue[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export function TacticsConfigModal({ cardName, onConfirm, onCancel }: Props) {
  const [selectedColor, setSelectedColor] = useState<CardColor>('red');
  const [selectedValue, setSelectedValue] = useState<CardValue>(1);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded shadow-lg text-white w-96">
        <h2 className="text-xl font-bold mb-4">Configure {cardName}</h2>
        
        {(cardName === 'Leader' || cardName === 'Shield Bearers' || cardName === 'Companion Cavalry') && (
          <>
            <label className="block mb-2">Color</label>
            <select
              value={selectedColor}
              onChange={e => setSelectedColor(e.target.value as CardColor)}
              className="w-full mb-4 p-2 rounded bg-gray-700"
            >
              {COLORS.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </>
        )}

        {cardName === 'Leader' && (
          <>
            <label className="block mb-2">Value</label>
            <select
              value={selectedValue}
              onChange={e => setSelectedValue(parseInt(e.target.value) as CardValue)}
              className="w-full mb-4 p-2 rounded bg-gray-700"
            >
              {VALUES.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </>
        )}

        {cardName === 'Shield Bearers' && (
          <>
            <label className="block mb-2">Value (max 3)</label>
            <select
              value={selectedValue}
              onChange={e => setSelectedValue(parseInt(e.target.value) as CardValue)}
              className="w-full mb-4 p-2 rounded bg-gray-700"
            >
              {[1, 2, 3].map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </>
        )}

        {cardName === 'Companion Cavalry' && (
          <p className="text-sm text-gray-300 mb-4">Value is fixed to 8</p>
        )}

        <div className="flex justify-end gap-4">
          <button onClick={onCancel} className="bg-gray-600 px-4 py-2 rounded hover:bg-gray-700">Cancel</button>
          <button onClick={() => onConfirm(selectedColor, selectedValue)} className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700">Confirm</button>
        </div>
      </div>
    </div>
  );
}
