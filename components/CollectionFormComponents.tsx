import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Collection, CustomField, CustomFieldOption, ValueSet } from '../types';

// Deep clones a custom field and all its descendants, assigning new unique IDs.
export const cloneCustomField = (field: CustomField): CustomField => {
  const newField: CustomField = {
    ...field,
    id: crypto.randomUUID(),
  };
  
  const oldToNewIdMap = new Map<string, string>();

  if (newField.options) {
    newField.options = newField.options.map(opt => {
        const newId = crypto.randomUUID();
        oldToNewIdMap.set(opt.id, newId);
        return { ...opt, id: newId };
    });
  }
  
  if (newField.subFields) {
    const newSubFields: { [key: string]: CustomField[] } = {};
    for (const oldOptionId in newField.subFields) {
      if (Object.prototype.hasOwnProperty.call(newField.subFields, oldOptionId)) {
        const newOptionId = oldToNewIdMap.get(oldOptionId);
        if (newOptionId) {
            newSubFields[newOptionId] = newField.subFields[oldOptionId].map(cloneCustomField);
        }
      }
    }
    newField.subFields = newSubFields;
  }
  
  return newField;
};

interface ValueSetsManagerProps {
  isOpen: boolean;
  onClose: () => void;
  valueSets: ValueSet[];
  setValueSets: React.Dispatch<React.SetStateAction<ValueSet[]>>;
}

const ValueSetsManager: React.FC<ValueSetsManagerProps> = ({ isOpen, onClose, valueSets, setValueSets }) => {
    const [editingSet, setEditingSet] = useState<ValueSet | null>(null);
    const [setName, setSetName] = useState('');
    const [setOptions, setSetOptions] = useState<CustomFieldOption[]>([]);
    const [nameError, setNameError] = useState<string | null>(null);

    const startNew = () => {
        setEditingSet(null);
        setSetName('');
        setSetOptions([{id: crypto.randomUUID(), value: ''}]);
        setNameError(null);
    };

    const startEditing = (valueSet: ValueSet) => {
        setEditingSet(valueSet);
        setSetName(valueSet.name);
        setSetOptions(JSON.parse(JSON.stringify(valueSet.options)));
        setNameError(null);
    };

    useEffect(() => {
        if (!isOpen) {
            startNew();
        }
    }, [isOpen]);

    useEffect(() => {
        if (!setName) {
            setNameError(null);
            return;
        }
        const isDuplicate = valueSets.some(vs => 
            vs.name.toLowerCase() === setName.trim().toLowerCase() && vs.id !== editingSet?.id
        );
        if (isDuplicate) {
            setNameError('A set with this name already exists.');
        } else {
            setNameError(null);
        }
    }, [setName, editingSet, valueSets]);

    const handleOptionChange = (id: string, value: string) => {
        setSetOptions(prev => prev.map(opt => opt.id === id ? {...opt, value} : opt));
    };

    const addOption = () => {
        setSetOptions(prev => [...prev, {id: crypto.randomUUID(), value: ''}]);
    };

    const removeOption = (id: string) => {
        setSetOptions(prev => prev.filter(opt => opt.id !== id));
    };

    const handleSave = () => {
        if (nameError || !setName.trim()) return;

        const finalOptions = setOptions.map(o => ({...o, value: o.value.trim()})).filter(o => o.value);
        if (finalOptions.length === 0) return;

        if (editingSet) { // Update existing
            setValueSets(prev => prev.map(vs => vs.id === editingSet.id ? {...vs, name: setName.trim(), options: finalOptions} : vs));
        } else { // Add new
            setValueSets(prev => [...prev, {id: crypto.randomUUID(), name: setName.trim(), options: finalOptions}]);
        }
        startNew();
    };

    const handleDelete = (id: string) => {
        if (window.confirm("Are you sure you want to delete this set? This cannot be undone.")) {
            setValueSets(prev => prev.filter(vs => vs.id !== id));
            if (editingSet?.id === id) {
                startNew();
            }
        }
    };

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[90vh] flex flex-col">
          <header className="p-4 border-b flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Manage Value Sets</h2>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </header>
          <div className="flex-1 flex overflow-hidden">
            <aside className="w-1/3 border-r overflow-y-auto">
                <div className="p-2">
                    <button onClick={startNew} className="w-full text-left p-2 rounded-md font-semibold text-blue-600 hover:bg-blue-50">
                        + Create New Set
                    </button>
                </div>
                <nav>
                    <ul>
                        {valueSets.map(vs => (
                            <li key={vs.id}>
                                <a href="#" onClick={(e) => { e.preventDefault(); startEditing(vs); }} className={`block p-2 border-l-4 ${editingSet?.id === vs.id ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-gray-100'}`}>
                                    <p className="font-medium text-gray-800 truncate">{vs.name}</p>
                                    <p className="text-xs text-gray-500">{vs.options.length} choices</p>
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>
            </aside>
            <main className="flex-1 p-6 overflow-y-auto space-y-4">
                    <h3 className="font-bold text-lg">{editingSet ? 'Edit Set' : 'Create New Set'}</h3>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Set Name</label>
                        <input type="text" value={setName} onChange={e => setSetName(e.target.value)} placeholder="e.g., T-Shirt Sizes" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        {nameError && <p className="text-sm text-red-500 mt-1">{nameError}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Choices</label>
                        <div className="space-y-2 mt-1">
                            {setOptions.map((opt, index) => (
                                <div key={opt.id} className="flex items-center gap-2">
                                    <input type="text" value={opt.value} onChange={e => handleOptionChange(opt.id, e.target.value)} placeholder={`Choice ${index + 1}`} className="flex-grow min-w-0 px-2 py-1 bg-white border border-gray-300 rounded-md shadow-sm text-sm" />
                                    <button type="button" onClick={() => removeOption(opt.id)} className="p-1 text-red-500 rounded-full hover:bg-red-100"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" /></svg></button>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={addOption} className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                            Add Choice
                        </button>
                    </div>
                    <div className="flex justify-between items-center pt-4">
                        <div>
                            {editingSet && <button onClick={() => handleDelete(editingSet.id)} type="button" className="px-4 py-2 text-sm text-red-600 bg-red-100 rounded-md hover:bg-red-200">Delete Set</button>}
                        </div>
                        <button onClick={handleSave} disabled={!!nameError || !setName.trim() || setOptions.every(o => !o.value.trim())} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300">
                            {editingSet ? 'Save Changes' : 'Create Set'}
                        </button>
                    </div>
                </main>
          </div>
        </div>
      </div>
    );
};


interface CustomFieldBuilderProps {
    fields: CustomField[];
    setFields: React.Dispatch<React.SetStateAction<CustomField[]>>;
    copyableFields: CustomField[];
    valueSets: ValueSet[];
    setValueSets: React.Dispatch<React.SetStateAction<ValueSet[]>>;
    isSubField?: boolean;
    ancestorIds?: string[];
    collection?: Collection;
}

export const CustomFieldBuilder: React.FC<CustomFieldBuilderProps> = ({ fields, setFields, copyableFields, valueSets, setValueSets, isSubField = false, ancestorIds = [], collection }) => {
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [isManagerOpen, setIsManagerOpen] = useState(false);

    const handleAddField = () => {
        const newId = crypto.randomUUID();
        setFields(prev => [...prev, { id: newId, name: '', type: 'text' }]);
    };

    const handleTypeChange = (fieldId: string, newType: CustomField['type']) => {
        setFields(prevFields => prevFields.map(f => {
            if (f.id !== fieldId) return f;
    
            const updatedField: CustomField = { ...f, type: newType };
    
            const isOptionBased = newType === 'option' || newType === 'checkbox';
    
            if (isOptionBased) {
                if (!updatedField.options) {
                    updatedField.options = [{ id: crypto.randomUUID(), value: '' }];
                }
            } else {
                delete updatedField.options;
                delete updatedField.subFields;
                delete updatedField.valueSetId;
            }
            
            return updatedField;
        }));
    };
    
    const handleUpdateField = (id: string, newFieldData: Partial<CustomField>) => {
        setFields(prev => prev.map(f => f.id === id ? { ...f, ...newFieldData } : f));
    };

    const handleRemoveField = (id: string) => {
        if (collection) {
            const fieldHasData = collection.payments.some(p => p.customFieldValues && p.customFieldValues[id]);
            if (fieldHasData) {
                if (!window.confirm("This field has data from students. Are you sure you want to remove it? This will delete that data from all student payments in this collection.")) {
                    return;
                }
            }
        }
        setFields(prev => prev.filter(f => f.id !== id));
    };

    const handleUpdateOption = (fieldId: string, optionId: string, updates: Partial<CustomFieldOption>) => {
        setFields(prev => prev.map(f => {
            if (f.id !== fieldId) return f;
            return {
                ...f,
                options: (f.options || []).map(o => 
                    o.id === optionId ? { ...o, ...updates } : o
                )
            };
        }));
    };
    
    const handleRemoveOptionAmount = (fieldId: string, optionId: string) => {
        setFields(prev => prev.map(f => {
            if (f.id !== fieldId) return f;
            return {
                ...f,
                options: (f.options || []).map(o => {
                    if (o.id === optionId) {
                        const { amount, ...rest } = o;
                        return rest;
                    }
                    return o;
                })
            };
        }));
    };
    
    const handleLinkValueSet = (fieldId: string, valueSetId: string) => {
        if (!valueSetId) { 
            handleUpdateField(fieldId, { valueSetId: undefined });
        } else {
            const selectedSet = valueSets.find(vs => vs.id === valueSetId);
            if (selectedSet) {
                handleUpdateField(fieldId, {
                    valueSetId: selectedSet.id,
                    options: JSON.parse(JSON.stringify(selectedSet.options))
                });
            }
        }
    };
    
    const handleCreateNewSubField = (parentField: CustomField, option: CustomFieldOption) => {
        const newId = crypto.randomUUID();
        const newSubField: CustomField = { id: newId, name: '', type: 'text' };
        const currentSubFields = parentField.subFields?.[option.id] || [];
        const updatedSubFields = { ...(parentField.subFields || {}), [option.id]: [...currentSubFields, newSubField] };
        handleUpdateField(parentField.id, { subFields: updatedSubFields });
        setOpenDropdown(null);
    };

    const handleLinkValueSetAsSubField = (parentField: CustomField, option: CustomFieldOption, valueSet: ValueSet) => {
        const newId = crypto.randomUUID();
        const newSubField: CustomField = {
            id: newId,
            name: valueSet.name,
            type: 'option',
            options: JSON.parse(JSON.stringify(valueSet.options)),
            valueSetId: valueSet.id,
        };
        const currentSubFields = parentField.subFields?.[option.id] || [];
        const updatedSubFields = { ...(parentField.subFields || {}), [option.id]: [...currentSubFields, newSubField] };
        handleUpdateField(parentField.id, { subFields: updatedSubFields });
        setOpenDropdown(null);
    };

    return (
        <div className="space-y-4">
            {(fields || []).map(field => {
                const isLinked = !!field.valueSetId;
                const isOptionType = field.type === 'option' || field.type === 'checkbox';
                
                return (
                <div key={field.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                        <input
                            type="text"
                            placeholder={isSubField ? "Sub-Field Name" : "Field Name (e.g., Size)"}
                            value={field.name}
                            onChange={(e) => handleUpdateField(field.id, { name: e.target.value })}
                            className="flex-grow min-w-0 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                        <select
                            value={field.type}
                            onChange={(e) => handleTypeChange(field.id, e.target.value as CustomField['type'])}
                            className="flex-shrink-0 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                            <option value="text">Text</option>
                            <option value="option">Option</option>
                            <option value="checkbox">Checkbox</option>
                        </select>
                        <button type="button" onClick={() => handleRemoveField(field.id)} className="flex-shrink-0 p-2 text-red-500 bg-red-100 rounded-full hover:bg-red-200"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>

                    {isOptionType && (
                         <div className="space-y-3">
                            <div className="bg-white p-3 rounded-md border">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-sm font-medium text-gray-700">Choices</label>
                                    <select
                                        value={field.valueSetId || ''}
                                        onChange={(e) => handleLinkValueSet(field.id, e.target.value)}
                                        className="text-xs border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Manual Entry</option>
                                        {valueSets.map(vs => <option key={vs.id} value={vs.id}>{vs.name}</option>)}
                                    </select>
                                </div>
                              <div className="space-y-2 mt-1">
                                  {(field.options || []).map((option) => (
                                    <div key={option.id}>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                placeholder="Choice Name (e.g., Large)"
                                                value={option.value}
                                                disabled={isLinked}
                                                onChange={(e) => handleUpdateOption(field.id, option.id, { value: e.target.value })}
                                                className="flex-grow min-w-0 px-2 py-1 border-gray-300 rounded-md shadow-sm text-sm disabled:bg-gray-100 disabled:text-gray-500"
                                            />
                                            <div className="flex-shrink-0">
                                                {option.amount !== undefined ? (
                                                    <div className="relative">
                                                        <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-xs text-gray-500">₱</span>
                                                        <input
                                                            type="number"
                                                            placeholder="Amount"
                                                            value={option.amount || ''}
                                                            disabled={isLinked}
                                                            onChange={(e) => handleUpdateOption(field.id, option.id, { amount: e.target.value ? parseFloat(e.target.value) : undefined })}
                                                            className="w-24 pl-5 pr-1 py-1 bg-white border border-gray-300 rounded-md shadow-sm text-sm disabled:bg-gray-100"
                                                            min="0" step="0.01"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveOptionAmount(field.id, option.id)}
                                                            className="absolute -right-1 -top-1 p-0.5 bg-gray-200 rounded-full text-gray-500 hover:bg-red-200 hover:text-red-600"
                                                            aria-label="Remove amount"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        disabled={isLinked}
                                                        onClick={() => handleUpdateOption(field.id, option.id, { amount: 0 })}
                                                        className="text-xs px-2 py-1 border border-dashed border-gray-400 text-gray-600 rounded-md hover:border-blue-500 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        + Amount
                                                    </button>
                                                )}
                                            </div>
                                            <button type="button" disabled={isLinked} onClick={() => {
                                              const newOptions = (field.options || []).filter(o => o.id !== option.id);
                                              handleUpdateField(field.id, { options: newOptions });
                                            }} className="flex-shrink-0 p-1 text-red-500 rounded-full hover:bg-red-100 disabled:text-gray-400 disabled:hover:bg-transparent"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" /></svg></button>
                                        </div>

                                        {/* Sub-field section for this option */}
                                        <div className="pl-4 mt-2 border-l-2 border-gray-200">
                                            {field.subFields?.[option.id] && (
                                                <CustomFieldBuilder
                                                    isSubField
                                                    fields={field.subFields[option.id]}
                                                    setFields={(updater) => {
                                                        const currentSubFields = field.subFields?.[option.id] || [];
                                                        const newSubFields = typeof updater === 'function' ? updater(currentSubFields) : updater;
                                                        const updatedSubFields = { ...(field.subFields || {}), [option.id]: newSubFields };
                                                        handleUpdateField(field.id, { subFields: updatedSubFields });
                                                    }}
                                                    ancestorIds={[...ancestorIds, field.id]}
                                                    copyableFields={copyableFields}
                                                    collection={collection}
                                                    valueSets={valueSets}
                                                    setValueSets={setValueSets}
                                                />
                                            )}
                                             <div className="relative inline-block text-left mt-2">
                                                <div>
                                                    <button type="button" onClick={() => setOpenDropdown(openDropdown === `${field.id}-${option.id}` ? null : `${field.id}-${option.id}`)} className="text-xs text-gray-500 hover:text-blue-600 font-semibold flex items-center gap-1 transition-colors">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                                        Add Dependent Field
                                                    </button>
                                                </div>
                                                {openDropdown === `${field.id}-${option.id}` && (
                                                    <div className="origin-top-left absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                                                        <div className="py-1 max-h-60 overflow-y-auto" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                                                            <button onClick={() => handleCreateNewSubField(field, option)} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">
                                                                New Blank Field
                                                            </button>
                                                            
                                                            {valueSets.length > 0 && (
                                                                <>
                                                                    <div className="border-t my-1"></div>
                                                                    <p className="px-4 pt-1 pb-1 text-xs text-gray-500">Add from Pre-defined Set</p>
                                                                    {valueSets.map(vs => (
                                                                        <button 
                                                                            key={vs.id}
                                                                            onClick={() => handleLinkValueSetAsSubField(field, option, vs)}
                                                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 truncate"
                                                                            title={vs.name}
                                                                            role="menuitem"
                                                                        >
                                                                            {vs.name}
                                                                        </button>
                                                                    ))}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                    </div>
                                  ))}
                              </div>
                              <button type="button" disabled={isLinked} onClick={() => handleUpdateField(field.id, { options: [...(field.options || []), {id: crypto.randomUUID(), value: ''}] })} className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 disabled:text-gray-400 disabled:cursor-not-allowed">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                  Add Choice
                              </button>
                            </div>
                      </div>
                    )}
                </div>
            )})}
            
            <button type="button" onClick={handleAddField} className={`w-full mt-3 flex items-center justify-center px-4 py-2 border-2 border-dashed border-gray-300 text-sm font-medium rounded-lg text-gray-600 bg-white hover:border-blue-500 hover:text-blue-600 transition-all ${isSubField ? 'text-xs py-1.5' : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 ${isSubField ? 'h-4 w-4' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                {isSubField ? 'Add Dependent Field' : 'Add Custom Field'}
            </button>

            {!isSubField && (
                 <div className="pt-4 mt-4">
                    <button type="button" onClick={() => setIsManagerOpen(true)} className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                        </svg>
                        Manage Pre-defined Value Sets
                    </button>
                 </div>
            )}

            <ValueSetsManager
                isOpen={isManagerOpen}
                onClose={() => setIsManagerOpen(false)}
                valueSets={valueSets}
                setValueSets={setValueSets}
            />
        </div>
    );
};