import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Collection, Student, Payment, RemittedCollection, CustomField, CustomFieldOption } from '../types';
import { useStudents } from '../contexts/StudentsContext';
import { useHistory } from '../contexts/HistoryContext';
import CopyPaymentsModal from '../components/CopyPaymentsModal';
import StudentPaymentDetailModal from '../components/StudentPaymentDetailModal';

// Recursive function to get all sub-field IDs for a given parent option
const getSubFieldIds = (subFields: CustomField[] | undefined): string[] => {
    if (!subFields) return [];
    let ids: string[] = [];
    subFields.forEach(field => {
        ids.push(field.id);
        if ((field.type === 'option' || field.type === 'checkbox') && field.subFields) {
            Object.values(field.subFields).forEach(nestedSubFields => {
                ids = [...ids, ...getSubFieldIds(nestedSubFields)];
            });
        }
    });
    return ids;
};

export const getStudentTargetAmount = (collection: Collection | RemittedCollection, payment?: Payment): number => {
    let customFieldAmount = 0;
    let hasCustomAmountFieldWithValue = false;

    const processFields = (fields: CustomField[]) => {
        fields.forEach(field => {
            if (payment?.customFieldValues && (field.type === 'option' || field.type === 'checkbox')) {
                const selectedValues = payment.customFieldValues[field.id]?.split(', ').filter(Boolean) || [];
                if (selectedValues.length > 0) {
                    field.options?.forEach(option => {
                        if (selectedValues.includes(option.value) && typeof option.amount === 'number') {
                            hasCustomAmountFieldWithValue = true;
                            customFieldAmount += option.amount;
                        }
                        
                        // Recurse into sub-fields for the selected option
                        if (selectedValues.includes(option.value) && field.subFields?.[option.id]) {
                            processFields(field.subFields[option.id]);
                        }
                    });
                }
            }
        });
    };

    if (collection.customFields) {
        processFields(collection.customFields);
    }
    
    if (hasCustomAmountFieldWithValue) {
        return customFieldAmount;
    }
    
    return collection.targetAmount || 0;
};


const getCustomFieldValuesString = (
  fields: CustomField[], 
  payment: Payment
): string => {
  const getFieldDisplayString = (field: CustomField): string | null => {
    const value = payment.customFieldValues?.[field.id];
    if (!value || !value.trim()) return null;

    let mainPart = `${field.name}: ${value}`;

    if ((field.type === 'option' || field.type === 'checkbox') && field.subFields && field.options) {
      const selectedValues = value.split(', ');
      const selectedOptions = field.options.filter(opt => selectedValues.includes(opt.value));
      const allSubParts: string[] = [];

      const getSubParts = (subFields: CustomField[]): string[] => {
        return subFields.map(sf => {
          const subValue = payment.customFieldValues?.[sf.id];
          if (!subValue || !subValue.trim()) return null;
          
          let subPart = `${sf.name}: ${subValue}`;
          
          if ((sf.type === 'option' || sf.type === 'checkbox') && sf.subFields && sf.options) {
            const selectedSubValues = subValue.split(', ');
            const selectedSubOptions = sf.options.filter(opt => selectedSubValues.includes(opt.value));
            const subSubParts: string[] = [];
            selectedSubOptions.forEach(option => {
              if (sf.subFields?.[option.id]) {
                subSubParts.push(...getSubParts(sf.subFields[option.id]));
              }
            });
            if (subSubParts.length > 0) {
              subPart += ` - ${subSubParts.join(' - ')}`;
            }
          }
          return subPart;
        }).filter((s): s is string => s !== null);
      };

      selectedOptions.forEach(option => {
        if (field.subFields?.[option.id]) {
          allSubParts.push(...getSubParts(field.subFields[option.id]));
        }
      });

      if (allSubParts.length > 0) {
        mainPart += ` - ${allSubParts.join(' - ')}`;
      }
    }
    return mainPart;
  };
  
  return fields.map(getFieldDisplayString).filter((s): s is string => s !== null).join(' \u2022 ');
};


const RenderCustomFields: React.FC<{
  fields: CustomField[];
  fieldValues: { [key: string]: string };
  onValueChange: (fieldId: string, value: string) => void;
  onBulkValueChange: (values: { [key: string]: string }) => void;
}> = ({ fields, fieldValues, onValueChange, onBulkValueChange }) => {

  const handleCheckboxChange = useCallback((field: CustomField, option: CustomFieldOption, isChecked: boolean) => {
    const currentValues = fieldValues[field.id] ? fieldValues[field.id].split(', ').filter(Boolean) : [];
    let newValues;
    const newFieldValuesState = { ...fieldValues };

    if (isChecked) {
      newValues = [...currentValues, option.value];
    } else {
      newValues = currentValues.filter(v => v !== option.value);
      if (field.subFields?.[option.id]) {
        const idsToClear = getSubFieldIds(field.subFields[option.id]);
        idsToClear.forEach(id => {
          delete newFieldValuesState[id];
        });
      }
    }
    
    newFieldValuesState[field.id] = newValues.join(', ');
    onBulkValueChange(newFieldValuesState);
  }, [fieldValues, onBulkValueChange]);
  
  const handleOptionChange = useCallback((field: CustomField, newValue: string) => {
    const oldVal = fieldValues[field.id];
    const newValues = { ...fieldValues, [field.id]: newValue };
    
    const oldOption = field.options?.find(o => o.value === oldVal);

    if (oldOption && field.subFields?.[oldOption.id]) {
      const idsToClear = getSubFieldIds(field.subFields[oldOption.id]);
      idsToClear.forEach(id => delete newValues[id]);
    }
    
    onBulkValueChange(newValues);
  }, [fieldValues, onBulkValueChange]);

  return (
    <>
      {fields.map(field => {
        const selectedOptionValue = fieldValues[field.id];
        const selectedOption = field.options?.find(o => o.value === selectedOptionValue);
        const subFieldsToShow = (field.type === 'option') && selectedOption && field.subFields?.[selectedOption.id];

        return (
          <div key={field.id}>
            <div className="mb-4">
              <label htmlFor={`custom-field-${field.id}`} className="block text-sm font-medium text-gray-700 mb-1">{field.name}</label>
              {field.type === 'text' && (
                <input
                  type="text"
                  id={`custom-field-${field.id}`}
                  value={fieldValues[field.id] || ''}
                  onChange={(e) => onValueChange(field.id, e.target.value)}
                  className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              )}
              {(field.type === 'option') && (
                <select
                  id={`custom-field-${field.id}`}
                  value={fieldValues[field.id] || ''}
                  onChange={(e) => handleOptionChange(field, e.target.value)}
                  className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Select an option</option>
                  {field.options?.map(opt => <option key={opt.id} value={opt.value}>{opt.value}{opt.amount ? ` (₱${opt.amount})` : ''}</option>)}
                </select>
              )}
              {(field.type === 'checkbox') && (
                <div className="space-y-2 mt-2">
                  {field.options?.map(opt => {
                    const isChecked = (fieldValues[field.id] || '').split(', ').includes(opt.value);
                    const subFieldsForThisOption = field.subFields?.[opt.id];
                    return (
                      <div key={opt.id}>
                        <label className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={e => handleCheckboxChange(field, opt, e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-gray-800 text-sm">{opt.value}{opt.amount ? ` (₱${opt.amount})` : ''}</span>
                        </label>
                        {isChecked && subFieldsForThisOption && (
                          <div className="pl-6 pt-2 border-l-2 border-blue-200 ml-2 mt-1">
                            <RenderCustomFields 
                              fields={subFieldsForThisOption}
                              fieldValues={fieldValues}
                              onValueChange={onValueChange}
                              onBulkValueChange={onBulkValueChange}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {subFieldsToShow && (
              <div className="pl-4 border-l-2 border-blue-200">
                  <RenderCustomFields 
                    fields={subFieldsToShow}
                    fieldValues={fieldValues}
                    onValueChange={onValueChange}
                    onBulkValueChange={onBulkValueChange}
                  />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};


interface AddPaymentModalProps {
  student: Student;
  existingPayment: Payment | undefined;
  collection: Collection;
  collectionNotes?: string;
  onSave: (amount: number, customFieldValues: { [fieldId: string]: string }) => void;
  onClose: () => void;
}

const AddPaymentModal: React.FC<AddPaymentModalProps> = ({ student, existingPayment, collection, collectionNotes, onSave, onClose }) => {
  const [amountPaid, setAmountPaid] = useState<string>(existingPayment?.amount.toString() || '');
  const [customFieldValues, setCustomFieldValues] = useState<{ [fieldId: string]: string }>(existingPayment?.customFieldValues || {});

  const amountToPay = useMemo(() => {
    const tempPayment: Payment = {
        studentId: student.id,
        amount: 0, 
        customFieldValues: customFieldValues
    };
    return getStudentTargetAmount(collection, tempPayment);
  }, [collection, customFieldValues, student.id]);


  const handleSave = () => {
    const numericAmount = parseFloat(amountPaid);
    const finalAmount = !isNaN(numericAmount) && numericAmount >= 0 ? numericAmount : 0;
    
    const finalCustomValues = Object.fromEntries(
        Object.entries(customFieldValues).map(([key, value]) => [key, String(value).trim()])
    );
    
    onSave(finalAmount, finalCustomValues);
  };

  const suggestions = useMemo(() => {
    const suggs = new Set<number>();

    if (amountToPay > 0) {
      suggs.add(amountToPay);
    }

    const currentAmount = existingPayment?.amount || 0;
    if (currentAmount < amountToPay) {
      const balance = amountToPay - currentAmount;
      if (balance > 0) {
        suggs.add(balance);
      }
    }
    
    return Array.from(suggs).filter(s => s > 0).sort((a,b) => a - b);
  }, [amountToPay, existingPayment]);
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm max-h-[90vh] flex flex-col">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900">Payment for</h3>
          <p className="text-xl font-bold text-blue-500">{student.studentName}</p>
        </div>
        {collectionNotes && (
          <div className="px-6 pb-4 border-b border-gray-200">
            <div className="bg-blue-50 p-3 rounded-lg">
                <h4 className="text-xs uppercase font-bold text-blue-700 mb-1">Notes</h4>
                <p className="text-sm text-blue-800 whitespace-pre-wrap">{collectionNotes}</p>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {collection.customFields && collection.customFields.length > 0 && (
            <div className="mb-4 pb-4 border-b">
               <RenderCustomFields
                  fields={collection.customFields}
                  fieldValues={customFieldValues}
                  onValueChange={(fieldId, value) => setCustomFieldValues(prev => ({...prev, [fieldId]: value}))}
                  onBulkValueChange={setCustomFieldValues}
              />
            </div>
          )}
          
          <div className="p-3 bg-gray-100 rounded-lg mb-4">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-800">Amount to Pay:</span>
              <span className="font-bold text-xl text-blue-600">
                ₱{amountToPay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Amount Paid</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">₱</span>
              </div>
              <input
                type="number"
                id="amount"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md bg-white text-gray-900"
                placeholder="0.00"
                autoFocus
              />
            </div>
          </div>
          {suggestions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {suggestions.map(suggestion => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setAmountPaid(suggestion.toString())}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300 transition-colors"
                >
                  ₱{suggestion.toLocaleString()}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg">
          <button
            type="button"
            onClick={handleSave}
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
          >
            Save
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


interface CustomizeStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  collection: Collection;
  allStudents: Student[];
  onSave: (updatedIncludedIds: string[]) => void;
}

const CustomizeStudentsModal: React.FC<CustomizeStudentsModalProps> = ({ isOpen, onClose, collection, allStudents, onSave }) => {
  const initialSelectedIds = useMemo(() => {
    return new Set(collection.includedStudentIds ?? allStudents.map(s => s.id));
  }, [collection.includedStudentIds, allStudents]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(initialSelectedIds);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setSelectedIds(initialSelectedIds);
  }, [initialSelectedIds, isOpen]);

  const handleToggleStudent = (studentId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(allStudents.map(s => s.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleSave = () => {
    onSave(Array.from(selectedIds));
  };

  const filteredStudents = useMemo(() => {
    return allStudents.filter(student =>
      student.studentName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allStudents, searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Customize Students</h2>
          <p className="text-sm text-gray-500">Select which students are part of this collection.</p>
        </div>
        
        <div className="p-4 border-b border-gray-200">
           <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          <div className="flex justify-between items-center mt-3">
             <p className="text-sm font-medium text-gray-700">{selectedIds.size} of {allStudents.length} selected</p>
            <div className="flex space-x-2">
                <button onClick={handleSelectAll} className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200">Select All</button>
                <button onClick={handleDeselectAll} className="px-3 py-1 text-xs bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Deselect All</button>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {filteredStudents.length > 0 ? (
            <ul>
              {filteredStudents.map(student => (
                <li key={student.id} className="flex items-center p-2 rounded-md hover:bg-gray-100">
                  <label className="flex items-center w-full cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(student.id)}
                      onChange={() => handleToggleStudent(student.id)}
                      className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-3 text-gray-800">{student.studentName}</span>
                  </label>
                </li>
              ))}
            </ul>
          ) : (
             <div className="text-center py-10">
                <p className="text-gray-500">No students match "{searchTerm}".</p>
             </div>
          )}
        </div>

        <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-2 rounded-b-lg border-t border-gray-200">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
          <button type="button" onClick={handleSave} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">Save Changes</button>
        </div>
      </div>
    </div>
  );
};


interface CollectionDetailScreenProps {
  collection: Collection | RemittedCollection;
  onBack: () => void;
  onUpdateCollection: (collection: Collection) => void;
  onEditCollection: (collection: Collection) => void;
  collections: Collection[];
  highlightedStudentId?: string | null;
}

const CollectionDetailScreen: React.FC<CollectionDetailScreenProps> = ({ collection, onBack, onUpdateCollection, onEditCollection, collections, highlightedStudentId }) => {
  const { students } = useStudents();
  const { addHistoryEntry } = useHistory();
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentForPreview, setStudentForPreview] = useState<Student | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'unpaid' | 'credits' | 'debit'>('all');
  const [showMarkAllPaidConfirm, setShowMarkAllPaidConfirm] = useState(false);
  const [showMarkAllUnpaidConfirm, setShowMarkAllUnpaidConfirm] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [isCustomizeStudentsModalOpen, setIsCustomizeStudentsModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<number | null>(null);
  const longPressTriggered = useRef(false);
  const scrollableContainerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<number | null>(null);
  const studentRefs = useRef<Map<string, HTMLLIElement | null>>(new Map());

  const displayName = useMemo(() => {
    if (collection.type === 'ulikdanay') {
      const month = collection.name.match(/Month of (\w+)/)?.[1];
      if (month) {
        return `${month.toUpperCase()} - Ulikdanay`;
      }
    }
    return collection.name;
  }, [collection.name, collection.type]);

  const isRemitted = 'remittance' in collection;

  const collectionStudents = useMemo(() => {
    if (!collection.includedStudentIds) {
      return students;
    }
    const studentIdSet = new Set(collection.includedStudentIds);
    return students.filter(s => studentIdSet.has(s.id));
  }, [collection.includedStudentIds, students]);

  const hasAmountFields = useMemo(() => {
    if (!collection.customFields) return false;
    const checkFields = (fields: CustomField[]): boolean => {
        return fields.some(field => {
            if ((field.type === 'option' || field.type === 'checkbox') && field.options?.some(o => typeof o.amount === 'number')) {
                return true;
            }
            if ((field.type === 'option' || field.type === 'checkbox') && field.subFields) {
                return Object.values(field.subFields).some(subfieldArray => checkFields(subfieldArray));
            }
            return false;
        });
    };
    return checkFields(collection.customFields);
  }, [collection.customFields]);


  const [creditDebitMode, setCreditDebitMode] = useState<'credits' | 'debit'>(() => {
    return (localStorage.getItem('creditDebitMode') as 'credits' | 'debit') || 'credits';
  });

  useEffect(() => {
    localStorage.setItem('creditDebitMode', creditDebitMode);
  }, [creditDebitMode]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setIsMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const totalCollected = collection.payments.reduce((sum, p) => sum + p.amount, 0);
  const totalTargetAmount = useMemo(() => {
    return collectionStudents.reduce((sum, student) => {
        const payment = collection.payments.find(p => p.studentId === student.id);
        return sum + getStudentTargetAmount(collection, payment);
    }, 0);
  }, [collection, collectionStudents]);


  const handlePressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      handlePressEnd();
      isScrollingRef.current = true;
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = window.setTimeout(() => {
        isScrollingRef.current = false;
      }, 150);
    };

    const scrollableElement = scrollableContainerRef.current;
    scrollableElement?.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      scrollableElement?.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const handlePressStart = (student: Student) => {
    if (isScrollingRef.current) return;
    longPressTriggered.current = false;
    handlePressEnd();
    longPressTimer.current = window.setTimeout(() => {
      longPressTriggered.current = true;
      setStudentForPreview(student);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 500);
  };

  const handleStudentClick = (student: Student) => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    if (!isRemitted) {
      setSelectedStudent(student);
    }
  };

  useEffect(() => {
    if (highlightedStudentId) {
        const element = studentRefs.current.get(highlightedStudentId);
        if (element) {
            // Give the browser a moment to render before scrolling
            setTimeout(() => {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);

            element.classList.add('highlight');
            
            const timer = setTimeout(() => {
                element.classList.remove('highlight');
            }, 2000); // 2 second highlight duration

            return () => clearTimeout(timer);
        }
    }
  }, [highlightedStudentId]);

  const handleSavePayment = (amount: number, customFieldValues: { [fieldId: string]: string }) => {
    if (!selectedStudent) return;
    
    const newPayments = [...collection.payments];
    const existingPaymentIndex = newPayments.findIndex(p => p.studentId === selectedStudent.id);
    const existingPayment = existingPaymentIndex > -1 ? newPayments[existingPaymentIndex] : undefined;
    const timestamp = new Date().toISOString();

    const hasAmount = amount > 0;
    const hasCustomValues = Object.values(customFieldValues).some(v => v && v.trim() !== '');

    if (hasAmount || hasCustomValues) {
        if (existingPayment) {
          if (existingPayment.amount !== amount) {
             addHistoryEntry({
                type: 'payment_update',
                studentId: selectedStudent.id,
                studentName: selectedStudent.studentName,
                collectionId: collection.id,
                collectionName: collection.name,
                amount: amount,
                previousAmount: existingPayment.amount,
            });
          }
          newPayments[existingPaymentIndex] = { ...existingPayment, amount, customFieldValues, timestamp };
        } else {
          addHistoryEntry({
            type: 'payment_add',
            studentId: selectedStudent.id,
            studentName: selectedStudent.studentName,
            collectionId: collection.id,
            collectionName: collection.name,
            amount: amount,
          });
          newPayments.push({ studentId: selectedStudent.id, amount, customFieldValues, timestamp });
        }
    } else {
        if (existingPayment) {
            addHistoryEntry({
                type: 'payment_remove',
                studentId: selectedStudent.id,
                studentName: selectedStudent.studentName,
                collectionId: collection.id,
                collectionName: collection.name,
                previousAmount: existingPayment.amount,
            });
            newPayments.splice(existingPaymentIndex, 1);
        }
    }

    onUpdateCollection({ ...collection, payments: newPayments });
    setSelectedStudent(null);
  };
  
  const handleMarkAllPaid = () => {
    if (!collection.targetAmount || hasAmountFields) return;

    collectionStudents.forEach(student => {
        addHistoryEntry({
            type: 'payment_add',
            studentId: student.id,
            studentName: student.studentName,
            collectionId: collection.id,
            collectionName: collection.name,
            amount: collection.targetAmount || 0,
        });
    });

    const paymentsForIncludedStudents = collectionStudents.map(student => ({
        studentId: student.id,
        amount: collection.targetAmount || 0,
        timestamp: new Date().toISOString(),
    }));
    const includedStudentIdSet = new Set(collectionStudents.map(s => s.id));
    const paymentsFromOtherStudents = collection.payments.filter(p => !includedStudentIdSet.has(p.studentId));
    onUpdateCollection({ ...collection, payments: [...paymentsFromOtherStudents, ...paymentsForIncludedStudents] });
    setShowMarkAllPaidConfirm(false);
  };

  const handleMarkAllUnpaid = () => {
      const includedStudentIdSet = new Set(collectionStudents.map(s => s.id));
      
      collection.payments.forEach(payment => {
        if (includedStudentIdSet.has(payment.studentId)) {
            const student = students.find(s => s.id === payment.studentId);
            if (student) {
                 addHistoryEntry({
                    type: 'payment_remove',
                    studentId: student.id,
                    studentName: student.studentName,
                    collectionId: collection.id,
                    collectionName: collection.name,
                    previousAmount: payment.amount,
                });
            }
        }
      });

      const newPayments = collection.payments.filter(p => !includedStudentIdSet.has(p.studentId));
      onUpdateCollection({ ...collection, payments: newPayments });
      setShowMarkAllUnpaidConfirm(false);
  };

  const handleCreditDebitDoubleClick = () => {
    setCreditDebitMode(prevMode => {
        const newMode = prevMode === 'credits' ? 'debit' : 'credits';
        if (filterStatus === 'credits' || filterStatus === 'debit') {
            setFilterStatus(newMode);
        }
        return newMode;
    });
    if (navigator.vibrate) {
        navigator.vibrate(50); 
    }
  };

  const handleCreditDebitClick = () => {
      setFilterStatus(creditDebitMode);
  };

  const { paidCount, unpaidCount, creditsCount, debitCount } = useMemo(() => {
    let paid = 0;
    let credits = 0;
    let debit = 0;
    collectionStudents.forEach(student => {
        const payment = collection.payments.find(p => p.studentId === student.id);
        if (payment && payment.amount > 0) {
            paid++;
        }
        const target = getStudentTargetAmount(collection, payment);
        if (target > 0) {
            const balance = (payment?.amount || 0) - target;
            if (balance > 0) credits++;
            else if (balance < 0 && payment && payment.amount > 0) debit++;
        }
    });
    return { paidCount: paid, unpaidCount: collectionStudents.length - paid, creditsCount: credits, debitCount: debit };
  }, [collection, collectionStudents]);


  const filteredStudents = collectionStudents.filter(student => {
      const payment = collection.payments.find(p => p.studentId === student.id);
      const studentTarget = getStudentTargetAmount(collection, payment);

      switch (filterStatus) {
        case 'all':
            return true;
        case 'paid':
            return !!payment && payment.amount > 0;
        case 'unpaid':
            return !payment || payment.amount <= 0;
        case 'credits':
            if (studentTarget <= 0) return false;
            return (payment?.amount || 0) > studentTarget;
        case 'debit':
            if (studentTarget <= 0) return false;
            return payment && payment.amount > 0 && payment.amount < studentTarget;
        default:
            return true;
      }
  });

  const getFilterButtonClass = (status: 'all' | 'paid' | 'unpaid' | 'credits' | 'debit') => {
      const base = "px-3 py-1 rounded-full text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 whitespace-nowrap";
      if (filterStatus === status) {
          return `${base} bg-blue-500 text-white shadow`;
      }
      return `${base} bg-gray-200 text-gray-700 hover:bg-gray-300`;
  };

  const getEmptyStateMessage = () => {
    switch (filterStatus) {
        case 'paid':
            return 'No students have paid yet.';
        case 'unpaid':
            return 'All students have paid!';
        case 'credits':
            return 'No students have credit.';
        case 'debit':
            return 'No students have an outstanding debit.';
        default:
            return 'No students to display.';
    }
  };


  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white shadow-sm p-4 flex items-center justify-between z-20">
        <div className="flex items-center flex-1 min-w-0">
          <button onClick={onBack} className="mr-4 text-gray-600 hover:text-blue-500 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900 truncate">{displayName}</h1>
          {isRemitted && (
            <span className="ml-3 flex-shrink-0 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
              Remitted
            </span>
          )}
        </div>
        {!isRemitted && (
          <div className="relative" ref={menuRef}>
            <button onClick={() => setIsMenuOpen(prev => !prev)} className="text-gray-600 hover:text-blue-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-30 border border-gray-200">
                <button onClick={() => { onEditCollection(collection as Collection); setIsMenuOpen(false); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
                  Edit Collection
                </button>
                <button onClick={() => { setIsCustomizeStudentsModalOpen(true); setIsMenuOpen(false); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197m0 0A5.975 5.975 0 0112 15a5.975 5.975 0 013-1.197M15 21a9 9 0 00-9-9" /></svg>
                  Customize Students
                </button>
                <button onClick={() => { setIsCopyModalOpen(true); setIsMenuOpen(false); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Payments
                </button>
                <div className="my-1 h-px bg-gray-100"></div>
                <button
                  onClick={() => { setShowMarkAllPaidConfirm(true); setIsMenuOpen(false); }}
                  className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:bg-white"
                  disabled={!collection.targetAmount || hasAmountFields}
                  title={hasAmountFields ? "Disabled when collection has amount-based fields" : ""}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Mark All Paid
                </button>
                <button onClick={() => { setShowMarkAllUnpaidConfirm(true); setIsMenuOpen(false); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Mark All Unpaid
                </button>
              </div>
            )}
          </div>
        )}
      </header>
      
      <div className="p-4">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div
            onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
            className="p-3 flex justify-between items-center cursor-pointer hover:bg-gray-50"
          >
            <div className="flex items-center space-x-3">
              <span className="font-semibold text-gray-800">Summary</span>
            </div>
            <div className="flex items-center space-x-2">
              {!isSummaryExpanded && (
                <span className="font-bold text-md text-blue-500">{paidCount}/{collectionStudents.length} paid</span>
              )}
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-gray-500 transition-transform duration-300 ${isSummaryExpanded ? 'transform rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          <div className={`transition-all duration-500 ease-in-out ${isSummaryExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="border-t border-gray-200 px-4 pb-4 pt-2">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-sm text-gray-500">Collected</p>
                  <p className="font-bold text-xl text-blue-500">₱{totalCollected.toLocaleString()}</p>
                </div>
                {totalTargetAmount > 0 && (
                    <div className="text-right">
                        <p className="text-sm text-gray-500">Target</p>
                        <p className="font-semibold text-gray-800">₱{totalTargetAmount.toLocaleString()}</p>
                    </div>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-3 text-center divide-x divide-gray-200">
                <div>
                  <p className="font-bold text-gray-800">{paidCount}/{collectionStudents.length}</p>
                  <p className="text-xs text-gray-500">Paid Students</p>
                </div>
                <div className="truncate px-2">
                  <p className="font-bold text-gray-800">{collection.deadline ? new Date(collection.deadline).toLocaleDateString() : 'None'}</p>
                  <p className="text-xs text-gray-500">Deadline</p>
                </div>
                <div>
                  <p className="font-bold text-gray-800">{collection.targetAmount ? `₱${(collection.targetAmount).toLocaleString()}` : 'Varies'}</p>
                  <p className="text-xs text-gray-500">Base Amount</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-4">
            <div className="mb-2">
                <h2 className="text-lg font-semibold text-gray-800">Student Payments</h2>
            </div>
            <div className="w-full overflow-x-auto mb-2 no-scrollbar">
                <div className="flex flex-nowrap justify-start items-center gap-2 mx-auto w-max px-2">
                    <button onClick={() => setFilterStatus('all')} className={getFilterButtonClass('all')}>
                        All ({collectionStudents.length})
                    </button>
                    <button onClick={() => setFilterStatus('paid')} className={getFilterButtonClass('paid')}>
                        Paid ({paidCount})
                    </button>
                    <button onClick={() => setFilterStatus('unpaid')} className={getFilterButtonClass('unpaid')}>
                        Unpaid ({unpaidCount})
                    </button>
                    
                    <button
                        onClick={handleCreditDebitClick}
                        onDoubleClick={handleCreditDebitDoubleClick}
                        className={getFilterButtonClass(creditDebitMode)}
                    >
                        {creditDebitMode === 'credits' 
                            ? `Credits (${creditsCount})` 
                            : `Debits (${debitCount})`}
                    </button>
                </div>
            </div>
        </div>
        
        <div ref={scrollableContainerRef} className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="bg-white rounded-lg shadow">
            {filteredStudents.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {filteredStudents.map(student => {
                  const payment = collection.payments.find(p => p.studentId === student.id);
                  const studentTargetAmount = getStudentTargetAmount(collection, payment);
                  
                  let statusText = '';
                  let statusColor = 'text-gray-400';
                  
                  const amountPaid = payment?.amount || 0;
                  const amountColor = amountPaid > 0
                    ? studentTargetAmount > 0 && amountPaid >= studentTargetAmount
                      ? 'text-green-500'
                      : 'text-orange-500'
                    : 'text-gray-400';

                  if (amountPaid > 0) {
                    if (studentTargetAmount > 0) {
                      const balance = amountPaid - studentTargetAmount;
                      if (balance > 0) {
                        statusText = `Credit: ₱${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                        statusColor = 'text-blue-500';
                      } else if (balance < 0) {
                        statusText = `Debit: ₱${Math.abs(balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                        statusColor = 'text-red-500';
                      } else {
                        statusText = 'Fully Paid';
                        statusColor = 'text-green-500';
                      }
                    } else {
                        statusText = 'Paid';
                        statusColor = 'text-green-500';
                    }
                  } else {
                    statusText = 'Not Paid';
                  }

                  const customValuesString = payment && collection.customFields
                    ? getCustomFieldValuesString(collection.customFields, payment)
                    : '';

                  return (
                    <li
                      key={student.id}
                      ref={el => studentRefs.current.set(student.id, el)}
                      onClick={() => handleStudentClick(student)}
                      onMouseDown={() => handlePressStart(student)}
                      onMouseUp={handlePressEnd}
                      onMouseLeave={handlePressEnd}
                      onTouchStart={() => handlePressStart(student)}
                      onTouchEnd={handlePressEnd}
                      className={`p-4 flex justify-between items-center prevent-select ${!isRemitted ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                    >
                      <div className="min-w-0 flex-1 pr-4">
                        <p className="font-medium text-gray-800 truncate">{student.studentName}</p>
                        <p className={`text-sm font-medium ${statusColor}`}>
                          {statusText}
                        </p>
                        {customValuesString && (
                          <p className="text-xs text-gray-500 mt-1 truncate">
                            {customValuesString}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`font-semibold ${amountColor}`}>
                          {amountPaid > 0 ? `₱${amountPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Not Paid'}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-center text-gray-500 p-8">
                {getEmptyStateMessage()}
              </p>
            )}
          </div>
        </div>
      </div>
      
      {selectedStudent && (
        <AddPaymentModal
          student={selectedStudent}
          existingPayment={collection.payments.find(p => p.studentId === selectedStudent.id)}
          collection={collection as Collection}
          collectionNotes={collection.notes}
          onSave={handleSavePayment}
          onClose={() => setSelectedStudent(null)}
        />
      )}

      {studentForPreview && (
        <StudentPaymentDetailModal
            isOpen={!!studentForPreview}
            onClose={() => setStudentForPreview(null)}
            student={studentForPreview}
            payment={collection.payments.find(p => p.studentId === studentForPreview.id)}
            collection={collection}
        />
      )}

      {isCustomizeStudentsModalOpen && (
        <CustomizeStudentsModal
          isOpen={isCustomizeStudentsModalOpen}
          onClose={() => setIsCustomizeStudentsModalOpen(false)}
          collection={collection as Collection}
          allStudents={students}
          onSave={(updatedIncludedIds) => {
            onUpdateCollection({ ...collection, includedStudentIds: updatedIncludedIds } as Collection);
            setIsCustomizeStudentsModalOpen(false);
          }}
        />
      )}

      {isCopyModalOpen && (
        <CopyPaymentsModal
          isOpen={isCopyModalOpen}
          onClose={() => setIsCopyModalOpen(false)}
          collection={collection}
          students={collectionStudents}
        />
      )}
      
    {showMarkAllPaidConfirm && collection.targetAmount && !hasAmountFields && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
                <h3 className="text-lg font-bold text-gray-900">Mark All as Paid?</h3>
                <p className="mt-2 text-sm text-gray-600">
                    This will set each included student's payment to <strong>₱{(collection.targetAmount || 0).toLocaleString()}</strong>. Are you sure?
                </p>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={() => setShowMarkAllPaidConfirm(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                    <button onClick={handleMarkAllPaid} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Confirm</button>
                </div>
            </div>
        </div>
    )}

    {showMarkAllUnpaidConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
                <h3 className="text-lg font-bold text-gray-900">Mark All as Unpaid?</h3>
                <p className="mt-2 text-sm text-gray-600">This will remove all existing payment records for included students in this collection. Are you sure?</p>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={() => setShowMarkAllUnpaidConfirm(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                    <button onClick={handleMarkAllUnpaid} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Confirm</button>
                </div>
            </div>
        </div>
    )}

    </div>
  );
};

export default CollectionDetailScreen;