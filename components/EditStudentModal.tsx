import React, { useState, useEffect } from 'react';
import { Student } from '../types';

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  onSave: (data: { studentName: string; notes?: string }) => void;
}

const EditStudentModal: React.FC<EditStudentModalProps> = ({ isOpen, onClose, student, onSave }) => {
  const [studentName, setStudentName] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (student) {
      setStudentName(student.studentName);
      setNotes(student.notes || '');
    }
  }, [student]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) return;
    onSave({ studentName: studentName.trim(), notes: notes.trim() });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Edit Student</h2>
            
            <div>
              <label htmlFor="edit-student-name" className="block text-sm font-medium text-gray-700">Student Name</label>
              <input
                type="text"
                id="edit-student-name"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="edit-student-notes" className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
              <textarea
                id="edit-student-notes"
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
            <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditStudentModal;