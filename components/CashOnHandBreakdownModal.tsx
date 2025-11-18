import React from 'react';
import { Collection } from '../types';

interface CashOnHandBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  collections: Collection[];
  totalCashOnHand: number;
}

const CashOnHandBreakdownModal: React.FC<CashOnHandBreakdownModalProps> = ({ isOpen, onClose, collections, totalCashOnHand }) => {
  if (!isOpen) return null;

  // Filter and sort collections: show only those with collected amounts, sorted by most recently created.
  const collectionsWithFunds = collections
    .map(collection => ({
      ...collection,
      total: collection.payments.reduce((sum, p) => sum + p.amount, 0),
    }))
    .filter(collection => collection.total > 0)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Cash on Hand Breakdown</h2>
          <p className="text-sm text-gray-500">Details of active, unremitted collections.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {collectionsWithFunds.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {collectionsWithFunds.map(collection => (
                  <li key={collection.id} className="py-3 flex justify-between items-center">
                    <span className="text-gray-800 font-medium truncate pr-4">{collection.name}</span>
                    <span className="font-semibold text-gray-900 flex-shrink-0">
                      ₱{collection.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </li>
              ))}
            </ul>
          ) : (
            <div className="text-center text-gray-500 py-8">
                <div className="flex justify-center items-center mb-4">
                    <div className="bg-gray-100 rounded-full p-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>
                <p className="font-semibold">No Active Collections</p>
                <p className="text-sm mt-1">There are no collections with collected funds.</p>
            </div>
          )}
        </div>

        <div className="bg-gray-50 p-5 flex justify-between items-center rounded-b-lg border-t border-gray-200">
          <span className="text-lg font-bold text-gray-800">Total</span>
          <span className="text-lg font-bold text-blue-600">
            ₱{totalCashOnHand.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CashOnHandBreakdownModal;