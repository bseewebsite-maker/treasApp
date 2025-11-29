import React, { useState, useEffect, useRef } from 'react';
import { Screen, Collection, RemittedCollection, ArchivedCollection, Student } from './types';
import BottomNav from './components/BottomNav';
import CollectionScreen from './screens/CollectionScreen';
import RemittedScreen from './screens/RemittedScreen';
import FundsScreen from './screens/FundsScreen';
import StudentsScreen from './screens/StudentsScreen';
import MenuScreen from './screens/MenuScreen';
import CollectionDetailScreen from './screens/CollectionDetailScreen';
import { StudentsProvider } from './contexts/StudentsContext';
import { CollectionsProvider, useCollections } from './contexts/CollectionsContext';
import { RemittedCollectionsProvider, useRemittedCollections } from './contexts/RemittedCollectionsContext';
import { ArchivedCollectionsProvider, useArchivedCollections } from './contexts/ArchivedCollectionsContext';
import { ProfileProvider, useProfile } from './contexts/ProfileContext';
import { ValueSetsProvider, useValueSets } from './contexts/ValueSetsContext';
import { HistoryProvider, useHistory } from './contexts/HistoryContext';
import ArchivedScreen from './screens/ArchivedScreen';
import ProfileScreen from './screens/ProfileScreen';
import AddCollectionScreen from './screens/AddCollectionScreen';
import EditCollectionScreen from './screens/EditCollectionScreen';
import HistoryScreen from './screens/HistoryScreen';
import { useStudents } from './contexts/StudentsContext';
import { NetworkStatus } from './components/NetworkStatus';

interface SettingsScreenProps {
  onBack: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
    const { students, setStudents } = useStudents();
    const { collections, setCollections } = useCollections();
    const { setRemittedCollections } = useRemittedCollections();
    const { setArchivedCollections } = useArchivedCollections();
    const { setProfile } = useProfile();
    const { setValueSets } = useValueSets();
    const { setHistory } = useHistory();

    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleClearAllData = () => {
        setStudents([]);
        setCollections([]);
        setRemittedCollections([]);
        setArchivedCollections([]);
        setProfile({ name: "Treasurer Name", studentId: 'Student ID', avatar: '' });
        setValueSets([]);
        setHistory([]);
        localStorage.removeItem('theme');
        localStorage.removeItem('creditDebitMode');

        setIsConfirmOpen(false);
        alert('All app data has been cleared.');
        onBack();
    };

    const handleImportCollection = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const result = event.target?.result as string;
                const importedData = JSON.parse(result);

                // Check version/type
                const isExportPackage = importedData.meta && importedData.meta.type === 'treasapp_collection_export';
                
                let importedCollection: Collection;
                let referencedStudents: Student[] = [];

                if (isExportPackage) {
                    importedCollection = importedData.collection;
                    referencedStudents = importedData.students || [];
                } else {
                    // Legacy support: assume raw collection object
                     importedCollection = importedData as Collection;
                }

                // Basic validation
                if (!importedCollection.id || !importedCollection.name || !Array.isArray(importedCollection.payments)) {
                    throw new Error("Invalid collection file format.");
                }

                // --- Handle Student Mapping ---
                // We need to map the imported student IDs to the local student IDs (by matching studentNo)
                // If a student doesn't exist locally, create them.
                const studentIdMap = new Map<string, string>(); // Old ID -> New/Local ID
                const newStudentsToAdd: Student[] = [];

                referencedStudents.forEach(impStudent => {
                    const existingLocalStudent = students.find(s => s.studentNo === impStudent.studentNo);
                    if (existingLocalStudent) {
                        // Map old ID to existing local ID
                        studentIdMap.set(impStudent.id, existingLocalStudent.id);
                    } else {
                        // Create new student
                        const newStudentId = crypto.randomUUID();
                        studentIdMap.set(impStudent.id, newStudentId);
                        newStudentsToAdd.push({
                            ...impStudent,
                            id: newStudentId
                        });
                    }
                });

                // --- Update Collection Data with New Student IDs ---
                
                // 1. Update includedStudentIds
                if (importedCollection.includedStudentIds) {
                    importedCollection.includedStudentIds = importedCollection.includedStudentIds.map(oldId => {
                        // If we have a mapping, use it. If not (maybe legacy file didn't include student data), keep old ID.
                        return studentIdMap.get(oldId) || oldId;
                    });
                }

                // 2. Update payments
                importedCollection.payments = importedCollection.payments.map(payment => ({
                    ...payment,
                    studentId: studentIdMap.get(payment.studentId) || payment.studentId
                }));


                // --- Handle Collection ID duplication ---
                const existingIndex = collections.findIndex(c => c.id === importedCollection.id);
                if (existingIndex !== -1) {
                     importedCollection.id = Date.now().toString();
                     importedCollection.name = `${importedCollection.name} (Imported)`;
                     setCollections(prev => [...prev, importedCollection]);
                     alert(`Collection imported successfully as "${importedCollection.name}" (Duplicate ID detected).`);
                } else {
                    setCollections(prev => [...prev, importedCollection]);
                    alert(`Collection "${importedCollection.name}" imported successfully.`);
                }
                
                // Add new students if any
                if (newStudentsToAdd.length > 0) {
                    setStudents(prev => [...prev, ...newStudentsToAdd].sort((a, b) => a.studentName.localeCompare(b.studentName)));
                    alert(`Also imported ${newStudentsToAdd.length} new students linked to this collection.`);
                }

            } catch (error) {
                console.error("Import error:", error);
                alert("Failed to import collection. The file might be corrupted or invalid.");
            } finally {
                if (fileInputRef.current) {
                    fileInputRef.current.value = ''; // Reset input
                }
            }
        };
        reader.readAsText(file);
    };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <header className="bg-white/80 backdrop-blur-md shadow-sm p-4 flex items-center z-20 sticky top-0">
        <button onClick={onBack} className="mr-4 text-slate-600 hover:text-blue-600 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-slate-900">Settings</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6">
             <div className="p-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800">Data Management</h3>
            </div>
            <ul className="divide-y divide-slate-100">
                <li onClick={() => fileInputRef.current?.click()} className="p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors">
                     <div className="flex items-center">
                        <div className="p-3 bg-blue-100 rounded-full mr-4 text-blue-600">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                        </div>
                        <div>
                            <p className="font-semibold text-slate-800">Import Collection</p>
                            <p className="text-sm text-slate-500">Add a collection from a file</p>
                        </div>
                    </div>
                     <input 
                        type="file" 
                        accept=".json" 
                        ref={fileInputRef} 
                        onChange={handleImportCollection} 
                        className="hidden" 
                    />
                </li>
            </ul>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
             <div className="p-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800">Danger Zone</h3>
            </div>
            <ul className="divide-y divide-slate-100">
                <li onClick={() => setIsConfirmOpen(true)} className="p-4 flex justify-between items-center cursor-pointer hover:bg-red-50 transition-colors">
                    <div className="flex items-center">
                        <div className="p-3 bg-red-100 rounded-full mr-4 text-red-600">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div>
                            <p className="font-semibold text-red-700">Clear All App Data</p>
                            <p className="text-sm text-slate-500">Permanently delete all collections, students, and settings.</p>
                        </div>
                    </div>
                </li>
            </ul>
        </div>
      </main>

      {isConfirmOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 transform transition-all scale-100">
                <h3 className="text-lg font-bold text-slate-900">Are you sure?</h3>
                <p className="mt-2 text-sm text-slate-600">This will permanently delete <strong>all data</strong> from the app, including students, collections, and your profile. This action cannot be undone.</p>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={() => setIsConfirmOpen(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors">Cancel</button>
                    <button onClick={handleClearAllData} className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 shadow-lg shadow-red-500/30 transition-all">Yes, Clear Everything</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <StudentsProvider>
      <CollectionsProvider>
        <RemittedCollectionsProvider>
          <ArchivedCollectionsProvider>
            <ProfileProvider>
              <ValueSetsProvider>
                <HistoryProvider>
                  <NetworkStatus />
                  <AppContent />
                </HistoryProvider>
              </ValueSetsProvider>
            </ProfileProvider>
          </ArchivedCollectionsProvider>
        </RemittedCollectionsProvider>
      </CollectionsProvider>
    </StudentsProvider>
  );
};

const AppContent: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<Screen>(Screen.Collection);
  const { collections, setCollections } = useCollections();
  const { remittedCollections } = useRemittedCollections();
  const { archivedCollections } = useArchivedCollections();
  const { students } = useStudents();
  const [selectedCollection, setSelectedCollection] = useState<Collection | RemittedCollection | ArchivedCollection | null>(null);
  const [collectionToEdit, setCollectionToEdit] = useState<Collection | null>(null);
  const [isViewingArchive, setIsViewingArchive] = useState(false);
  const [isViewingProfile, setIsViewingProfile] = useState(false);
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const [isAddingCollection, setIsAddingCollection] = useState(false);
  const [isViewingSettings, setIsViewingSettings] = useState(false);
  const [highlightedStudentId, setHighlightedStudentId] = useState<string | null>(null);
  const isPopStateChange = useRef(false);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
        isPopStateChange.current = true;
        setHighlightedStudentId(null); // Clear highlight on browser navigation

        const state = event.state || {};
        const { view, collectionId } = state;

        setSelectedCollection(null);
        setCollectionToEdit(null);
        setIsViewingArchive(false);
        setIsViewingProfile(false);
        setIsViewingHistory(false);
        setIsAddingCollection(false);
        setIsViewingSettings(false);

        switch(view) {
            case 'addCollection': setIsAddingCollection(true); break;
            case 'archive': setIsViewingArchive(true); break;
            case 'profile': setIsViewingProfile(true); break;
            case 'history': setIsViewingHistory(true); break;
            case 'settings': setIsViewingSettings(true); break;
            case 'collectionDetail': {
                const allCollections = [...collections, ...remittedCollections, ...archivedCollections];
                const collection = allCollections.find(c => c.id === collectionId);
                setSelectedCollection(collection || null);
                break;
            }
            case 'editCollection': {
                const collection = collections.find(c => c.id === collectionId);
                setCollectionToEdit(collection || null);
                break;
            }
        }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
        window.removeEventListener('popstate', handlePopState);
    };
  }, [collections, remittedCollections, archivedCollections]);

  useEffect(() => {
    if (isPopStateChange.current) {
        isPopStateChange.current = false;
        return;
    }

    let state: any = null;
    let title = 'TreasApp';
    
    if (collectionToEdit) {
        state = { view: 'editCollection', collectionId: collectionToEdit.id };
        title = `Edit: ${collectionToEdit.name}`;
    } else if (selectedCollection) {
        state = { view: 'collectionDetail', collectionId: selectedCollection.id };
        title = selectedCollection.name;
    } else if (isAddingCollection) {
        state = { view: 'addCollection' };
        title = 'Add Collection';
    } else if (isViewingArchive) {
        state = { view: 'archive' };
        title = 'Archive';
    } else if (isViewingProfile) {
        state = { view: 'profile' };
        title = 'Profile';
    } else if (isViewingHistory) {
        state = { view: 'history' };
        title = 'History';
    } else if (isViewingSettings) {
        state = { view: 'settings' };
        title = 'Settings';
    }

    if (state && JSON.stringify(state) !== JSON.stringify(window.history.state)) {
        window.history.pushState(state, title, '');
    }
  }, [selectedCollection, collectionToEdit, isAddingCollection, isViewingArchive, isViewingProfile, isViewingHistory, isViewingSettings]);

  const handleCollectionAdded = (newCollection: Collection) => {
    setCollections(prev => [...prev, newCollection]);
    setIsAddingCollection(false);
    setActiveScreen(Screen.Collection);
    setSelectedCollection(newCollection);
  };

  const handleSelectStudentPayment = (collectionId: string, studentId: string) => {
    const allCollections = [...collections, ...remittedCollections, ...archivedCollections];
    const collection = allCollections.find(c => c.id === collectionId);
    if (collection) {
        setSelectedCollection(collection);
        setHighlightedStudentId(studentId);
    }
  };

  const renderScreen = () => {
    switch (activeScreen) {
      case Screen.Collection:
        return (
          <CollectionScreen
            onSelectCollection={setSelectedCollection}
            onAddCollection={() => setIsAddingCollection(true)}
          />
        );
      case Screen.Remitted:
        return <RemittedScreen onSelectCollection={setSelectedCollection} />;
      case Screen.Funds:
        return <FundsScreen />;
      case Screen.Students:
        return <StudentsScreen onSelectStudentPayment={handleSelectStudentPayment} />;
      case Screen.Menu:
        return <MenuScreen onViewArchive={() => setIsViewingArchive(true)} onViewProfile={() => setIsViewingProfile(true)} onViewHistory={() => setIsViewingHistory(true)} onViewSettings={() => setIsViewingSettings(true)} />;
      default:
        return (
          <CollectionScreen
            onSelectCollection={setSelectedCollection}
            onAddCollection={() => setIsAddingCollection(true)}
          />
        );
    }
  };

  const handleUpdateCollection = (updatedCollection: Collection) => {
    setCollections(prev => prev.map(c => c.id === updatedCollection.id ? updatedCollection : c));
    setSelectedCollection(updatedCollection);
  };
  
  // Render Edit Screen if a collection is selected for editing
  if (collectionToEdit) {
    return (
      <EditCollectionScreen
        collection={collectionToEdit}
        onBack={() => window.history.back()}
        onSave={(updatedCollection) => {
          handleUpdateCollection(updatedCollection);
          window.history.back();
        }}
        collections={collections}
      />
    );
  }

  if (isAddingCollection) {
    return (
      <AddCollectionScreen
        onBack={() => {
            if (window.history.state && window.history.state.view === 'addCollection') {
                window.history.back();
            } else {
                setIsAddingCollection(false);
            }
        }}
        onCollectionAdded={handleCollectionAdded}
        hasStudents={students.length > 0}
        collections={collections}
      />
    );
  }
  
  if (isViewingArchive) {
    return (
      <ArchivedScreen
        onBack={() => window.history.back()}
        onSelectCollection={setSelectedCollection}
      />
    );
  }

  if (isViewingProfile) {
    return (
      <ProfileScreen
        onBack={() => window.history.back()}
      />
    );
  }

  if (isViewingHistory) {
    return <HistoryScreen onBack={() => window.history.back()} />;
  }

  if (isViewingSettings) {
    return <SettingsScreen onBack={() => window.history.back()} />;
  }

  if (selectedCollection) {
    return (
      <CollectionDetailScreen
        collection={selectedCollection}
        onBack={() => window.history.back()}
        onUpdateCollection={handleUpdateCollection}
        onEditCollection={(collection) => setCollectionToEdit(collection)} // Pass handler to trigger edit screen
        collections={collections}
        highlightedStudentId={highlightedStudentId}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen font-sans bg-slate-50 text-slate-800">
      <main className="flex-1 overflow-y-auto pb-28">{renderScreen()}</main>
      <BottomNav activeScreen={activeScreen} setActiveScreen={setActiveScreen} />
    </div>
  );
};


export default App;