import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useRemittedCollections } from '../contexts/RemittedCollectionsContext';
import { RemittedCollection, Student, Payment, CustomField, Collection } from '../types';
import { useArchivedCollections } from '../contexts/ArchivedCollectionsContext';
import { useStudents } from '../contexts/StudentsContext';
import { useProfile } from '../contexts/ProfileContext';

declare var XLSX: any;

const getStudentTargetAmount = (collection: Collection | RemittedCollection, payment?: Payment): number => {
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


const getHierarchicalFieldValueString = (
  field: CustomField,
  payment: Payment
): string => {
  if (!payment.customFieldValues) return '';
  
  const value = payment.customFieldValues[field.id];
  if (!value || !value.trim()) return '';

  let result = value;

  if ((field.type === 'option' || field.type === 'checkbox') && field.options && field.subFields) {
    const subParts: string[] = [];
    const selectedValues = value.split(', ');
    
    selectedValues.forEach(selectedValue => {
        const option = field.options?.find(o => o.value === selectedValue);
        if (option && field.subFields?.[option.id]) {
            const subFieldStrings = field.subFields[option.id].map(subField => {
                const subFieldValueString = getHierarchicalFieldValueString(subField, payment);
                return subFieldValueString ? `${subField.name}: ${subFieldValueString}` : null;
            }).filter((s): s is string => s !== null);

            if (subFieldStrings.length > 0) {
                if (field.type === 'checkbox') {
                    subParts.push(`${option.value} (${subFieldStrings.join(', ')})`);
                } else {
                    subParts.push(...subFieldStrings);
                }
            }
        }
    });

    if (subParts.length > 0) {
      result += ` [${subParts.join('; ')}]`;
    }
  }

  return result;
};

interface RemittedScreenProps {
  onSelectCollection: (collection: RemittedCollection) => void;
}

const RemittedCollectionCard: React.FC<{
  collection: RemittedCollection;
  collectionStudents: Student[];
  onClick: () => void;
  onArchive: () => void;
  onExport: () => void;
}> = ({ collection, collectionStudents, onClick, onArchive, onExport }) => {
  
  // Ensure we only sum payments for students who are actually in the collection
  const totalCollected = useMemo(() => {
    const includedStudentIds = new Set(collectionStudents.map(s => s.id));
    return collection.payments.reduce((sum, p) => {
        if (includedStudentIds.has(p.studentId)) {
            return sum + p.amount;
        }
        return sum;
    }, 0);
  }, [collection.payments, collectionStudents]);

  const remittedDate = new Date(collection.remittance.remittedAt);
  
  const [translateX, setTranslateX] = useState(0);
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);
  const isSwiping = useRef(false);
  const isVerticalScroll = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const SWIPE_THRESHOLD = -180; // Width of the two buttons

  useEffect(() => {
    if (cardRef.current) {
      cardRef.current.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
      cardRef.current.style.transform = `translateX(${translateX}px)`;
    }
  }, [translateX]);

  const handleDragStart = (clientX: number, clientY: number) => {
    swipeStartX.current = clientX;
    swipeStartY.current = clientY;
    isSwiping.current = false;
    isVerticalScroll.current = false;
    if (cardRef.current) {
      cardRef.current.style.transition = 'none';
    }
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (swipeStartX.current === null || swipeStartY.current === null || isVerticalScroll.current) {
      return;
    }

    const deltaX = clientX - swipeStartX.current;
    const deltaY = clientY - swipeStartY.current;

    if (!isSwiping.current && Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 5) {
      isVerticalScroll.current = true;
      return;
    }
    
    if (Math.abs(deltaX) > 5) {
      isSwiping.current = true;
    }

    if (isSwiping.current && cardRef.current) {
      const basePosition = translateX;
      let newTranslateX = basePosition + deltaX;

      if (newTranslateX < SWIPE_THRESHOLD) {
        const overdrag = Math.abs(newTranslateX - SWIPE_THRESHOLD);
        newTranslateX = SWIPE_THRESHOLD - (overdrag * 0.5);
      } else if (basePosition === 0 && newTranslateX > 0) {
        newTranslateX *= 0.5;
      }
      
      cardRef.current.style.transform = `translateX(${newTranslateX}px)`;
    }
  };

  const handleDragEnd = () => {
    if (cardRef.current) {
      const transformStyle = window.getComputedStyle(cardRef.current).transform;
      const matrix = new DOMMatrixReadOnly(transformStyle);
      const currentPosition = matrix.m41;

      if (isSwiping.current) {
        if (currentPosition < SWIPE_THRESHOLD / 2) {
          setTranslateX(SWIPE_THRESHOLD);
        } else {
          setTranslateX(0);
        }
      } else {
        setTranslateX(translateX);
      }
    }
    
    setTimeout(() => { isSwiping.current = false; }, 50);
    swipeStartX.current = null;
    swipeStartY.current = null;
  };

  const handleArchiveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onArchive();
    setTranslateX(0);
  };

  const handleExportClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onExport();
    setTranslateX(0);
  };

  const finalOnClick = (e: React.MouseEvent) => {
    if (isSwiping.current || translateX !== 0) {
      e.stopPropagation();
      e.preventDefault();
      if (translateX !== 0) {
        setTranslateX(0);
      }
      return;
    }
    onClick();
  };

  return (
    <div className="relative bg-white rounded-xl shadow-md overflow-hidden mb-5 prevent-select transition-shadow hover:shadow-lg">
      <div
        className="absolute top-0 right-0 h-full flex items-center"
        style={{ width: `${Math.abs(SWIPE_THRESHOLD)}px` }}
      >
        <button
          onClick={handleExportClick}
          className="w-1/2 h-full flex flex-col items-center justify-center text-white font-semibold bg-purple-500 hover:bg-purple-600 transition-colors"
          aria-label={`Export ${collection.name}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Export</span>
        </button>
        <button
          onClick={handleArchiveClick}
          className="w-1/2 h-full flex flex-col items-center justify-center text-white font-semibold bg-gray-500 hover:bg-gray-600 transition-colors"
          aria-label={`Archive ${collection.name}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
          <span>Archive</span>
        </button>
      </div>
      <div
        ref={cardRef}
        onClick={finalOnClick}
        onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
        onMouseMove={(e) => handleDragMove(e.clientX, e.clientY)}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={(e) => handleDragStart(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => handleDragMove(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={handleDragEnd}
        className="w-full bg-white relative z-10"
      >
        <div className="p-5">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-semibold text-lg text-gray-800">{collection.name}</h3>
                    <p className="text-sm text-gray-500 mt-2">
                        Total Collected: <strong className="text-xl font-bold text-blue-600">₱{totalCollected.toLocaleString()}</strong>
                    </p>
                </div>
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${collection.type === 'ulikdanay' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                    {collection.type.charAt(0).toUpperCase() + collection.type.slice(1)}
                </span>
            </div>

            {/* Remittance Details */}
            <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-xs uppercase font-bold text-gray-400 mb-2">Remittance Details</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-600">
                    <div>
                        <p className="font-semibold">Paid by:</p>
                        <p className="truncate">{collection.remittance.paidBy}</p>
                    </div>
                    <div>
                        <p className="font-semibold">Received by:</p>
                        <p className="truncate">{collection.remittance.receivedBy}</p>
                    </div>
                    <div>
                        <p className="font-semibold">Date:</p>
                        <p>{remittedDate.toLocaleDateString()}</p>
                    </div>
                    <div>
                        <p className="font-semibold">Time:</p>
                        <p>{remittedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

const RemittedScreen: React.FC<RemittedScreenProps> = ({ onSelectCollection }) => {
  const { remittedCollections, setRemittedCollections } = useRemittedCollections();
  const { setArchivedCollections } = useArchivedCollections();
  const { students } = useStudents();
  const { profile } = useProfile();
  const [searchTerm, setSearchTerm] = useState('');

  const handleArchiveCollection = (collectionToArchive: RemittedCollection) => {
    setArchivedCollections(prev => [...prev, {
      ...collectionToArchive,
      archivedAt: new Date().toISOString(),
    }]);

    setRemittedCollections(prev => prev.filter(c => c.id !== collectionToArchive.id));
  };

  const handleExport = (collection: RemittedCollection) => {
    if (!collection) return;

    const treasurerName = profile.name;
    const studentId = profile.studentId;

    const collectionStudents = collection.includedStudentIds
        ? students.filter(s => new Set(collection.includedStudentIds).has(s.id))
        : students;

    const hasAnyTargetAmount = collection.targetAmount || collection.customFields?.some(f => f.type !== 'text');
    const remittedDate = new Date(collection.remittance.remittedAt);
    const headerData: (string | number)[][] = [
      ['Collection Name:', collection.name],
      ['Amount per Student:', hasAnyTargetAmount ? getStudentTargetAmount(collection) : 'N/A'],
      ['Deadline:', collection.deadline ? new Date(collection.deadline).toLocaleDateString() : 'N/A'],
      ['Status:', 'Remitted'],
      ['Paid by:', collection.remittance.paidBy],
      ['Received by:', collection.remittance.receivedBy],
      ['Date Remitted:', remittedDate.toLocaleDateString()],
      ['Time Remitted:', remittedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })],
      [] // Spacer
    ];
    
    const customFieldHeaders = collection.customFields?.map(f => f.name) || [];
    const bodyHeaders = ['Student No', 'Student Name', ...customFieldHeaders, 'Amount Paid', 'Status', 'Date', 'Time'];

    const studentData = collectionStudents.map(student => {
      const payment = collection.payments.find(p => p.studentId === student.id);
      
      let studentTargetAmount = getStudentTargetAmount(collection, payment);
      const hasTargetAmount = studentTargetAmount > 0;
      let isLateUlikdanayPayment = false;

      if (collection.type === 'ulikdanay' && collection.deadline && payment?.timestamp) {
        const deadlineDate = new Date(collection.deadline);
        deadlineDate.setHours(23, 59, 59, 999);
        const paymentDate = new Date(payment.timestamp);
        if (paymentDate > deadlineDate) {
          isLateUlikdanayPayment = true;
          studentTargetAmount = payment.amount;
        }
      }

      let paymentDate = '';
      let paymentTime = '';
      let status = 'Not Paid';
      
      if (payment && payment.amount > 0) {
        if (hasTargetAmount) {
            const balance = payment.amount - studentTargetAmount;
            if (balance > 0) {
                status = `Credit: ₱${balance.toFixed(2)}`;
            } else if (balance < 0) {
                status = `Debit: ₱${Math.abs(balance).toFixed(2)}`;
            } else {
                status = 'Fully Paid';
            }
        } else {
            status = 'Paid';
        }
      }

      if (isLateUlikdanayPayment) {
        status = `Fully Paid (Default: ₱${collection.targetAmount || 5})`;
      }

      if (payment?.timestamp) {
        const d = new Date(payment.timestamp);
        paymentDate = d.toLocaleDateString();
        paymentTime = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      }

      const customFieldValues = collection.customFields?.map(field => {
        return payment ? getHierarchicalFieldValueString(field, payment) : '';
      }) || [];

      return [
        student.studentNo,
        student.studentName,
        ...customFieldValues,
        payment ? payment.amount : 0,
        status,
        paymentDate,
        paymentTime
      ];
    });

    const footerData = [[], ["Treasurer's Name:", treasurerName], ["Student ID:", studentId]];
    const finalData = [...headerData, bodyHeaders, ...studentData, ...footerData];
    const worksheet = XLSX.utils.aoa_to_sheet(finalData);

    const targetAmountCell = 'B2';
    if(worksheet[targetAmountCell] && hasAnyTargetAmount) {
      const targetValue = getStudentTargetAmount(collection);
      if (typeof targetValue === 'number' && targetValue > 0) {
        worksheet[targetAmountCell].t = 'n';
        worksheet[targetAmountCell].z = '"₱"#,##0.00';
      }
    }

    const amountColumnIndex = 2 + customFieldHeaders.length;
    const bodyStartRow = headerData.length + 1;
    studentData.forEach((_row, index) => {
        const cellAddress = XLSX.utils.encode_cell({c: amountColumnIndex, r: bodyStartRow + index});
        if(worksheet[cellAddress] && typeof worksheet[cellAddress].v === 'number') {
            worksheet[cellAddress].t = 'n';
            worksheet[cellAddress].z = '"₱"#,##0.00';
        }
    });
    
    const customColsWidths = customFieldHeaders.map(() => ({ wch: 20 }));
    worksheet['!cols'] = [{wch: 15}, {wch: 30}, ...customColsWidths, {wch: 15}, {wch: 20}, {wch: 12}, {wch: 12}];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Collection Data');
    
    let fileName: string;
    const monthMatch = collection.type === 'ulikdanay' ? collection.name.match(/Month of (\w+)/) : null;

    if (monthMatch && monthMatch[1]) {
      const month = monthMatch[1];
      fileName = `${month} - Ulikdanay Fund.xlsx`;
    } else {
      const cleanCollectionName = collection.name.replace(/[^\w\s-]/g, '').replace(/[\s-]+/g, '_');
      fileName = `remitted - ${cleanCollectionName}.xlsx`;
    }

    try {
      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: "application/octet-stream" });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(link.href);
      }, 100);
    } catch (err) {
        console.error("Export failed:", err);
        alert("Could not export the file.");
    }
  };


  const sortedCollections = useMemo(() => 
    [...remittedCollections].sort((a, b) => new Date(b.remittance.remittedAt).getTime() - new Date(a.remittance.remittedAt).getTime()),
    [remittedCollections]
  );

  const filteredCollections = useMemo(() => {
    if (!searchTerm) {
      return sortedCollections;
    }
    return sortedCollections.filter(collection =>
      collection.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, sortedCollections]);


  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-2 text-gray-900">Remitted</h1>
      <p className="text-sm text-gray-500 mb-6">Swipe left to export or archive a remitted collection.</p>

      <div className="relative mb-6">
        <input
          type="text"
          placeholder="Search remitted collections..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-10 py-2 rounded-full bg-white/70 backdrop-blur-md shadow-sm focus:ring-2 focus:ring-blue-400/80 focus:outline-none placeholder-gray-500 ring-1 ring-inset ring-black/10"
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        {searchTerm && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <button onClick={() => setSearchTerm('')} className="p-1 text-gray-400 hover:text-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {remittedCollections.length > 0 ? (
        filteredCollections.length > 0 ? (
          filteredCollections.map((collection) => {
              const collectionStudents = collection.includedStudentIds
                ? students.filter(s => new Set(collection.includedStudentIds).has(s.id))
                : students;

             return (
                <RemittedCollectionCard 
                    key={collection.id} 
                    collection={collection} 
                    collectionStudents={collectionStudents}
                    onClick={() => onSelectCollection(collection)}
                    onArchive={() => handleArchiveCollection(collection)}
                    onExport={() => handleExport(collection)}
                />
            );
          })
        ) : (
          <div className="text-center py-20 px-4">
            <div className="flex justify-center items-center mb-4">
                <div className="bg-gray-200 rounded-full p-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                       <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-700">No results found</h3>
            <p className="text-gray-500 mt-2">Your search for "{searchTerm}" did not return any results.</p>
          </div>
        )
      ) : (
        <div className="text-center py-20 px-4">
            <div className="flex justify-center items-center mb-4">
                <div className="bg-gray-200 rounded-full p-4">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                    </svg>
                </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-700">No Remitted Collections</h3>
            <p className="text-gray-500 mt-2">Collections you remit will appear here.</p>
        </div>
      )}
    </div>
  );
};

export default RemittedScreen;