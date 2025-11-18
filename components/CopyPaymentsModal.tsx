import React, { useState, useMemo } from 'react';
import { Collection, RemittedCollection, Student, Payment, CustomField } from '../types';

interface CopyPaymentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  collection: Collection | RemittedCollection;
  students: Student[];
}

const getFormattedCustomFields = (fields: CustomField[] | undefined, payment: Payment): string => {
  if (!fields || !payment.customFieldValues) return '';

  const processFieldsRecursive = (currentFields: CustomField[], indent: string): string[] => {
    const lines: string[] = [];
    currentFields.forEach(field => {
      const value = payment.customFieldValues?.[field.id];
      if (!value || !value.trim()) return;

      lines.push(`${indent}${field.name}: ${value}`);

      if ((field.type === 'option' || field.type === 'checkbox') && field.options && field.subFields) {
        const selectedValues = value.split(', ');
        selectedValues.forEach(selectedValue => {
          const option = field.options?.find(o => o.value === selectedValue);
          const subFieldsForOption = option ? field.subFields?.[option.id] : undefined;
          if (subFieldsForOption) {
            if (field.type === 'checkbox') {
              lines.push(`${indent}  ↳ ${selectedValue}`);
              lines.push(...processFieldsRecursive(subFieldsForOption, `${indent}    `));
            } else {
              lines.push(...processFieldsRecursive(subFieldsForOption, `${indent}  `));
            }
          }
        });
      }
    });
    return lines;
  };
  
  return processFieldsRecursive(fields, '  ').join('\n');
};


const CopyPaymentsModal: React.FC<CopyPaymentsModalProps> = ({ isOpen, onClose, collection, students }) => {
  const [options, setOptions] = useState({
    includeName: true,
    includePayment: true,
    includeDate: true,
    includeTime: true,
    includeNumbering: false,
  });
  const [copyButtonText, setCopyButtonText] = useState('Copy to Clipboard');

  const handleOptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setOptions(prev => ({ ...prev, [name]: checked }));
  };

  const generateTextToCopy = (limit?: number): string => {
    const paidPayments = collection.payments
      .map(payment => {
        const student = students.find(s => s.id === payment.studentId);
        if (!student || !payment.timestamp) return null;
        return { 
          ...payment, 
          studentName: student.studentName, 
          dateObject: new Date(payment.timestamp)
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .sort((a, b) => a.studentName.localeCompare(b.studentName));

    if (paidPayments.length === 0) {
      return 'No payments to copy.';
    }

    const paymentsToProcess = limit ? paidPayments.slice(0, limit) : paidPayments;

    const textLines = paymentsToProcess.map((p, index) => {
        const headerParts = [];
        if (options.includeName) headerParts.push(p.studentName);
        if (options.includePayment) headerParts.push(`₱${p.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        if (options.includeDate) headerParts.push(p.dateObject.toLocaleDateString());
        if (options.includeTime) headerParts.push(p.dateObject.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
        
        let line = headerParts.join(' - ');

        if (options.includeNumbering) {
            line = `${index + 1}. ${line}`;
        }
        
        const customFieldsText = getFormattedCustomFields(collection.customFields, p);

        return customFieldsText ? `${line}\n${customFieldsText}` : line;
    });

    let result = textLines.join('\n\n');
    if (limit && paidPayments.length > limit) {
        result += `\n...and ${paidPayments.length - limit} more`;
    }
    return result;
  };
  
  const textPreview = useMemo(() => generateTextToCopy(3), [options, collection, students]);

  const handleCopy = async () => {
    const text = generateTextToCopy();
    if (text === 'No payments to copy.') {
        setCopyButtonText('Nothing to Copy');
        setTimeout(() => setCopyButtonText('Copy to Clipboard'), 1500);
        return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopyButtonText('Copied!');
      setTimeout(() => {
        onClose();
        setCopyButtonText('Copy to Clipboard');
      }, 1000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      setCopyButtonText('Error!');
      setTimeout(() => setCopyButtonText('Copy to Clipboard'), 1500);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Copy Payment Details</h2>
          <p className="text-sm text-gray-500 mt-1">Select the details to include in the copied text.</p>
        </div>
        
        <div className="p-6 space-y-4">
          <h3 className="text-md font-semibold text-gray-700">Include in Text:</h3>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center space-x-3 cursor-pointer p-2 rounded-md hover:bg-gray-100">
              <input type="checkbox" name="includeName" checked={options.includeName} onChange={handleOptionChange} className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span className="text-gray-800">Student Name</span>
            </label>
            <label className="flex items-center space-x-3 cursor-pointer p-2 rounded-md hover:bg-gray-100">
              <input type="checkbox" name="includePayment" checked={options.includePayment} onChange={handleOptionChange} className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span className="text-gray-800">Payment Amount</span>
            </label>
            <label className="flex items-center space-x-3 cursor-pointer p-2 rounded-md hover:bg-gray-100">
              <input type="checkbox" name="includeDate" checked={options.includeDate} onChange={handleOptionChange} className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span className="text-gray-800">Date</span>
            </label>
            <label className="flex items-center space-x-3 cursor-pointer p-2 rounded-md hover:bg-gray-100">
              <input type="checkbox" name="includeTime" checked={options.includeTime} onChange={handleOptionChange} className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span className="text-gray-800">Time</span>
            </label>
            <label className="flex items-center space-x-3 cursor-pointer p-2 rounded-md hover:bg-gray-100">
              <input type="checkbox" name="includeNumbering" checked={options.includeNumbering} onChange={handleOptionChange} className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span className="text-gray-800">Numbered List</span>
            </label>
          </div>
        </div>
        
        <div className="px-6 pb-6 flex-1 flex flex-col min-h-0">
            <h3 className="text-md font-semibold text-gray-700 mb-2">Preview:</h3>
            <div className="bg-gray-100 p-3 rounded-md text-sm text-gray-600 overflow-auto flex-1">
                <pre className="whitespace-pre-wrap font-sans">{textPreview}</pre>
            </div>
        </div>

        <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-2 rounded-b-lg border-t">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
          <button type="button" onClick={handleCopy} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 w-36 text-center">
            {copyButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CopyPaymentsModal;