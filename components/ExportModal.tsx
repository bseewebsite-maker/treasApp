
import React, { useState } from 'react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (treasurerName: string) => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [treasurerName, setTreasurerName] = useState('');

  const handleConfirm = () => {
    if (treasurerName.trim()) {
      onConfirm(treasurerName.trim());
      setTreasurerName(''); // Reset for next time
    }
  };

  const handleClose = () => {
    setTreasurerName(''); // Reset on close
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900">Export Collection Data</h3>
          <p className="mt-2 text-sm text-gray-600">Please enter the Treasurer's name to be included in the report footer.</p>
          <div className="mt-4">
            <label htmlFor="treasurer-name" className="block text-sm font-medium text-gray-700">Treasurer's Name</label>
            <input
              type="text"
              id="treasurer-name"
              value={treasurerName}
              onChange={(e) => setTreasurerName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
              autoFocus
            />
          </div>
        </div>
        <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!treasurerName.trim()}
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            Export
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;