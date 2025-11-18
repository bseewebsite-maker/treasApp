import React, { useState, useEffect, useMemo } from 'react';
import { Collection, CollectionType, CustomField, CustomFieldOption } from '../types';
import { MONTHS } from '../constants';

interface AddCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCollectionAdded: (collection: Collection) => void;
  onAddRegularCollection: () => void;
  hasStudents: boolean;
  collections: Collection[];
}

// NOTE: CollectionForm and its helpers are defined inside this file
// This is because they were previously part of the modal and are only used here and in AddCollectionScreen
// In a larger app, these would be separate components.

const CollectionForm: React.FC<{
  type: CollectionType,
  onSubmit: (collection: Omit<Collection, 'id' | 'payments' | 'createdAt'>) => void;
  onClose: () => void;
  collections: Collection[];
}> = ({ type, onSubmit, onClose, collections }) => {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>(MONTHS[new Date().getMonth()]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  const [nameError, setNameError] = useState<string | null>(null);
  const [deadlineError, setDeadlineError] = useState<string | null>(null);

  // For 'ulikdanay', derive the name and set it.
  useEffect(() => {
    if (type === 'ulikdanay') {
      const ulikdanayName = `Ulikdanay Fund for the Month of ${selectedMonth}`;
      setName(ulikdanayName);
      setTargetAmount('5');
    }
  }, [type, selectedMonth]);

  // For both types, validate the current name.
  useEffect(() => {
    if (!name) { // No name yet, so no error
        setNameError(null);
        return;
    }
    const currentName = name.trim().toLowerCase();
    const isDuplicate = collections.some(c => c.name.trim().toLowerCase() === currentName);

    if (isDuplicate) {
        const errorMessage = type === 'ulikdanay'
            ? 'An ulikdanay collection for this month already exists.'
            : 'A collection with this name already exists.';
        setNameError(errorMessage);
    } else {
        setNameError(null);
    }
  }, [name, collections, type]);


  useEffect(() => {
    if (deadline) {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize today to the start of the day
      const deadlineDate = new Date(deadline);

      if (deadlineDate < today) {
        setDeadlineError('Deadline cannot be in the past.');
      } else {
        setDeadlineError(null);
      }
    } else {
      setDeadlineError(null);
    }
  }, [deadline]);

  const getSuggestedDate = (daysToAdd: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysToAdd);
    return date.toISOString().split('T')[0];
  };

  const getEndOfMonthDate = () => {
      const date = new Date();
      return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
  }

  // Recursive function to clean and validate custom fields and their subfields
  const getValidCustomFields = (fields: CustomField[]): CustomField[] => {
    return fields
      .map(field => {
        const newField = { ...field };
        newField.name = field.name.trim();
        
        if (field.type !== 'text' && field.options) {
          // FIX: Correctly map over `CustomFieldOption` objects, trimming their `value` property
          // and filtering out any options that become empty.
          newField.options = field.options.map(opt => ({...opt, value: opt.value.trim()})).filter(opt => opt.value);
        } else {
          delete newField.options;
        }

        if ((field.type === 'option' || field.type === 'checkbox') && field.subFields) {
            const validSubFields: { [key: string]: CustomField[] } = {};
            Object.entries(field.subFields).forEach(([optionValue, subFields]) => {
                const validSubs = getValidCustomFields(subFields);
                if (validSubs.length > 0) {
                    validSubFields[optionValue] = validSubs;
                }
            });
            if (Object.keys(validSubFields).length > 0) {
                newField.subFields = validSubFields;
            } else {
                delete newField.subFields;
            }
        } else {
            delete newField.subFields;
        }

        return newField;
      })
      .filter(f => f.name && (f.type === 'text' || (f.options && f.options.length > 0)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || (type === 'ulikdanay' && !targetAmount) || nameError || deadlineError) return;

    const validFields = getValidCustomFields(customFields);

    onSubmit({
      name,
      type,
      targetAmount: targetAmount ? parseFloat(targetAmount) : undefined,
      deadline: deadline || undefined,
      customFields: validFields.length > 0 ? validFields : undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <h2 className="text-xl font-bold text-gray-900 capitalize">{type} Collection</h2>
      
      {type === 'ulikdanay' ? (
        <div>
          <label className="block text-sm font-medium text-gray-700">Month</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            {MONTHS.map(month => <option key={month} value={month}>{month}</option>)}
          </select>
          {nameError && <p className="mt-1 text-sm text-red-600">{nameError}</p>}
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700">Collection Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            required
          />
          {nameError && <p className="mt-1 text-sm text-red-600">{nameError}</p>}
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Target Amount (Optional)</label>
        <input
          type="number"
          value={targetAmount}
          onChange={(e) => setTargetAmount(e.target.value)}
          readOnly={type === 'ulikdanay'}
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm read-only:bg-gray-100"
          min="0"
          step="0.01"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Deadline (Optional)</label>
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
        {deadlineError && <p className="mt-1 text-sm text-red-600">{deadlineError}</p>}
        <div className="mt-2 flex space-x-2 text-xs">
            <button type="button" onClick={() => setDeadline(getSuggestedDate(1))} className="px-2 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors">Tomorrow</button>
            <button type="button" onClick={() => setDeadline(getSuggestedDate(7))} className="px-2 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors">Next Week</button>
            <button type="button" onClick={() => setDeadline(getEndOfMonthDate())} className="px-2 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors">End of Month</button>
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
        <button type="submit" disabled={!!nameError || !!deadlineError} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed">Add Collection</button>
      </div>
    </form>
  )
}


const AddCollectionModal: React.FC<AddCollectionModalProps> = ({ isOpen, onClose, onCollectionAdded, onAddRegularCollection, hasStudents, collections }) => {
  const [collectionType, setCollectionType] = useState<CollectionType | null>(null);

  const handleAddUlikdanay = (collectionData: Omit<Collection, 'id' | 'payments' | 'createdAt'>) => {
    const newCollection: Collection = {
      ...collectionData,
      id: Date.now().toString(),
      payments: [],
      createdAt: new Date().toISOString()
    };
    onCollectionAdded(newCollection);
    handleClose();
  };

  const handleSelectRegular = () => {
    onClose();
    onAddRegularCollection();
  };

  const handleClose = () => {
    setCollectionType(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-end z-50">
      <div className="bg-white rounded-t-lg w-full max-w-lg animate-slide-up max-h-[90vh] flex flex-col">
        {!hasStudents ? (
          <div className="p-6 text-center">
            <h2 className="text-xl font-bold text-gray-900">Add Students First</h2>
            <p className="text-gray-600 mt-2">Please import students in the 'Students' tab before creating a collection.</p>
            <button onClick={onClose} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">OK</button>
          </div>
        ) : collectionType === 'ulikdanay' ? (
          <div className="flex-1 overflow-y-auto">
            <CollectionForm type="ulikdanay" onSubmit={handleAddUlikdanay} onClose={handleClose} collections={collections} />
          </div>
        ) : (
          <div className="p-6">
            <h2 className="text-xl font-bold text-center text-gray-900 mb-4">Choose Collection Type</h2>
            <div className="flex flex-col space-y-3">
              <button
                onClick={() => setCollectionType('ulikdanay')}
                className="w-full text-left p-4 bg-blue-50 rounded-lg hover:bg-blue-100"
              >
                <h3 className="font-semibold text-blue-800">Ulikdanay</h3>
                <p className="text-sm text-blue-600">Fixed name and amount (₱5) for monthly funds.</p>
              </button>
              <button
                onClick={handleSelectRegular}
                className="w-full text-left p-4 bg-green-50 rounded-lg hover:bg-green-100"
              >
                <h3 className="font-semibold text-green-800">Regular Collection</h3>
                <p className="text-sm text-green-600">Custom name and target amount for specific purposes.</p>
              </button>
            </div>
             <button onClick={onClose} className="mt-4 w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
          </div>
        )}
      </div>
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default AddCollectionModal;