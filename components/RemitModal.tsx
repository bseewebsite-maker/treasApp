import React, { useState, useEffect } from 'react';

interface RemitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (details: { paidBy: string; receivedBy: string }) => void;
  collectionName: string;
  treasurerName: string;
}

const RemitModal: React.FC<RemitModalProps> = ({ isOpen, onClose, onConfirm, collectionName, treasurerName }) => {
  const [paidBy, setPaidBy] = useState('');
  const [receivedBy, setReceivedBy] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPaidBy(treasurerName || '');
      setReceivedBy('');
    }
  }, [isOpen, treasurerName]);

  const handleConfirm = () => {
    if (paidBy.trim() && receivedBy.trim()) {
      onConfirm({ paidBy: paidBy.trim(), receivedBy: receivedBy.trim() });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900">Remit Collection</h3>
          <p className="text-md font-bold text-blue-500 truncate">{collectionName}</p>
          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="paid-by" className="block text-sm font-medium text-gray-700">Paid By (Treasurer)</label>
              <input
                type="text"
                id="paid-by"
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="received-by" className="block text-sm font-medium text-gray-700">Received By</label>
              <input
                type="text"
                id="received-by"
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
              />
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!paidBy.trim() || !receivedBy.trim()}
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-green-300 disabled:cursor-not-allowed"
          >
            Confirm Remit
          </button>
          <button
            type="button"
            onClick={onClose}
            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default RemitModal;