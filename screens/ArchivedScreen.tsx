import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useArchivedCollections } from '../contexts/ArchivedCollectionsContext';
import { useRemittedCollections } from '../contexts/RemittedCollectionsContext';
import { ArchivedCollection, Student } from '../types';
import { useStudents } from '../contexts/StudentsContext';

interface ArchivedScreenProps {
  onBack: () => void;
  onSelectCollection: (collection: ArchivedCollection) => void;
}

const ArchivedCollectionCard: React.FC<{
  collection: ArchivedCollection;
  collectionStudents: Student[];
  onUnarchive: () => void;
  onDelete: () => void;
  onSelectCollection: (collection: ArchivedCollection) => void;
}> = ({ collection, collectionStudents, onUnarchive, onDelete, onSelectCollection }) => {
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

  const archivedDate = new Date(collection.archivedAt);

  const [translateX, setTranslateX] = useState(0);
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);
  const isSwiping = useRef(false);
  const isVerticalScroll = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const SWIPE_THRESHOLD = -160; // Width of two 80px buttons

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
    if (swipeStartX.current === null || swipeStartY.current === null || isVerticalScroll.current) return;

    const deltaX = clientX - swipeStartX.current;
    const deltaY = clientY - swipeStartY.current;

    if (!isSwiping.current && Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 5) {
      isVerticalScroll.current = true;
      return;
    }
    
    if (Math.abs(deltaX) > 5) isSwiping.current = true;

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

  const handleUnarchiveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUnarchive();
    setTranslateX(0);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
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
    onSelectCollection(collection);
  };

  return (
    <div className="relative bg-white rounded-lg shadow-md overflow-hidden mb-4 prevent-select">
      <div className="absolute top-0 right-0 h-full flex items-center" style={{ width: `${Math.abs(SWIPE_THRESHOLD)}px` }}>
        <button
          onClick={handleUnarchiveClick}
          className="w-1/2 h-full flex flex-col items-center justify-center text-white font-semibold bg-blue-500 hover:bg-blue-600 transition-colors"
          aria-label={`Unarchive ${collection.name}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8m-5 5h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 001.414 0l2.414-2.414a1 1 0 01.707-.293H17" />
          </svg>
          <span>Unarchive</span>
        </button>
        <button
          onClick={handleDeleteClick}
          className="w-1/2 h-full flex flex-col items-center justify-center text-white font-semibold bg-red-500 hover:bg-red-600 transition-colors"
          aria-label={`Delete ${collection.name}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span>Delete</span>
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
        <div className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-lg text-gray-800">{collection.name}</h3>
              <p className="text-sm text-gray-500">
                Total Collected: <span className="font-semibold">₱{totalCollected.toLocaleString()}</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Archived on {archivedDate.toLocaleDateString()}
              </p>
            </div>
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${collection.type === 'ulikdanay' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
              {collection.type.charAt(0).toUpperCase() + collection.type.slice(1)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};


const ArchivedScreen: React.FC<ArchivedScreenProps> = ({ onBack, onSelectCollection }) => {
  const { archivedCollections, setArchivedCollections } = useArchivedCollections();
  const { setRemittedCollections } = useRemittedCollections();
  const { students } = useStudents();
  const [collectionToDelete, setCollectionToDelete] = useState<ArchivedCollection | null>(null);

  const handleUnarchive = (collectionToUnarchive: ArchivedCollection) => {
    // Add back to remitted collections
    const { archivedAt, ...remitted } = collectionToUnarchive; // remove archivedAt field
    setRemittedCollections(prev => [...prev, remitted]);
    
    // Remove from archived collections
    setArchivedCollections(prev => prev.filter(c => c.id !== collectionToUnarchive.id));
  };
  
  const handleConfirmDelete = () => {
    if (!collectionToDelete) return;
    setArchivedCollections(prev => prev.filter(c => c.id !== collectionToDelete.id));
    setCollectionToDelete(null);
  };

  const sortedCollections = [...archivedCollections].sort((a, b) =>
    new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime()
  );

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white shadow-sm p-4 flex items-center z-20">
        <button onClick={onBack} className="mr-4 text-gray-600 hover:text-blue-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">Archived Collections</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-20">
        <p className="text-sm text-gray-500 mb-4 text-center">Swipe left to unarchive or delete.</p>
        {sortedCollections.length > 0 ? (
          sortedCollections.map(collection => {
              const collectionStudents = collection.includedStudentIds
                ? students.filter(s => new Set(collection.includedStudentIds).has(s.id))
                : students;

              return (
                <ArchivedCollectionCard
                  key={collection.id}
                  collection={collection}
                  collectionStudents={collectionStudents}
                  onUnarchive={() => handleUnarchive(collection)}
                  onDelete={() => setCollectionToDelete(collection)}
                  onSelectCollection={onSelectCollection}
                />
              );
          })
        ) : (
          <div className="text-center py-20 px-4">
              <div className="flex justify-center items-center mb-4">
                  <div className="bg-gray-200 rounded-full p-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                  </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-700">Archive is Empty</h3>
              <p className="text-gray-500 mt-2">You haven't archived any collections yet.</p>
          </div>
        )}
      </main>

      {collectionToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
                <h3 className="text-lg font-bold text-gray-900">Delete Permanently?</h3>
                <p className="mt-2 text-sm text-gray-600">Are you sure you want to permanently delete "{collectionToDelete.name}"? This action cannot be undone.</p>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={() => setCollectionToDelete(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                    <button onClick={handleConfirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Delete</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ArchivedScreen;