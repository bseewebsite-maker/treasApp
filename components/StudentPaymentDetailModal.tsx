import React from 'react';
import { Student, Payment, Collection, RemittedCollection, CustomField, CustomFieldOption } from '../types';
import { getStudentTargetAmount } from '../screens/CollectionDetailScreen';

interface StudentPaymentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  payment: Payment | undefined;
  collection: Collection | RemittedCollection;
}

const RenderPaymentCustomFields: React.FC<{
  fields: CustomField[];
  payment: Payment;
  isSublevel?: boolean;
}> = ({ fields, payment, isSublevel = false }) => {
  return (
    <>
      {fields.map(field => {
        const value = payment.customFieldValues?.[field.id];
        if (!value || !value.trim()) return null;

        return (
          <div key={field.id} className={isSublevel ? "mt-2" : ""}>
            <dt className="text-sm font-medium text-gray-600">{field.name}:</dt>
            
            {(field.type === 'option' || field.type === 'checkbox') && field.options ? (
              <dd className="text-sm text-gray-800 mt-1 pl-2">
                {value.split(', ').map(selectedValue => {
                  const selectedOption = field.options?.find(o => o.value === selectedValue);
                  if (!selectedOption) return (
                    <div key={selectedValue} className="mt-1">{selectedValue}</div>
                  );

                  const subFieldsForOption = field.subFields?.[selectedOption.id];
                  
                  return (
                    <div key={selectedOption.id} className="mt-1">
                      <p>
                        {selectedValue}
                        {typeof selectedOption.amount === 'number' ? (
                          <span className="font-semibold text-gray-600"> (₱{selectedOption.amount.toLocaleString()})</span>
                        ) : ''}
                      </p>
                      {subFieldsForOption && (
                        <div className="pl-4 border-l-2 border-gray-200">
                          <RenderPaymentCustomFields
                            fields={subFieldsForOption}
                            payment={payment}
                            isSublevel={true}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </dd>
            ) : (
              <dd className="text-sm text-gray-800 pl-2">{value}</dd>
            )}
          </div>
        );
      })}
    </>
  );
};


const StudentPaymentDetailModal: React.FC<StudentPaymentDetailModalProps> = ({ isOpen, onClose, student, payment, collection }) => {
  if (!isOpen) return null;

  const studentTargetAmount = getStudentTargetAmount(collection, payment);

  const getStatusInfo = () => {
    let statusText = 'Not Paid';
    let statusColor = 'text-gray-500';
    const amountPaid = payment?.amount || 0;
    
    if (amountPaid > 0) {
      if (studentTargetAmount > 0) {
        const balance = amountPaid - studentTargetAmount;
        if (balance > 0) {
          statusText = `Credit: ₱${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          statusColor = 'text-blue-600';
        } else if (balance < 0) {
          statusText = `Debit: ₱${Math.abs(balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          statusColor = 'text-red-600';
        } else {
          statusText = 'Fully Paid';
          statusColor = 'text-green-600';
        }
      } else {
        statusText = 'Paid';
        statusColor = 'text-green-600';
      }
    }
    return { statusText, statusColor, amountPaid };
  };

  const { statusText, statusColor, amountPaid } = getStatusInfo();
  const paymentDate = payment?.timestamp ? new Date(payment.timestamp) : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-sm max-h-[90vh] flex flex-col" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 truncate">{student.studentName}</h3>
          <p className="text-sm text-gray-500">Payment Details</p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div>
            <h4 className="text-xs uppercase font-bold text-gray-400 mb-2">Payment Status</h4>
            <div className="space-y-1">
                <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Amount to Pay:</span>
                    <span className="text-sm font-semibold text-gray-800">
                        {studentTargetAmount > 0 ? `₱${studentTargetAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}
                    </span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Amount Paid:</span>
                    <span className="text-sm font-semibold text-gray-800">
                        {amountPaid > 0 ? `₱${amountPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                    </span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Status:</span>
                    <span className={`text-sm font-semibold ${statusColor}`}>{statusText}</span>
                </div>
            </div>
          </div>
          
          {paymentDate && (
             <div>
                <h4 className="text-xs uppercase font-bold text-gray-400 mb-2">Timestamp</h4>
                <div className="space-y-1">
                     <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600">Date:</span>
                        <span className="text-sm text-gray-800">{paymentDate.toLocaleDateString()}</span>
                    </div>
                     <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600">Time:</span>
                        <span className="text-sm text-gray-800">{paymentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                </div>
            </div>
          )}

          {collection.customFields && collection.customFields.length > 0 && payment && (
            <div>
              <h4 className="text-xs uppercase font-bold text-gray-400 mb-2">Additional Info</h4>
              <dl className="space-y-4">
                <RenderPaymentCustomFields fields={collection.customFields} payment={payment} />
              </dl>
            </div>
          )}
        </div>

        <div className="bg-gray-50 px-5 py-3 flex justify-end rounded-b-lg border-t border-gray-200">
          <button 
            onClick={onClose} 
            className="w-full sm:w-auto px-4 py-2 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentPaymentDetailModal;