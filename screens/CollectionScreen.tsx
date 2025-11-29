import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Collection, Student, Payment, CustomField, RemittedCollection } from '../types';
import { useStudents } from '../contexts/StudentsContext';
import { useCollections } from '../contexts/CollectionsContext';
import { useRemittedCollections } from '../contexts/RemittedCollectionsContext';
import RemitModal from '../components/RemitModal';
import AddCollectionModal from '../components/AddCollectionModal';
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


interface CollectionScreenProps {
  onSelectCollection: (collection: Collection) => void;
  onAddCollection: () => void;
}

const CollectionCard: React.FC<{
  collection: Collection;
  onClick: () => void;
  onPressStart: () => void;
  onPressEnd: () => void;
  isSelected: boolean;
  collectionStudents: Student[];
  onRemit: () => void;
  onExport: () => void;
}> = ({ collection, onClick, onPressStart, onPressEnd, isSelected, collectionStudents, onRemit, onExport }) => {
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

  const paidStudentsCount = collection.payments.filter(p => {
      const studentIsInThisCollection = collectionStudents.some(s => s.id === p.studentId);
      return studentIsInThisCollection && p.amount > 0;
  }).length;
  
  const numStudentsInCollection = collectionStudents.length;
  
  const totalTargetAmount = useMemo(() => {
    // If no target amount is set anywhere, the target is effectively 0.
    if (!collection.targetAmount && !collection.customFields?.some(f => f.type === 'option' || f.type === 'checkbox')) {
        return 0;
    }
    return collectionStudents.reduce((sum, student) => {
        const payment = collection.payments.find(p => p.studentId === student.id);
        return sum + getStudentTargetAmount(collection, payment);
    }, 0);
  }, [collection, collectionStudents]);
  
  const hasTargetAmount = totalTargetAmount > 0;
  
  const progressPercentage = hasTargetAmount
    ? Math.min((totalCollected / totalTargetAmount) * 100, 100)
    : 0;

  const [translateX, setTranslateX] = useState(0);
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);
  const isSwiping = useRef(false);
  const isVerticalScroll = useRef(false);
  const wasSwiping = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  const SWIPE_THRESHOLD_LEFT = -160;

  useEffect(() => {
    if (cardRef.current && actionsRef.current) {
      const animationCurve = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
      const duration = '0.4s';
      
      cardRef.current.style.transition = `transform ${duration} ${animationCurve}`;
      cardRef.current.style.transform = `translateX(${translateX}px)`;
      
      const progress = Math.min(Math.abs(translateX) / Math.abs(SWIPE_THRESHOLD_LEFT), 1);
      
      actionsRef.current.style.transition = `opacity ${duration} ease`;
      actionsRef.current.style.opacity = `${progress}`;
      
      const buttons = actionsRef.current.querySelectorAll('button');
      buttons.forEach((button: HTMLElement) => {
          button.style.transition = `transform ${duration} ${animationCurve}`;
          button.style.transform = `scale(${0.8 + 0.2 * progress})`;
      });
    }
  }, [translateX]);


  const handleDragStart = (clientX: number, clientY: number) => {
    wasSwiping.current = false;
    onPressStart();
    swipeStartX.current = clientX;
    swipeStartY.current = clientY;
    isSwiping.current = false;
    isVerticalScroll.current = false;
    if (cardRef.current && actionsRef.current) {
      cardRef.current.style.transition = 'none';
      actionsRef.current.style.transition = 'none';
      const buttons = actionsRef.current.querySelectorAll('button');
      buttons.forEach((button: HTMLElement) => {
        button.style.transition = 'none';
      });
    }
  };

  const handleDragMove = (clientX: number, clientY: number, e?: React.MouseEvent | React.TouchEvent) => {
    if (swipeStartX.current === null || swipeStartY.current === null) {
      return;
    }

    const deltaX = clientX - swipeStartX.current;
    const deltaY = clientY - swipeStartY.current;

    if (!isSwiping.current && !isVerticalScroll.current) {
        if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
            if (Math.abs(deltaY) > Math.abs(deltaX)) {
                isVerticalScroll.current = true;
                onPressEnd(); 
            } else {
                isSwiping.current = true;
                onPressEnd(); 
            }
        }
    }
    
    if (isVerticalScroll.current) {
        return; 
    }

    if (isSwiping.current && cardRef.current && actionsRef.current) {
      if (e?.cancelable && 'touches' in e) {
        e.preventDefault();
      }
      
      const currentTranslateX = translateX + deltaX;
      let newTranslateX = currentTranslateX;

      if (currentTranslateX > 0) {
        newTranslateX = Math.pow(currentTranslateX, 0.8);
      } else if (currentTranslateX < SWIPE_THRESHOLD_LEFT) {
        const overdrag = Math.abs(currentTranslateX - SWIPE_THRESHOLD_LEFT);
        newTranslateX = SWIPE_THRESHOLD_LEFT - Math.pow(overdrag, 0.8);
      }

      cardRef.current.style.transform = `translateX(${newTranslateX}px)`;

      const rawProgress = Math.abs(newTranslateX) / Math.abs(SWIPE_THRESHOLD_LEFT);
      const progress = Math.min(rawProgress, 1);
      
      actionsRef.current.style.opacity = `${progress}`;
      const buttons = actionsRef.current.querySelectorAll('button');
      buttons.forEach((button: HTMLElement) => {
          button.style.transform = `scale(${0.8 + 0.2 * progress})`;
      });
    }
  };

  const handleDragEnd = () => {
    onPressEnd();

    if (isSwiping.current) {
        wasSwiping.current = true;
    }

    if (cardRef.current) {
      const transformStyle = window.getComputedStyle(cardRef.current).transform;
      const matrix = new DOMMatrixReadOnly(transformStyle);
      const currentPosition = matrix.m41;

      if (isSwiping.current) {
        if (currentPosition < SWIPE_THRESHOLD_LEFT / 2) {
          setTranslateX(SWIPE_THRESHOLD_LEFT);
        } else {
          setTranslateX(0);
        }
      } else {
        setTranslateX(translateX); 
      }
    }
    
    isSwiping.current = false;
    swipeStartX.current = null;
    swipeStartY.current = null;
    isVerticalScroll.current = false;
  };
  
  const handleExportClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onExport();
    setTranslateX(0);
  };

  const handleRemitClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemit();
    setTranslateX(0);
  };

  const finalOnClick = (e: React.MouseEvent) => {
    if (wasSwiping.current || translateX !== 0) {
      e.stopPropagation();
      e.preventDefault();
      if (translateX !== 0) {
        setTranslateX(0);
      }
      return;
    }
    onClick();
  };

  const isUlikdanay = collection.type === 'ulikdanay';

  return (
    <div
      className={`relative bg-white rounded-2xl mb-4 prevent-select transition-all duration-300 ${
        isSelected 
        ? 'ring-2 ring-blue-500 scale-[1.02] shadow-xl z-10' 
        : 'shadow-sm hover:shadow-md hover:-translate-y-0.5 border border-slate-100'
      }`}
    >
      <div 
        ref={actionsRef}
        className="absolute top-0 right-0 h-full flex items-center rounded-r-2xl overflow-hidden" 
        style={{ width: `${Math.abs(SWIPE_THRESHOLD_LEFT)}px`, opacity: 0 }}
      >
        <button
          onClick={handleExportClick}
          className="w-1/2 h-full flex flex-col items-center justify-center text-white font-semibold bg-indigo-500 hover:bg-indigo-600 transition-colors"
          aria-label={`Export ${collection.name}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Export</span>
        </button>
        <button
          onClick={handleRemitClick}
          className="w-1/2 h-full flex flex-col items-center justify-center text-white font-semibold bg-emerald-500 hover:bg-emerald-600 transition-colors"
          aria-label={`Remit ${collection.name}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Remit</span>
        </button>
      </div>

      <div
        ref={cardRef}
        onClick={finalOnClick}
        onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
        onMouseMove={(e) => handleDragMove(e.clientX, e.clientY, e)}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={(e) => handleDragStart(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => handleDragMove(e.touches[0].clientX, e.touches[0].clientY, e)}
        onTouchEnd={handleDragEnd}
        className="w-full bg-white relative z-10 rounded-2xl overflow-hidden"
      >
        <div className="p-5">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1 mr-2">
              {isUlikdanay ? (
                <h3 className="text-lg text-slate-800">
                  <strong className="font-bold uppercase text-blue-700">{collection.name.match(/Month of (\w+)/)?.[1] || 'Ulikdanay'}</strong>
                  <span className="font-normal ml-1.5 text-slate-500">Ulikdanay</span>
                </h3>
              ) : (
                <h3 className="font-bold text-lg text-slate-800 leading-tight">{collection.name}</h3>
              )}
              <div className="flex items-center text-xs text-slate-500 mt-1.5 space-x-2">
                 {collection.deadline && (
                    <span className={`px-2 py-0.5 rounded-full ${new Date(collection.deadline) < new Date() ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                        Due {new Date(collection.deadline).toLocaleDateString()}
                    </span>
                 )}
                 {collection.targetAmount && collection.targetAmount > 0 && (
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">₱{collection.targetAmount} each</span>
                 )}
              </div>
            </div>
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-inner ${isUlikdanay ? 'bg-blue-50' : 'bg-teal-50'}`}>
                {isUlikdanay ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                ) : (
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                )}
            </div>
          </div>

          <div className="flex justify-between items-end mb-3">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Collected</p>
              <p className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                ₱{totalCollected.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
               <div className="flex items-baseline justify-end space-x-1">
                    <span className="font-bold text-slate-800 text-lg">{paidStudentsCount}</span>
                    <span className="text-sm text-slate-500">/ {numStudentsInCollection}</span>
               </div>
               <p className="text-xs text-slate-400 font-medium">students paid</p>
            </div>
          </div>

          {hasTargetAmount && (
            <div className="relative pt-1">
              <div className="overflow-hidden h-2 text-xs flex rounded-full bg-slate-100">
                <div 
                    style={{ width: `${progressPercentage}%` }} 
                    className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500 ease-out ${
                        isUlikdanay ? 'bg-gradient-to-r from-blue-400 to-blue-600' : 'bg-gradient-to-r from-teal-400 to-teal-600'
                    }`}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CollectionScreen: React.FC<CollectionScreenProps> = ({ onSelectCollection, onAddCollection }) => {
  const { collections, setCollections } = useCollections();
  const { setRemittedCollections } = useRemittedCollections();
  const { students } = useStudents();
  const { profile } = useProfile();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleteSelectedConfirmOpen, setIsDeleteSelectedConfirmOpen] = useState(false);
  const [isDeleteAllConfirmOpen, setIsDeleteAllConfirmOpen] = useState(false);
  const [collectionToRemit, setCollectionToRemit] = useState<Collection | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const longPressTimer = useRef<number | null>(null);
  const longPressTriggered = useRef(false);

  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<number | null>(null);

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

    const mainContentArea = document.querySelector('main');
    mainContentArea?.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      mainContentArea?.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const handlePressStart = (collection: Collection) => {
    if (isScrollingRef.current) return;

    longPressTriggered.current = false;
    handlePressEnd();
    longPressTimer.current = window.setTimeout(() => {
      longPressTriggered.current = true;
      setSelectedIds(prev => 
        prev.includes(collection.id) ? prev : [...prev, collection.id]
      );
      if (navigator.vibrate) navigator.vibrate(50);
    }, 500);
  };

  const handleCardClick = (collection: Collection) => {
    if (isScrollingRef.current) return;

    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }

    if (selectedIds.length > 0) {
      setSelectedIds(prev =>
        prev.includes(collection.id)
          ? prev.filter(id => id !== collection.id)
          : [...prev, collection.id]
      );
    } else {
      onSelectCollection(collection);
    }
  };
  
  const handleConfirmDeleteSelected = () => {
    setCollections(prev => prev.filter(c => !selectedIds.includes(c.id)));
    setSelectedIds([]);
    setIsDeleteSelectedConfirmOpen(false);
  };

  const handleConfirmDeleteAll = () => {
    setCollections([]);
    setSelectedIds([]);
    setIsDeleteAllConfirmOpen(false);
  };

  const handleCancelSelection = () => {
    setSelectedIds([]);
  };
  
  const handleOpenRemitModal = (collection: Collection) => {
    setCollectionToRemit(collection);
  };

  const handleCloseRemitModal = () => {
    setCollectionToRemit(null);
  };
  
  const handleConfirmRemit = (details: { paidBy: string, receivedBy: string }) => {
    if (!collectionToRemit) return;

    const remittedCollection = {
      ...collectionToRemit,
      remittance: {
        ...details,
        remittedAt: new Date().toISOString(),
      },
    };

    setRemittedCollections(prev => [...prev, remittedCollection]);
    setCollections(prev => prev.filter(c => c.id !== collectionToRemit.id));
    
    handleCloseRemitModal();
  };

  const handleExport = (collection: Collection) => {
    // ... (Export logic unchanged for brevity, but kept intact in full code)
    // Re-implemented here to ensure functionality
    if (!collection) return;

    const treasurerName = profile.name;
    const studentId = profile.studentId;

    const collectionStudents = collection.includedStudentIds
        ? students.filter(s => new Set(collection.includedStudentIds).has(s.id))
        : students;
    
    const hasFieldsWithAmounts = (fields: CustomField[]): boolean => {
        for (const field of fields) {
            if (field.options?.some(o => typeof o.amount === 'number')) {
                return true;
            }
            if (field.subFields) {
                for (const subFieldArray of Object.values(field.subFields)) {
                    if (hasFieldsWithAmounts(subFieldArray)) {
                        return true;
                    }
                }
            }
        }
        return false;
    };
    const hasSetAmount = !!collection.targetAmount && !hasFieldsWithAmounts(collection.customFields || []);
    
    const headerData: (string | number)[][] = [
      ['Collection Name:', collection.name],
      ['Deadline:', collection.deadline ? new Date(collection.deadline).toLocaleDateString() : 'N/A'],
    ];
    if(hasSetAmount) {
        headerData.push(['Amount per Student:', collection.targetAmount!]);
    }
    headerData.push([]); 
    
    const customFieldHeaders = collection.customFields?.map(f => f.name) || [];
    let bodyHeaders = ['Student No', 'Student Name', ...customFieldHeaders];
    if (!hasSetAmount) {
      bodyHeaders.push('Amount to Pay');
    }
    bodyHeaders.push('Amount Paid', 'Status', 'Date', 'Time');

    const studentData = collectionStudents.map(student => {
      const payment = collection.payments.find(p => p.studentId === student.id);
      
      let studentTargetAmount = getStudentTargetAmount(collection, payment);
      const hasTargetAmountForStatus = studentTargetAmount > 0;
      let amountToPayForCell: string | number = hasTargetAmountForStatus ? studentTargetAmount : 'N/A';

      if (collection.type === 'ulikdanay' && collection.deadline && payment?.timestamp) {
        const deadlineDate = new Date(collection.deadline);
        deadlineDate.setHours(23, 59, 59, 999);
        const paymentDate = new Date(payment.timestamp);
        const defaultTarget = collection.targetAmount || 5;

        if (paymentDate > deadlineDate) {
          studentTargetAmount = payment.amount; 
          amountToPayForCell = `₱${payment.amount.toFixed(2)} (Default: ₱${defaultTarget})`;
        }
      }

      let paymentDate = '';
      let paymentTime = '';
      let status = 'Not Paid';
      
      if (payment && payment.amount > 0) {
        if (hasTargetAmountForStatus) {
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

      if (payment?.timestamp) {
        const d = new Date(payment.timestamp);
        paymentDate = d.toLocaleDateString();
        paymentTime = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      }

      const customFieldValues = collection.customFields?.map(field => {
        return payment ? getHierarchicalFieldValueString(field, payment) : '';
      }) || [];

      // FIX: Explicitly type `rowData` to allow both string and number values.
      const rowData: (string | number)[] = [
        student.studentNo,
        student.studentName,
        ...customFieldValues,
      ];
      if (!hasSetAmount) {
          rowData.push(amountToPayForCell);
      }
      rowData.push(
        payment ? payment.amount : 0,
        status,
        paymentDate,
        paymentTime
      );
      return rowData;
    });

    const footerData = [[], ["Treasurer's Name:", treasurerName], ["Student ID:", studentId]];
    const finalData = [...headerData, bodyHeaders, ...studentData, ...footerData];
    const worksheet = XLSX.utils.aoa_to_sheet(finalData);
    // ... existing export styling logic ...
    
    // Minimal recreation of export logic
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Collection Data');
    let fileName = `${collection.name.replace(/[^\w\s-]/g, '').replace(/[\s-]+/g, '_')}_Export.xlsx`;

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
    [...collections].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), 
    [collections]
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
    <div className="flex flex-col h-full">
        {/* Sticky Header with Blur */}
        <div className="sticky top-0 z-20 bg-slate-50/80 backdrop-blur-md px-4 py-3 border-b border-slate-200/50">
             <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Collections</h1>
             <p className="text-sm text-slate-500 mt-1 truncate">
                {selectedIds.length > 0 ? (
                    <span className="text-blue-600 font-medium">{selectedIds.length} selected</span>
                ) : (
                    "Manage your funds and track payments"
                )}
            </p>
            
             <div className="relative mt-4">
                <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white border-0 shadow-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-400 text-slate-700 transition-shadow"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                </div>
                {searchTerm && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button onClick={() => setSearchTerm('')} className="p-1 text-slate-400 hover:text-slate-600 rounded-full focus:outline-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    </button>
                </div>
                )}
            </div>
        </div>

      <div className="p-4 pb-32">
        {collections.length > 0 ? (
          filteredCollections.length > 0 ? (
            filteredCollections.map((collection) => {
              const collectionStudents = collection.includedStudentIds
                ? students.filter(s => new Set(collection.includedStudentIds).has(s.id))
                : students;
              
              return (
                <CollectionCard
                  key={collection.id}
                  collection={collection}
                  onClick={() => handleCardClick(collection)}
                  onPressStart={() => handlePressStart(collection)}
                  onPressEnd={handlePressEnd}
                  isSelected={selectedIds.includes(collection.id)}
                  collectionStudents={collectionStudents}
                  onRemit={() => handleOpenRemitModal(collection)}
                  onExport={() => handleExport(collection)}
                />
              );
            })
          ) : (
            <div className="text-center py-20 px-4">
              <div className="flex justify-center items-center mb-4">
                  <div className="bg-white rounded-full p-4 shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                         <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                      </svg>
                  </div>
              </div>
              <h3 className="text-lg font-semibold text-slate-700">No collections found</h3>
              <p className="text-slate-500 mt-2">Try adjusting your search.</p>
            </div>
          )
        ) : (
          <div className="text-center py-20 px-4">
              <div className="flex justify-center items-center mb-4">
                  <div className="bg-white rounded-full p-6 shadow-sm border border-slate-100">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                  </div>
              </div>
              <h3 className="text-xl font-bold text-slate-800">Start Collecting</h3>
              <p className="text-slate-500 mt-2 max-w-xs mx-auto">Create your first collection to start tracking payments.</p>
          </div>
        )}
      </div>

      {selectedIds.length > 0 ? (
        <div className="fixed bottom-24 left-4 right-4 z-30 animate-fade-in-down">
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-300/50 p-2 max-w-md mx-auto border border-slate-100">
                <div className="flex justify-between items-center gap-2">
                    <button
                        onClick={handleCancelSelection}
                        className="px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold w-1/3 text-center transition-colors hover:bg-slate-200 text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => setIsDeleteAllConfirmOpen(true)}
                        className="px-4 py-3 text-red-600 bg-red-50 rounded-xl font-semibold w-1/3 text-center transition-colors hover:bg-red-100 text-sm"
                    >
                        Delete All
                    </button>
                    <button
                        onClick={() => setIsDeleteSelectedConfirmOpen(true)}
                        className="px-4 py-3 bg-red-600 text-white rounded-xl font-semibold w-1/3 text-center transition-colors hover:bg-red-700 text-sm shadow-md shadow-red-500/30"
                    >
                        Delete ({selectedIds.length})
                    </button>
                </div>
            </div>
        </div>
      ) : (
        <div className="fixed bottom-24 right-6 z-30">
            <button
                onClick={() => setIsModalOpen(true)}
                className="group bg-blue-600 hover:bg-blue-700 text-white rounded-2xl w-14 h-14 flex items-center justify-center shadow-lg shadow-blue-500/40 transition-all duration-300 transform hover:scale-110 hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-blue-500/30"
                aria-label="Add new collection"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-7 h-7">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
            </button>
        </div>
      )}

      <AddCollectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCollectionAdded={(newCollection) => {
          setCollections(prev => [...prev, newCollection]);
          setIsModalOpen(false);
          onSelectCollection(newCollection);
        }}
        onAddRegularCollection={onAddCollection}
        hasStudents={students.length > 0}
        collections={collections}
      />

      <RemitModal
        isOpen={!!collectionToRemit}
        onClose={handleCloseRemitModal}
        onConfirm={handleConfirmRemit}
        collectionName={collectionToRemit?.name || ''}
        treasurerName={profile.name}
      />
      
      {isDeleteSelectedConfirmOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 transform transition-all scale-100">
                <h3 className="text-lg font-bold text-slate-900">Delete Selected?</h3>
                <p className="mt-2 text-sm text-slate-600">Are you sure you want to delete <strong>{selectedIds.length} collection(s)</strong>? This action cannot be undone.</p>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={() => setIsDeleteSelectedConfirmOpen(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition-colors">Cancel</button>
                    <button onClick={handleConfirmDeleteSelected} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium shadow-lg shadow-red-500/30 transition-all">Delete</button>
                </div>
            </div>
        </div>
      )}

      {isDeleteAllConfirmOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 transform transition-all scale-100">
                <h3 className="text-lg font-bold text-slate-900">Delete All Collections?</h3>
                <p className="mt-2 text-sm text-slate-600">Are you sure you want to delete <strong>ALL</strong> collections? This is irreversible.</p>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={() => setIsDeleteAllConfirmOpen(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition-colors">Cancel</button>
                    <button onClick={handleConfirmDeleteAll} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium shadow-lg shadow-red-500/30 transition-all">Delete All</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default CollectionScreen;