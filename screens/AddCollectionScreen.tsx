import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Collection, CollectionType, CustomField, ValueSet } from '../types';
import { CustomFieldBuilder } from '../components/CollectionFormComponents';
import { useValueSets } from '../contexts/ValueSetsContext';

type DraftCollectionData = {
  name: string;
  targetAmount: string;
  deadline: string;
  notes: string;
  customFields: CustomField[];
};

const CollectionForm: React.FC<{
  type: CollectionType,
  onSubmit: (collection: Omit<Collection, 'id' | 'payments' | 'createdAt'>) => void;
  onClose: () => void;
  collections: Collection[];
}> = ({ type, onSubmit, onClose, collections }) => {
  const { valueSets, setValueSets } = useValueSets();
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [notes, setNotes] = useState('');
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  const DRAFT_KEY = 'draftRegularCollection';

  // Load from local storage on mount
  useEffect(() => {
    if (type === 'regular') {
        const savedDraft = localStorage.getItem(DRAFT_KEY);
        if (savedDraft) {
            try {
                const draft: DraftCollectionData = JSON.parse(savedDraft);
                setName(draft.name);
                setTargetAmount(draft.targetAmount);
                setDeadline(draft.deadline);
                setNotes(draft.notes);
                setCustomFields(draft.customFields);
            } catch (e) {
                console.error("Failed to parse draft collection", e);
                localStorage.removeItem(DRAFT_KEY);
            }
        }
    }
  }, [type]);

  // Save to local storage on change
  useEffect(() => {
    if (type === 'regular') {
        const draft: DraftCollectionData = {
            name,
            targetAmount,
            deadline,
            notes,
            customFields,
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }
  }, [type, name, targetAmount, deadline, notes, customFields]);


  const allDefinedFields = useMemo(() => {
    const getAllFields = (fields: CustomField[]): CustomField[] => {
      return fields.flatMap(field => {
        const subFields = (field.type === 'option' || field.type === 'checkbox') && field.subFields
          ? Object.values(field.subFields).flatMap(getAllFields)
          : [];
        return [field, ...subFields];
      });
    };
    return getAllFields(customFields);
  }, [customFields]);

  const [nameError, setNameError] = useState<string | null>(null);
  const [deadlineError, setDeadlineError] = useState<string | null>(null);

  useEffect(() => {
    if (name && collections.some(c => c.name.trim().toLowerCase() === name.trim().toLowerCase())) {
        setNameError('A collection with this name already exists.');
    } else {
        setNameError(null);
    }
  }, [name, collections]);

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

  const getValidCustomFields = (fields: CustomField[]): CustomField[] => {
    return fields
      .map(field => {
        const newField: CustomField = { ...field };
        newField.name = field.name.trim();
        
        if (field.type !== 'text' && newField.options) {
          newField.options = newField.options.map(o => ({...o, value: o.value.trim()})).filter(o => o.value);
        } else {
          delete newField.options;
        }

        if ((field.type === 'option' || field.type === 'checkbox') && field.subFields) {
            const validSubFields: { [key: string]: CustomField[] } = {};
            Object.entries(field.subFields).forEach(([optionId, subFields]) => {
                const validSubs = getValidCustomFields(subFields);
                if (validSubs.length > 0) {
                    validSubFields[optionId] = validSubs;
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
    if (!name || nameError || deadlineError) return;

    const validFields = getValidCustomFields(customFields);

    onSubmit({
      name,
      type,
      targetAmount: targetAmount ? parseFloat(targetAmount) : undefined,
      deadline: deadline || undefined,
      customFields: validFields.length > 0 ? validFields : undefined,
      notes: notes.trim() || undefined,
    });

    if (type === 'regular') {
        localStorage.removeItem(DRAFT_KEY);
    }
  };

  const isFormValid = !nameError && !deadlineError && name.trim();

  return (
    <form onSubmit={handleSubmit} ref={formRef} className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Core Details Section */}
        <section className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Core Details</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="collection-name" className="block text-sm font-medium text-gray-700">Collection Name</label>
              <input
                type="text"
                id="collection-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
                autoFocus
              />
              {nameError && <p className="mt-1 text-sm text-red-600">{nameError}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Target Amount per Student (Optional)</label>
              <input
                type="number"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                min="0"
                step="0.01"
                placeholder="e.g., 100.00"
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
          </div>
        </section>

        {/* Optional Details Section */}
        <section className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Optional Details</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="e.g., Instructions for this collection."
              rows={3}
            />
          </div>
        </section>

        {/* Advanced Section */}
        <section className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Advanced: Custom Fields</h3>
          <p className="text-sm text-gray-500 mb-4">Add custom fields for more detailed tracking, like T-shirt sizes or event choices. These will appear when you record a student's payment.</p>
          <CustomFieldBuilder
            fields={customFields}
            setFields={setCustomFields}
            copyableFields={allDefinedFields}
            valueSets={valueSets}
            setValueSets={setValueSets}
          />
        </section>
      </div>

      <footer className="sticky bottom-0 bg-gray-100/90 backdrop-blur-sm p-3 border-t border-gray-200 z-10">
        <div className="flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">Cancel</button>
            <button type="submit" disabled={!isFormValid} className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed">Add Collection</button>
        </div>
      </footer>
    </form>
  )
}


interface AddCollectionScreenProps {
  onBack: () => void;
  onCollectionAdded: (collection: Collection) => void;
  hasStudents: boolean;
  collections: Collection[];
}

const AddCollectionScreen: React.FC<AddCollectionScreenProps> = ({ onBack, onCollectionAdded, collections }) => {
  const handleCancelAndClear = () => {
    // User explicitly cancelled, so clear the draft.
    localStorage.removeItem('draftRegularCollection');
    onBack();
  };
  
  const handleSubmit = (collectionData: Omit<Collection, 'id' | 'payments' | 'createdAt'>) => {
    const newCollection: Collection = {
      ...collectionData,
      id: Date.now().toString(),
      payments: [],
      createdAt: new Date().toISOString()
    };
    onCollectionAdded(newCollection);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
        <header className="bg-white shadow-sm p-4 flex items-center z-20 sticky top-0">
            <button onClick={onBack} className="mr-4 text-gray-600 hover:text-blue-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h1 className="text-xl font-bold text-gray-900">Add Regular Collection</h1>
        </header>
        <main className="flex-1 overflow-y-auto">
            <CollectionForm
                type="regular"
                onSubmit={handleSubmit}
                onClose={handleCancelAndClear}
                collections={collections}
            />
        </main>
    </div>
  );
};


export default AddCollectionScreen;
