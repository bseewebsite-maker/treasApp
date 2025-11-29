import React, { useState, useMemo } from 'react';
import { HistoryEntry, Collection, Payment, CustomField } from '../types';
import { useHistory } from '../contexts/HistoryContext';
import { useCollections } from '../contexts/CollectionsContext';
import { useStudents } from '../contexts/StudentsContext';

interface HistoryScreenProps {
  onBack: () => void;
}

// Helper function copied from CollectionDetailScreen to determine target amounts
const getStudentTargetAmount = (collection: Collection, payment?: Payment): number => {
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


const getRelativeDateGroup = (date: Date): string => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  today.setHours(0, 0, 0, 0);
  yesterday.setHours(0, 0, 0, 0);

  const entryDate = new Date(date);
  entryDate.setHours(0, 0, 0, 0);

  if (entryDate.getTime() === today.getTime()) {
    return 'Today';
  }
  if (entryDate.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  }
  return entryDate.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const HistoryItem: React.FC<{ entry: HistoryEntry }> = ({ entry }) => {
  const { type, studentName, collectionName, amount, previousAmount } = entry;
  const time = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const renderIcon = () => {
    switch (type) {
      case 'payment_add':
        return (
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          </div>
        );
      case 'payment_update':
        return (
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
          </div>
        );
      case 'payment_remove':
        return (
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </div>
        );
      default:
        return null;
    }
  };

  const renderDescription = () => {
    const amountChange = (amount ?? 0) - (previousAmount ?? 0);

    switch (type) {
      case 'payment_add':
        return <p><strong>{studentName}</strong> paid <strong className="text-green-600">₱{amount?.toLocaleString()}</strong>.</p>;
      case 'payment_update':
        const fromAmount = `₱${previousAmount?.toLocaleString()}`;
        const toAmount = `₱${amount?.toLocaleString()}`;

        if (amountChange > 0) {
            return <p><strong>{studentName}</strong>'s payment increased from {fromAmount} to <strong className="text-green-600">{toAmount}</strong>.</p>;
        } else if (amountChange < 0) {
             return <p><strong>{studentName}</strong>'s payment decreased from {fromAmount} to <strong className="text-red-600">{toAmount}</strong>.</p>;
        }
        return <p><strong>{studentName}</strong>'s payment details were updated.</p>;
      case 'payment_remove':
        return <p><strong>{studentName}</strong>'s payment of <strong className="text-red-600">₱{previousAmount?.toLocaleString()}</strong> was removed.</p>;
      default:
        return null;
    }
  };


  return (
    <li className="flex items-start space-x-4 py-3">
      <div className="flex-shrink-0">{renderIcon()}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-gray-800">{renderDescription()}</div>
        <p className="text-xs text-gray-500">For collection: {collectionName}</p>
      </div>
      <p className="text-xs text-gray-400 flex-shrink-0">{time}</p>
    </li>
  );
};

type GroupedHistory = {
  type: 'group';
  collectionId: string;
  collectionName: string;
  entries: HistoryEntry[];
  timestamp: string;
};
type DisplayItem = HistoryEntry | GroupedHistory;

const GroupedHistoryItem: React.FC<{ group: GroupedHistory }> = ({ group }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const completionDate = new Date(group.timestamp);

    return (
        <li className="py-2">
            <div 
                className="flex items-center space-x-4 p-2 rounded-lg cursor-pointer hover:bg-gray-100"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                       <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">
                        Completed: <span className="font-bold">{group.collectionName}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                        {group.entries.length} activities &middot; Completed on {completionDate.toLocaleDateString()}
                    </p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </div>
            {isExpanded && (
                <div className="pl-8 pt-2 mt-2 border-l-2 border-gray-200 ml-4">
                     <ul className="divide-y divide-gray-200">
                        {group.entries.map(entry => <HistoryItem key={entry.id} entry={entry} />)}
                    </ul>
                </div>
            )}
        </li>
    );
};


const HistoryScreen: React.FC<HistoryScreenProps> = ({ onBack }) => {
  const { history } = useHistory();
  const { collections } = useCollections();
  const { students } = useStudents();
  const [searchTerm, setSearchTerm] = useState('');

  const displayGroups = useMemo(() => {
    // 1. Find fully paid collections and their completion dates
    const fullyPaidCollections = new Map<string, { name: string, completedDate: string }>();
    const collectionLastPaymentDate = new Map<string, string>();
    history.forEach(entry => {
        if (!collectionLastPaymentDate.has(entry.collectionId)) {
            collectionLastPaymentDate.set(entry.collectionId, entry.timestamp);
        }
    });

    collections.forEach(collection => {
        const collectionStudents = collection.includedStudentIds
            ? students.filter(s => new Set(collection.includedStudentIds).has(s.id))
            : students;

        if (collectionStudents.length === 0) return;

        const isFullyPaid = collectionStudents.every(student => {
            const payment = collection.payments.find(p => p.studentId === student.id);
            const target = getStudentTargetAmount(collection, payment);
            if (target === 0) return true; // No target, considered paid for grouping purposes.
            return (payment?.amount || 0) >= target;
        });
        
        if (isFullyPaid) {
            const completedDate = collectionLastPaymentDate.get(collection.id) || new Date().toISOString();
            fullyPaidCollections.set(collection.id, { name: collection.name, completedDate });
        }
    });

    // 2. Filter based on search term.
    const lowercasedTerm = searchTerm.toLowerCase();
    const filteredHistory = searchTerm
        ? history.filter(entry =>
            entry.studentName.toLowerCase().includes(lowercasedTerm) ||
            entry.collectionName.toLowerCase().includes(lowercasedTerm)
          )
        : history;

    // 3. Group history entries by collection ID
    const historyByCollection = new Map<string, HistoryEntry[]>();
    filteredHistory.forEach(entry => {
        const group = historyByCollection.get(entry.collectionId) || [];
        group.push(entry);
        historyByCollection.set(entry.collectionId, group);
    });

    // 4. Create display items (groups or individual entries)
    const displayItems: DisplayItem[] = [];
    historyByCollection.forEach((entries, collectionId) => {
        if (fullyPaidCollections.has(collectionId) && !searchTerm) {
            const collectionInfo = fullyPaidCollections.get(collectionId)!;
            displayItems.push({
                type: 'group',
                collectionId,
                collectionName: collectionInfo.name,
                entries: entries,
                timestamp: collectionInfo.completedDate,
            });
        } else {
            displayItems.push(...entries);
        }
    });

    // 5. Sort all items together by timestamp
    displayItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // 6. Group by date for rendering
    const groups: { [key: string]: DisplayItem[] } = displayItems.reduce((acc, item) => {
      const groupKey = getRelativeDateGroup(new Date(item.timestamp));
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(item);
      return acc;
    }, {} as Record<string, DisplayItem[]>);
    
    return Object.keys(groups)
      .map(groupKey => ({
        groupKey,
        items: groups[groupKey],
        sortDate: new Date(groups[groupKey][0].timestamp),
      }))
      .sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());
  }, [searchTerm, history, collections, students]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white shadow-sm p-4 flex items-center z-20">
        <button onClick={onBack} className="mr-4 text-gray-600 hover:text-blue-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900">Payment History</h1>
        </div>
      </header>
      
      <div className="p-4 bg-gray-50 z-10">
        <div className="relative">
          <input
            type="text"
            placeholder="Search by student or collection..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-2 rounded-full border border-gray-300 bg-white shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none placeholder-gray-500"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
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
      </div>
      
      <main className="flex-1 overflow-y-auto px-4 pb-4">
        {history.length === 0 ? (
          <div className="text-center py-20 px-4">
            <div className="flex justify-center items-center mb-4">
              <div className="bg-gray-200 rounded-full p-4"><svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
            </div>
            <h3 className="text-lg font-semibold text-gray-700">No History Yet</h3>
            <p className="text-gray-500 mt-2">Payment activities will be logged here.</p>
          </div>
        ) : displayGroups.length === 0 ? (
          <div className="text-center py-20 px-4">
            <div className="flex justify-center items-center mb-4">
              <div className="bg-gray-200 rounded-full p-4"><svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg></div>
            </div>
            <h3 className="text-lg font-semibold text-gray-700">No Results Found</h3>
            <p className="text-gray-500 mt-2">Your search for "{searchTerm}" did not return any results.</p>
          </div>
        ) : (
          displayGroups.map(group => (
            <div key={group.groupKey} className="mb-6">
              <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider px-2 py-1 mb-2">{group.groupKey}</h2>
              <ul className="bg-white rounded-lg shadow divide-y divide-gray-200 px-4">
                {group.items.map(item =>
                    item.type === 'group'
                    ? <GroupedHistoryItem key={item.collectionId} group={item} />
                    : <HistoryItem key={item.id} entry={item} />
                )}
              </ul>
            </div>
          ))
        )}
      </main>
    </div>
  );
};

export default HistoryScreen;
