
import React, { useState } from 'react';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStudent: (studentName: string, studentNo: string, notes?: string) => void;
}

const AddStudentModal: React.FC<AddStudentModalProps> = ({ isOpen, onClose, onAddStudent }) => {
  const [studentName, setStudentName] = useState('');
  const [studentNo, setStudentNo] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !studentNo.trim()) return;
    onAddStudent(studentName.trim(), studentNo.trim(), notes.trim());
    setStudentName('');
    setStudentNo('');
    setNotes('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Add New Student</h2>
            
            <div>
              <label htmlFor="student-name" className="block text-sm font-medium text-gray-700">Student Name</label>
              <input
                type="text"
                id="student-name"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="student-no" className="block text-sm font-medium text-gray-700">Student ID/No.</label>
              <input
                type="text"
                id="student-no"
                value={studentNo}
                onChange={(e) => setStudentNo(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
              />
            </div>
            <div>
              <label htmlFor="student-notes" className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
              <textarea
                id="student-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                rows={3}
                placeholder="Add any relevant notes..."
              />
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-2 rounded-b-lg">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600">Add Student</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStudentModal;