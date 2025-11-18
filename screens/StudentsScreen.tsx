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

  // Newest first for screen display
  const sortedAllCollections = [...collections, ...remittedCollections].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
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


  const handlePressStart = (student: Student) => {
    if (isScrollingRef.current) return;

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
      // FIX: Explicitly type the sort callback parameters to correct faulty type inference.
      return updatedStudents.sort((a: Student, b: Student) => a.studentName.localeCompare(b.studentName));
    });
    setIsImportModalOpen(false);
  };

  const handleExport = () => {
    const treasurerName = profile.name;
    const studentId = profile.studentId;

    // Oldest first for export file columns
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
        if (cell) { // Check if cell exists
          // Initialize style object if it doesn't exist
          if (!cell.s) cell.s = {};
          // Initialize alignment object
          if (!cell.s.alignment) cell.s.alignment = {};
          // Set horizontal alignment to center
          cell.s.alignment.horizontal = 'center';

          // Format currency for numbers
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
    const date = now.toLocaleDateString('en-CA'); // YYYY-MM-DD
    const time = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
    }).replace(/ /g, '').replace(/:/g, '.'); // e.g., "4.30PM"

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
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold text-gray-900">Students</h1>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExport}
            className="p-2 text-purple-600 bg-purple-100 rounded-lg hover:bg-purple-200 transition-colors flex-shrink-0"
            aria-label="Export student data"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="p-2 text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors flex-shrink-0"
            aria-label="Import students from JSON"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="p-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors flex-shrink-0"
            aria-label="Add new student"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </button>
        </div>
      </div>

       <div className="relative mb-4">
        <input
          type="text"
          placeholder="Search students..."
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

       {students.length > 0 ? (
          filteredStudents.length > 0 ? (
            <div ref={tableContainerRef} className="overflow-x-auto shadow-md rounded-lg">
                <div className="align-middle inline-block min-w-full">
                    <div className="shadow overflow-hidden border-b border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 w-48">
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
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-100"
                                            onClick={() => setCollectionDetails(collection)}
                                        >
                                            <div 
                                                className={`w-32 truncate ${isRemitted ? 'text-green-600 italic' : ''}`} 
                                                title={collection.name}
                                            >
                                                {headerText}
                                            </div>
                                        </th>
                                      );
                                    })}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredStudents.map((student) => (
                                    <tr key={student.id} className={highlightedStudentId === student.id ? 'bg-blue-100' : 'hover:bg-gray-50'}>
                                        <td 
                                            className={`px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 cursor-pointer w-48 prevent-select ${highlightedStudentId === student.id ? 'bg-blue-100' : 'bg-white hover:bg-gray-50'}`}
                                            onMouseDown={() => handlePressStart(student)}
                                            onMouseUp={handlePressEnd}
                                            onMouseLeave={handlePressEnd}
                                            onTouchStart={() => handlePressStart(student)}
                                            onTouchEnd={handlePressEnd}
                                            onClick={() => {
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
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" title={student.notes}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                )}
                                            </div>
                                        </td>
                                        {sortedAllCollections.map(collection => {
                                            const isRemitted = 'remittance' in collection;
                                            const isStudentIncluded = !collection.includedStudentIds || collection.includedStudentIds.includes(student.id);

                                            if (!isStudentIncluded) {
                                                return (
                                                    <td key={collection.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 text-center italic">
                                                        N/A
                                                    </td>
                                                );
                                            }

                                            const payment = collection.payments.find(p => p.studentId === student.id);
                                            return (
                                                <td 
                                                  key={collection.id} 
                                                  className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer transition-colors ${highlightedStudentId === student.id ? '' : 'hover:bg-blue-50'}`}
                                                  onClick={() => onSelectStudentPayment(collection.id, student.id)}
                                                  title={`View ${student.studentName}'s payment in ${collection.name}`}
                                                >
                                                    {payment && payment.timestamp ? (
                                                        <div className={isRemitted ? 'text-green-600' : ''}>
                                                            <div className={`font-semibold ${isRemitted ? '' : 'text-gray-800'}`}>
                                                                ₱{payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </div>
                                                            <div className="text-xs">{new Date(payment.timestamp).toLocaleDateString()}</div>
                                                            <div className="text-xs">{new Date(payment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                        </div>
                                                    ) : (
                                                        <span>—</span>
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
            <div className="text-center p-8 bg-white rounded-lg shadow-md mt-4">
              <div className="flex justify-center items-center mb-4">
                  <div className="bg-gray-200 rounded-full p-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                         <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                      </svg>
                  </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-700">No students found</h3>
              <p className="text-gray-500 mt-2">Your search for "{searchTerm}" did not return any results.</p>
            </div>
          )
        ) : (
          <div className="text-center p-8 bg-white rounded-lg shadow-md mt-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.125-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.125-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No students found</h3>
            <p className="mt-1 text-sm text-gray-500">
                Get started by adding a student or importing a list.
            </p>
          </div>
        )}

      {collectionDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={() => setCollectionDetails(null)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-bold text-gray-900">{collectionDetails.name}</h3>
              <button onClick={() => setCollectionDetails(null)} className="-mt-2 -mr-2 p-1 text-gray-400 hover:text-gray-600 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="mt-4 space-y-2 text-sm text-gray-700">
              <p><span className="font-semibold">Type:</span> <span className="capitalize">{collectionDetails.type}</span></p>
              <p><span className="font-semibold">Target Amount:</span> {collectionDetails.targetAmount ? `₱${collectionDetails.targetAmount.toLocaleString()}` : 'N/A'}</p>
              <p><span className="font-semibold">Deadline:</span> {collectionDetails.deadline ? new Date(collectionDetails.deadline).toLocaleDateString() : 'N/A'}</p>
            </div>

            {'remittance' in collectionDetails && (
              <div className="mt-4 border-t pt-4">
                <h4 className="font-semibold text-md text-green-700">Remittance Details</h4>
                <div className="mt-2 space-y-2 text-sm text-gray-700">
                  <p><span className="font-semibold">Paid by:</span> {collectionDetails.remittance.paidBy}</p>
                  <p><span className="font-semibold">Received by:</span> {collectionDetails.remittance.receivedBy}</p>
                  <p><span className="font-semibold">Date:</span> {new Date(collectionDetails.remittance.remittedAt).toLocaleDateString()}</p>
                  <p><span className="font-semibold">Time:</span> {new Date(collectionDetails.remittance.remittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
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
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-end z-50" onClick={closeAllModals}>
              <div className="bg-white rounded-t-lg w-full max-w-lg animate-slide-up" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-200">
                    <h3 className="font-semibold text-center text-gray-800">{selectedStudent.studentName}</h3>
                </div>
                <div className="p-2">
                    <button onClick={openEditModal} className="w-full text-left flex items-center px-4 py-3 text-lg text-gray-700 hover:bg-gray-100 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
                        Edit
                    </button>
                    <button onClick={openDeleteConfirm} className="w-full text-left flex items-center px-4 py-3 text-lg text-red-600 hover:bg-red-50 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Delete
                    </button>
                </div>
                <div className="p-2">
                    <button onClick={closeAllModals} className="w-full px-4 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300">Cancel</button>
                </div>
              </div>
               <style>{`
                  @keyframes slide-up {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                  }
                  .animate-slide-up { animation: slide-up 0.2s ease-out; }
                `}</style>
            </div>
          )}

          {isDeleteConfirmOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
                    <h3 className="text-lg font-bold text-gray-900">Delete Student?</h3>
                    <p className="mt-2 text-sm text-gray-600">Are you sure you want to delete "{selectedStudent.studentName}"? This action cannot be undone.</p>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button onClick={closeAllModals} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                        <button onClick={handleConfirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Delete</button>
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