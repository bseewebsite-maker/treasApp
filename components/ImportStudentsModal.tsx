import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Student } from '../types';

type ImportStatus = 'new' | 'duplicate' | 'invalid';
type DuplicateStrategy = 'skip' | 'overwrite';

interface ParsedStudent {
  data: Partial<Student>;
  status: ImportStatus;
  originalIndex: number;
  error?: string;
}

interface ImportStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingStudents: Student[];
  onConfirmImport: (students: Student[]) => void;
}

const ImportStudentsModal: React.FC<ImportStudentsModalProps> = ({ isOpen, onClose, existingStudents, onConfirmImport }) => {
  const [stage, setStage] = useState<'select' | 'preview' | 'importing'>('select');
  const [fileError, setFileError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedStudent[]>([]);
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateStrategy>('skip');

  useEffect(() => {
    // Reset state when modal is opened
    if (isOpen) {
      setStage('select');
      setFileError(null);
      setParsedData([]);
      setDuplicateStrategy('skip');
    }
  }, [isOpen]);
  
  const handleFileParse = async (file: File) => {
    setStage('importing');
    setFileError(null);
    
    if (file.type !== 'application/json') {
      setFileError('Invalid file type. Please upload a .json file.');
      setStage('select');
      return;
    }

    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);

      if (!Array.isArray(jsonData)) {
        throw new Error("JSON is not an array.");
      }
      
      const existingStudentNoSet = new Set(existingStudents.map(s => s.studentNo));
      const processedData: ParsedStudent[] = jsonData.map((item, index) => {
        const studentName = item.name ?? item.studentName;
        const studentNo = item.student_no ?? item.studentNo;

        if (typeof studentName !== 'string' || typeof studentNo !== 'string' || !studentName.trim() || !studentNo.trim()) {
          return { data: item, status: 'invalid', originalIndex: index, error: "Missing or invalid 'name' or 'student_no'." };
        }

        const status: ImportStatus = existingStudentNoSet.has(studentNo) ? 'duplicate' : 'new';
        
        return {
          data: { studentName, studentNo },
          status,
          originalIndex: index,
        };
      });
      
      setParsedData(processedData);
      setStage('preview');

    } catch (error) {
      if (error instanceof Error) {
        setFileError(`Failed to parse file: ${error.message}`);
      } else {
        setFileError('An unknown error occurred during file processing.');
      }
      setStage('select');
    }
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileParse(file);
    }
    event.target.value = ''; // Reset input to allow re-uploading the same file
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFileParse(file);
    }
  }, []);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleConfirm = () => {
    setStage('importing');
    const studentsToImport = parsedData
      .filter(p => {
        if (p.status === 'invalid') return false;
        if (p.status === 'duplicate' && duplicateStrategy === 'skip') return false;
        return true;
      })
      .map((p, index) => ({
        id: `${Date.now()}-${p.originalIndex}-${index}`,
        studentName: p.data.studentName!,
        studentNo: p.data.studentNo!,
      }));
      
    onConfirmImport(studentsToImport);
    // The parent component will close the modal on success
  };
  
  const summary = useMemo(() => {
    const newCount = parsedData.filter(p => p.status === 'new').length;
    const duplicateCount = parsedData.filter(p => p.status === 'duplicate').length;
    const invalidCount = parsedData.filter(p => p.status === 'invalid').length;
    return { newCount, duplicateCount, invalidCount };
  }, [parsedData]);
  
  if (!isOpen) return null;
  
  const getStatusChip = (status: ImportStatus) => {
    switch(status) {
      case 'new': return <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">New</span>;
      case 'duplicate': return <span className="px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-100 rounded-full">Duplicate</span>;
      case 'invalid': return <span className="px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded-full">Invalid</span>;
    }
  }

  const renderContent = () => {
    switch(stage) {
      case 'select':
        return (
            <>
                <div className="p-6">
                    <h2 className="text-xl font-bold text-gray-900">Import Students from JSON</h2>
                    <div 
                        onDrop={handleDrop} 
                        onDragOver={handleDragOver}
                        className="mt-4 border-2 border-dashed border-gray-300 rounded-lg p-6 sm:p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-gray-50"
                    >
                        <input type="file" accept=".json" onChange={handleFileChange} id="file-upload" className="hidden" />
                        <label htmlFor="file-upload" className="cursor-pointer">
                            <p className="text-gray-500">Drag & drop your file here, or click to select a file.</p>
                        </label>
                    </div>
                    {fileError && <p className="mt-2 text-sm text-red-600">{fileError}</p>}
                    <div className="mt-4 bg-gray-100 p-3 rounded text-xs text-gray-600">
                        <p className="font-semibold mb-1">Expected format:</p>
                        <pre className="whitespace-pre-wrap">{`[
  { "name": "Juan Dela Cruz", "student_no": "2024-001" },
  { "name": "Maria Clara", "student_no": "2024-002" }
]`}</pre>
                    </div>
                </div>
                <div className="bg-gray-50 px-6 py-3 flex justify-end">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                </div>
            </>
        );
      case 'preview':
        const willBeSkipped = duplicateStrategy === 'skip' ? summary.duplicateCount : 0;
        const totalImportCount = summary.newCount + (duplicateStrategy === 'overwrite' ? summary.duplicateCount : 0);
        return (
            <>
                <div className="p-6">
                    <h2 className="text-xl font-bold text-gray-900">Import Preview</h2>
                    <p className="text-sm text-gray-500">Review the students to be imported.</p>
                </div>
                
                <div className="px-6 pb-4 border-b">
                    <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Handle Duplicates</label>
                            <p className="text-xs text-gray-500">Based on Student No.</p>
                        </div>
                        <div className="flex items-center space-x-2 bg-gray-200 p-1 rounded-lg">
                            <button onClick={() => setDuplicateStrategy('skip')} className={`px-3 py-1 text-sm rounded-md ${duplicateStrategy === 'skip' ? 'bg-white shadow' : 'hover:bg-gray-300'}`}>Skip</button>
                            <button onClick={() => setDuplicateStrategy('overwrite')} className={`px-3 py-1 text-sm rounded-md ${duplicateStrategy === 'overwrite' ? 'bg-white shadow' : 'hover:bg-gray-300'}`}>Overwrite</button>
                        </div>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto px-2">
                  <ul className="divide-y divide-gray-200">
                    {parsedData.map(p => (
                      <li key={p.originalIndex} className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 truncate">{p.data.studentName || 'N/A'}</p>
                            {p.error && <p className="text-xs text-red-500 mt-1">{p.error}</p>}
                          </div>
                           <div className="flex-shrink-0 ml-4">
                            {getStatusChip(p.status)}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="bg-gray-50 px-6 py-3 flex justify-between items-center border-t">
                    <div className="text-sm">
                        <p className="font-semibold text-gray-800">{totalImportCount} students will be imported.</p>
                        <p className="text-xs text-gray-500">
                          {summary.newCount} new, {willBeSkipped} skipped, {summary.invalidCount} invalid.
                        </p>
                    </div>
                    <div>
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 mr-2">Cancel</button>
                        <button onClick={handleConfirm} disabled={totalImportCount === 0} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300">
                            Confirm Import
                        </button>
                    </div>
                </div>
            </>
        );
      case 'importing':
        return (
            <div className="p-12 flex flex-col items-center justify-center">
                <svg className="animate-spin h-10 w-10 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="mt-4 text-lg text-gray-700">Importing...</p>
            </div>
        );
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg h-[80vh] flex flex-col">
        {renderContent()}
      </div>
    </div>
  );
};

export default ImportStudentsModal;