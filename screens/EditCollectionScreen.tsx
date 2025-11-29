import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Collection, CustomField, ValueSet } from '../types';
import { CustomFieldBuilder } from '../components/CollectionFormComponents';
import { useValueSets } from '../contexts/ValueSetsContext';

interface EditCollectionScreenProps {
  collection: Collection;
  onBack: () => void;
  onSave: (updatedCollection: Collection) => void;
  collections: Collection[];
}

const EditCollectionScreen: React.FC<EditCollectionScreenProps> = ({ collection, onBack, onSave, collections }) => {
  const { valueSets, setValueSets } = useValueSets();
  const [name, setName] = useState(collection.name);
  const [targetAmount, setTargetAmount] = useState(collection.targetAmount?.toString() || '');
  const [deadline, setDeadline] = useState(collection.deadline ? new Date(collection.deadline).toISOString().split('T')[0] : '');
  const [notes, setNotes] = useState(collection.notes || '');
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

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
    if (collection) {
      setName(collection.name);
      setTargetAmount(collection.targetAmount?.toString() || '');
      setDeadline(collection.deadline ? new Date(collection.deadline).toISOString().split('T')[0] : '');
      setNotes(collection.notes || '');
      setCustomFields(collection.customFields ? JSON.parse(JSON.stringify(collection.customFields)) : []);
    }
  }, [collection]);

  useEffect(() => {
    if (deadline) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
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

  useEffect(() => {
    if (name && collections.some(c => c.id !== collection.id && c.name.trim().toLowerCase() === name.trim().toLowerCase())) {
      setNameError('Another collection with this name already exists.');
    } else {
      setNameError(null);
    }
  }, [name, collection.id, collections]);
  
  const getValidCustomFields = (fields: CustomField[]): CustomField[] => {
    return fields
      .map(field => {
        const newField: CustomField = { ...field };
        newField.name = field.name.trim();

        if (field.type !== 'text' && newField.options) {
          newField.options = newField.options.map(o => ({ ...o, value: o.value.trim() })).filter(o => o.value);
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

    const updatedCollection: Collection = {
      ...collection,
      name,
      targetAmount: targetAmount ? parseFloat(targetAmount) : undefined,
      deadline: deadline || undefined,
      customFields: validFields.length > 0 ? validFields : undefined,
      notes: notes.trim() || undefined,
    };
    onSave(updatedCollection);
  };

  const isUlikdanay = collection.type === 'ulikdanay';
  const isFormValid = !nameError && !deadlineError && name.trim();

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-white shadow-sm p-4 flex items-center z-20 sticky top-0">
        <button onClick={onBack} className="mr-4 text-gray-600 hover:text-blue-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900 truncate">
            Edit Collection
        </h1>
      </header>
      <main className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit} ref={formRef} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <section className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Core Details</h3>
              <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Collection Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm read-only:bg-gray-100"
                      required
                      readOnly={isUlikdanay}
                    />
                    {nameError && <p className="mt-1 text-sm text-red-600">{nameError}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Target Amount (Optional)</label>
                    <input
                      type="number"
                      value={targetAmount}
                      onChange={(e) => setTargetAmount(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm read-only:bg-gray-100"
                      min="0"
                      step="0.01"
                      readOnly={isUlikdanay}
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
                  </div>
                </div>
              </section>

              {collection.type === 'regular' && (
                <>
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
                  <section className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Advanced: Custom Fields</h3>
                    <CustomFieldBuilder
                        fields={customFields}
                        setFields={setCustomFields}
                        copyableFields={allDefinedFields}
                        collection={collection}
                        valueSets={valueSets}
                        setValueSets={setValueSets}
                    />
                  </section>
                </>
              )}
          </div>
          <footer className="sticky bottom-0 bg-gray-100/90 backdrop-blur-sm p-3 border-t border-gray-200 z-10">
            <div className="flex justify-end space-x-3">
                <button type="button" onClick={onBack} className="px-5 py-2.5 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">Cancel</button>
                <button type="submit" disabled={!isFormValid} className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed">Save Changes</button>
            </div>
          </footer>
        </form>
      </main>
    </div>
  );
};

export default EditCollectionScreen;
