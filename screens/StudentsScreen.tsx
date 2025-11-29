import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Student, Collection, RemittedCollection } from '../types';
import AddStudentModal from '../components/AddStudentModal';
import EditStudentModal from '../components/EditStudentModal';
import { useStudents } from '../contexts/StudentsContext';
import { useCollections } from '../contexts/CollectionsContext';
import { useRemittedCollections } from '../contexts/RemittedCollectionsContext';
import ImportStudentsModal from '../components/ImportStudentsModal';
import { useProfile } from '../contexts/ProfileContext';

declare var XLSX: any;

interface StudentsScreenProps {
  onSelectStudentPayment: (collectionId: string, studentId: string) => void;
}

const StudentsScreen: React.FC<StudentsScreenProps> = ({ onSelectStudentPayment }) => {
  const { students, setStudents } = useStudents();
  const { collections } = useCollections();
  const { remittedCollections } = useRemittedCollections();
  const { profile } = useProfile();
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [collectionDetails, setCollectionDetails] = useState<Collection | RemittedCollection | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedStudentId, setHighlightedStudentId] = useState<string | null>(null);

  const longPressTimer = useRef<number | null>(null);
  const longPressTriggered = useRef(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<number | null>(null);
  const touchStartPos = useRef<{x: number, y: number} | null>(null);

  // Newest first for screen display
  const sortedAllCollections = [...collections, ...remittedCollections].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const handlePressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    touchStartPos.current = null;
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
    const tableContainer = tableContainerRef.current;
    
    mainContentArea?.addEventListener('scroll', handleScroll, { passive: true });
    tableContainer?.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      mainContentArea?.removeEventListener('scroll', handleScroll);
      tableContainer?.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);


  const handlePressStart = (student: Student, e: React.TouchEvent | React.MouseEvent) => {
    if (isScrollingRef.current) return;

    let clientX, clientY;
    if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = (e as React.MouseEvent).clientX;
        clientY = (e as React.MouseEvent).clientY;
    }
    
    touchStartPos.current = { x: clientX, y: clientY };

    longPressTriggered.current = false;
    handlePressEnd(); // Clear any existing timer
    longPressTimer.current = window.setTimeout(() => {
      longPressTriggered.current = true;
      setHighlightedStudentId(null); // Clear highlight when action sheet opens
      setSelectedStudent(student);
      setIsActionSheetOpen(true);
      if (navigator.vibrate) navigator.vibrate(50); // Haptic feedback
    }, 500); // 500ms for long press
  };

  const handlePressMove = (e: React.TouchEvent | React.MouseEvent) => {
      if (!longPressTimer.current || !touchStartPos.current) return;

      let clientX, clientY;
      if ('touches' in e) {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
      } else {
          clientX = (e as React.MouseEvent).clientX;
          clientY = (e as React.MouseEvent).clientY;
      }

      const dx = Math.abs(clientX - touchStartPos.current.x);
      const dy = Math.abs(clientY - touchStartPos.current.y);

      // If moved more than 10px, treat as scroll/drag and cancel long press
      if (dx > 10 || dy > 10) {
          handlePressEnd();
      }
  };
  
  const handleAddStudent = (studentName: string, studentNo: string, notes?: string) => {
    const newStudent: Student = {
      id: `${Date.now()}`,
      studentName,
      studentNo,
      notes: notes || undefined,
    };
    setStudents(prevStudents => 
      [...prevStudents, newStudent].sort((a, b) => a.studentName.localeCompare(b.studentName))
    );
    setIsAddModalOpen(false);
  };

  const handleImportStudents = (importedStudents: Student[]) => {
    setStudents(prevStudents => {
      const studentMap = new Map(prevStudents.map(s => [s.studentNo, s]));
      importedStudents.forEach(imported => {
        studentMap.set(imported.studentNo, imported);
      });
      const updatedStudents = Array.from(studentMap.values());
      return updatedStudents.sort((a: Student, b: Student) => a.studentName.localeCompare(b.studentName));
    });
    setIsImportModalOpen(false);
  };

  const handleExport = () => {
    const treasurerName = profile.name;
    const studentId = profile.studentId;

    const collectionsForExport = [...collections, ...remittedCollections].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const headerRow = ['Student No', 'Student Name', ...collectionsForExport.map(c => c.name)];

    const studentDataRows = students.map(student => {
      const row: (string | number)[] = [student.studentNo, student.studentName];
      collectionsForExport.forEach(collection => {
        const isStudentIncluded = !collection.includedStudentIds || collection.includedStudentIds.includes(student.id);
        if (isStudentIncluded) {
          const payment = collection.payments.find(p => p.studentId === student.id);
          row.push(payment ? payment.amount : 0);
        } else {
          row.push('N/A');
        }
      });
      return row;
    });

    const footerData = [[], ["Treasurer's Name:", treasurerName], ["Student ID:", studentId]];
    const finalData = [headerRow, ...studentDataRows, ...footerData];
    const worksheet = XLSX.utils.aoa_to_sheet(finalData);

    worksheet['!cols'] = [{ wch: 15 }, { wch: 30 }, ...collectionsForExport.map(() => ({ wch: 20 }))];

    collectionsForExport.forEach((_collection, colIndex) => {
      studentDataRows.forEach((_studentRow, rowIndex) => {
        const cellAddress = XLSX.utils.encode_cell({ c: colIndex + 2, r: rowIndex + 1 });
        const cell = worksheet[cellAddress];
        if (cell) {
          if (!cell.s) cell.s = {};
          if (!cell.s.alignment) cell.s.alignment = {};
          cell.s.alignment.horizontal = 'center';
          if (typeof cell.v === 'number') {
            cell.t = 'n';
            cell.z = '"₱"#,##0.00';
          }
        }
      });
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Student Payments');
    
    const now = new Date();
    const date = now.toLocaleDateString('en-CA');
    const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }).replace(/ /g, '').replace(/:/g, '.');
    const fileName = `student data for ${date} - ${time}.xlsx`;

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


  const handleUpdateStudent = (updatedData: { studentName: string; notes?: string }) => {
    if (!selectedStudent) return;
    setStudents(prev => 
      prev.map(s => s.id === selectedStudent.id ? { ...s, studentName: updatedData.studentName, notes: updatedData.notes || undefined } : s)
          .sort((a, b) => a.studentName.localeCompare(b.studentName))
    );
    closeAllModals();
  };

  const handleConfirmDelete = () => {
    if (!selectedStudent) return;
    setStudents(prev => prev.filter(s => s.id !== selectedStudent.id));
    closeAllModals();
  };
  
  const openEditModal = () => {
    setIsActionSheetOpen(false);
    setIsEditModalOpen(true);
  };

  const openDeleteConfirm = () => {
    setIsActionSheetOpen(false);
    setIsDeleteConfirmOpen(true);
  };

  const closeAllModals = () => {
    setIsActionSheetOpen(false);
    setIsEditModalOpen(false);
    setIsDeleteConfirmOpen(false);
    setSelectedStudent(null);
  };

  const filteredStudents = useMemo(() => {
    if (!searchTerm) {
      return students;
    }
    return students.filter(student =>
      student.studentName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, students]);


  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="sticky top-0 z-20 bg-slate-50/90 backdrop-blur-md px-4 py-3 border-b border-slate-200">
          <div className="flex justify-between items-center mb-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Students</h1>
            <div className="flex items-center space-x-2">
            <button
                onClick={handleExport}
                className="p-2 text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors flex-shrink-0"
                aria-label="Export student data"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
            </button>
            <button
                onClick={() => setIsImportModalOpen(true)}
                className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex-shrink-0"
                aria-label="Import students from JSON"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
            </button>
            <button
                onClick={() => setIsAddModalOpen(true)}
                className="p-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-md shadow-blue-500/30 transition-all flex-shrink-0"
                aria-label="Add new student"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
            </button>
            </div>
        </div>

        <div className="relative">
            <input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-2 rounded-xl bg-white border-0 shadow-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-400 text-slate-700"
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

       <div className="flex-1 overflow-auto p-4 pb-28">
       {students.length > 0 ? (
          filteredStudents.length > 0 ? (
            <div ref={tableContainerRef} className="overflow-x-auto shadow-sm rounded-xl border border-slate-200 bg-white">
                <div className="align-middle inline-block min-w-full">
                    <div className="overflow-hidden">
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead>
                                <tr>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider sticky left-0 top-0 bg-slate-50 z-10 w-48 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                        Student Name
                                    </th>
                                    {sortedAllCollections.map(collection => {
                                      const isRemitted = 'remittance' in collection;
                                      let headerText = collection.name;
                                      if (collection.type === 'ulikdanay') {
                                          const month = collection.name.match(/Month of (\w+)/)?.[1];
                                          if (month) {
                                              headerText = month;
                                          }
                                      }
                                      return (
                                        <th 
                                            key={collection.id} 
                                            scope="col" 
                                            className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 bg-slate-50 sticky top-0"
                                            onClick={() => setCollectionDetails(collection)}
                                        >
                                            <div 
                                                className={`w-32 truncate ${isRemitted ? 'text-emerald-600' : ''}`} 
                                                title={collection.name}
                                            >
                                                {headerText}
                                            </div>
                                        </th>
                                      );
                                    })}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-50">
                                {filteredStudents.map((student) => (
                                    <tr key={student.id} className={`${highlightedStudentId === student.id ? 'bg-blue-50' : 'hover:bg-slate-50'} transition-colors`}>
                                        <td 
                                            className={`px-4 py-3 whitespace-nowrap text-sm font-semibold text-slate-800 sticky left-0 cursor-pointer w-48 prevent-select shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] ${highlightedStudentId === student.id ? 'bg-blue-50' : 'bg-white hover:bg-slate-50'}`}
                                            onMouseDown={(e) => handlePressStart(student, e)}
                                            onMouseUp={handlePressEnd}
                                            onMouseLeave={handlePressEnd}
                                            onMouseMove={handlePressMove}
                                            onTouchStart={(e) => handlePressStart(student, e)}
                                            onTouchEnd={handlePressEnd}
                                            onTouchMove={handlePressMove}
                                            onTouchCancel={handlePressEnd}
                                            onClick={(e) => {
                                                if (longPressTriggered.current) {
                                                    longPressTriggered.current = false;
                                                    return;
                                                }
                                                setHighlightedStudentId(prevId => prevId === student.id ? null : student.id);
                                            }}
                                        >
                                           <div className="flex items-center">
                                                <div className="truncate" title={student.studentName}> {student.studentName}</div>
                                                {student.notes && (
                                                    <div className="ml-1.5 text-blue-400">
                                                        <span className="block w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        {sortedAllCollections.map(collection => {
                                            const isRemitted = 'remittance' in collection;
                                            const isStudentIncluded = !collection.includedStudentIds || collection.includedStudentIds.includes(student.id);

                                            if (!isStudentIncluded) {
                                                return (
                                                    <td key={collection.id} className="px-6 py-3 whitespace-nowrap text-xs text-slate-300 text-center">
                                                        —
                                                    </td>
                                                );
                                            }

                                            const payment = collection.payments.find(p => p.studentId === student.id);
                                            return (
                                                <td 
                                                  key={collection.id} 
                                                  className={`px-6 py-3 whitespace-nowrap text-sm text-slate-600 cursor-pointer transition-colors ${highlightedStudentId === student.id ? '' : 'hover:bg-blue-50/50'}`}
                                                  onClick={() => onSelectStudentPayment(collection.id, student.id)}
                                                >
                                                    {payment && payment.timestamp ? (
                                                        <div className={isRemitted ? 'text-emerald-600' : ''}>
                                                            <div className={`font-bold ${isRemitted ? '' : 'text-slate-800'}`}>
                                                                ₱{payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-300 font-light">0.00</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            ) : (
            <div className="text-center p-12 bg-white rounded-2xl shadow-sm border border-slate-100 mt-4">
              <div className="flex justify-center items-center mb-4">
                  <div className="bg-slate-50 rounded-full p-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                         <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                      </svg>
                  </div>
              </div>
              <h3 className="text-lg font-bold text-slate-700">No students found</h3>
              <p className="text-slate-500 mt-1 text-sm">We couldn't find matches for "{searchTerm}".</p>
            </div>
          )
        ) : (
          <div className="text-center p-12 bg-white rounded-2xl shadow-sm border border-slate-100 mt-4">
              <div className="bg-blue-50 rounded-full p-6 inline-block mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197m0 0A5.975 5.975 0 0112 15a5.975 5.975 0 013-1.197M15 21a9 9 0 00-9-9" />
                </svg>
              </div>
            <h3 className="text-xl font-bold text-slate-900">Welcome!</h3>
            <p className="mt-2 text-slate-500 max-w-xs mx-auto">
                Start by adding your students or importing a class list.
            </p>
          </div>
        )}
       </div>

      {collectionDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={() => setCollectionDetails(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 transform transition-all" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-bold text-slate-900 pr-8">{collectionDetails.name}</h3>
              <button onClick={() => setCollectionDetails(null)} className="-mt-1 -mr-1 p-1.5 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-500">Type</span>
                <span className="font-semibold text-slate-800 capitalize">{collectionDetails.type}</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-500">Target</span>
                <span className="font-semibold text-slate-800">{collectionDetails.targetAmount ? `₱${collectionDetails.targetAmount.toLocaleString()}` : 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-500">Deadline</span>
                <span className="font-semibold text-slate-800">{collectionDetails.deadline ? new Date(collectionDetails.deadline).toLocaleDateString() : 'N/A'}</span>
              </div>
            </div>

            {'remittance' in collectionDetails && (
              <div className="mt-5 bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-700 mb-3">Remittance Details</h4>
                <div className="space-y-2 text-sm">
                  <p className="flex justify-between"><span className="text-emerald-600/80">Paid by</span> <span className="font-medium text-emerald-900">{collectionDetails.remittance.paidBy}</span></p>
                  <p className="flex justify-between"><span className="text-emerald-600/80">Received by</span> <span className="font-medium text-emerald-900">{collectionDetails.remittance.receivedBy}</span></p>
                  <p className="flex justify-between"><span className="text-emerald-600/80">Date</span> <span className="font-medium text-emerald-900">{new Date(collectionDetails.remittance.remittedAt).toLocaleDateString()}</span></p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <AddStudentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddStudent={handleAddStudent}
      />
      
      <ImportStudentsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        existingStudents={students}
        onConfirmImport={handleImportStudents}
      />
      
      {selectedStudent && (
        <>
          <EditStudentModal
            isOpen={isEditModalOpen}
            onClose={closeAllModals}
            student={selectedStudent}
            onSave={handleUpdateStudent}
          />

          {isActionSheetOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-end z-50" onClick={closeAllModals}>
              <div className="bg-white rounded-t-2xl w-full max-w-lg animate-slide-up pb-6" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-100 flex justify-center">
                    <div className="w-12 h-1.5 bg-gray-300 rounded-full mb-2"></div>
                </div>
                <div className="px-6 pt-2 pb-4 text-center">
                    <h3 className="text-xl font-bold text-slate-800">{selectedStudent.studentName}</h3>
                    <p className="text-sm text-slate-500">{selectedStudent.studentNo}</p>
                </div>
                <div className="px-4 space-y-2">
                    <button onClick={openEditModal} className="w-full text-left flex items-center px-4 py-3.5 text-base font-medium text-slate-700 hover:bg-slate-50 rounded-xl transition-colors">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mr-4 text-blue-600">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
                        </div>
                        Edit Details
                    </button>
                    <button onClick={openDeleteConfirm} className="w-full text-left flex items-center px-4 py-3.5 text-base font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition-colors">
                        <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center mr-4 text-rose-600">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </div>
                        Delete Student
                    </button>
                </div>
                <div className="px-4 mt-4">
                    <button onClick={closeAllModals} className="w-full px-4 py-3 bg-slate-100 text-slate-800 rounded-xl font-bold hover:bg-slate-200 transition-colors">Cancel</button>
                </div>
              </div>
               <style>{`
                  @keyframes slide-up {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                  }
                  .animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
                `}</style>
            </div>
          )}

          {isDeleteConfirmOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 transform transition-all">
                    <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mb-4 text-rose-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Delete Student?</h3>
                    <p className="mt-2 text-sm text-slate-600">Are you sure you want to delete <strong>{selectedStudent.studentName}</strong>? This action cannot be undone.</p>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button onClick={closeAllModals} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium">Cancel</button>
                        <button onClick={handleConfirmDelete} className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-medium shadow-lg shadow-rose-500/30">Delete</button>
                    </div>
                </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StudentsScreen;