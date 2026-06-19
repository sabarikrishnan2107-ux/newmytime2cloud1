import React from 'react';
import './LoadingProgressDialog.css';

const PDFProgressOverlay = ({ isOpen, progress = 0 }) => {
  if (!isOpen) return null;

  const text = progress >= 100 ? "Ready!" : "Preparing......";

  return (
    <div className="react-dialog-overlay">
      <div className="spinner-container">
        <div className="outer-spin-bars">
          <div className="bar bar-1"></div>
          <div className="bar bar-2"></div>
          <div className="bar bar-3"></div>
        </div>
        <div className="spinner-progress" style={{ '--percent': progress }}></div>
        <div className="spinner-circle"></div>
        <div className="spinner-inner-circle">{progress}%</div>
        <div className="progress-loader">{text}</div>
      </div>
    </div>
  );
};

export default PDFProgressOverlay;
