import React, { useEffect } from 'react';

const SuccessAlert = ({ message, isOpen, onClose }) => {
  useEffect(() => {
    if (isOpen) {
      // Automatically close the alert after a few seconds
      const timer = setTimeout(() => {
        onClose();
      }, 3000); // Close after 3 seconds
      return () => clearTimeout(timer); // Cleanup timer if component unmounts or closes
    }
  }, [isOpen, onClose]); // Rerun effect when isOpen or onClose changes

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"> {/* Increased z-index */}
      <div className="bg-white rounded-lg shadow-xl p-6 border-l-4 border-green-500 max-w-sm w-full animate-fade-in-up">
        <div className="flex items-center">
          <svg className="h-6 w-6 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-semibold text-gray-800 flex-1">{message}</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-4">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessAlert;