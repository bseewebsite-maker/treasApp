import React, { useState, useMemo } from 'react';
import { useCollections } from '../contexts/CollectionsContext';
import { useRemittedCollections } from '../contexts/RemittedCollectionsContext';
import CashOnHandBreakdownModal from '../components/CashOnHandBreakdownModal';

interface Transaction {
  id: string;
  name: string;
  amount: number;
  date: Date;
  type: 'remittance';
}

const FundsScreen: React.FC = () => {
  const { collections } = useCollections();
  const { remittedCollections } = useRemittedCollections();
  const [searchTerm, setSearchTerm] = useState('');
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);

  const totalCashOnHand = collections.reduce((total, collection) => {
    const collectionTotal = collection.payments.reduce((sum, payment) => sum + payment.amount, 0);
    return total + collectionTotal;
  }, 0);

  const remittanceHistory: Transaction[] = remittedCollections.map(collection => {
    const totalRemitted = collection.payments.reduce((sum, p) => sum + p.amount, 0);
    return {
      id: collection.id,
      name: `Remitted: ${collection.name}`,
      amount: -totalRemitted,
      date: new Date(collection.remittance.remittedAt),
      type: 'remittance'
    };
  });
  
  const sortedHistory = useMemo(() => 
    remittanceHistory.sort((a, b) => b.date.getTime() - a.date.getTime()), 
    [remittanceHistory]
  );
  
  const filteredHistory = useMemo(() => {
    if (!searchTerm) {
      return sortedHistory;
    }
    return sortedHistory.filter(transaction =>
      transaction.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, sortedHistory]);

  return (
    <div className="p-4 pb-20">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Funds</h1>
      
      {/* Cash on Hand Card */}
      <button 
        onClick={() => setIsBreakdownModalOpen(true)}
        className="w-full bg-white rounded-xl shadow-lg p-6 mb-8 text-left transition-transform transform hover:scale-105"
        aria-label="View cash on hand breakdown"
      >
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Cash-on-Hand</p>
            <p className="text-4xl font-bold text-blue-600 mt-1">
              ₱{totalCashOnHand.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 bg-blue-100 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-4">This is the sum of all payments from active, unremitted collections. Tap to see details.</p>
      </button>

      {/* Transaction History */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Transaction History</h2>

        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Search transactions..."
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

        {sortedHistory.length > 0 ? (
          filteredHistory.length > 0 ? (
            <div className="bg-white rounded-lg shadow">
              <ul className="divide-y divide-gray-200">
                {filteredHistory.map(transaction => (
                  <li key={transaction.id} className="p-4 flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-gray-800">{transaction.name}</p>
                      <p className="text-sm text-gray-500">
                        {transaction.date.toLocaleDateString()} - {transaction.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <p className="font-bold text-red-500">
                      - ₱{Math.abs(transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-center py-10 px-4 bg-white rounded-lg shadow">
                <div className="flex justify-center items-center mb-4">
                    <div className="bg-gray-200 rounded-full p-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                           <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                        </svg>
                    </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-700">No transactions found</h3>
                <p className="text-gray-500 mt-2">Your search for "{searchTerm}" did not return any results.</p>
            </div>
          )
        ) : (
          <div className="text-center py-10 px-4 bg-white rounded-lg shadow">
            <div className="flex justify-center items-center mb-4">
                <div className="bg-gray-200 rounded-full p-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-700">No Transactions Yet</h3>
            <p className="text-gray-500 mt-2">When you remit a collection, the transaction will appear here as a deduction.</p>
          </div>
        )}
      </div>

      <CashOnHandBreakdownModal
        isOpen={isBreakdownModalOpen}
        onClose={() => setIsBreakdownModalOpen(false)}
        collections={collections}
        totalCashOnHand={totalCashOnHand}
      />
    </div>
  );
};

export default FundsScreen;