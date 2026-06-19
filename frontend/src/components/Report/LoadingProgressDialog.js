import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './LoadingProgressDialog.css';
import { checkProgress } from '@/lib/endpoint/attendance';

const LoadingProgressDialog = ({ isOpen, queryStringUrl, onClose }) => {
  const [progress, setProgress] = useState(0);
  const [analysisText, setAnalysisText] = useState("Loading...");
  const [stats, setStats] = useState({ total: 0, done: 0, failed: 0 });
  const intervalRef = useRef(null);

  // Reset logic
  const reset = () => {
    setProgress(0);
    setStats({ total: 0, done: 0, failed: 0 });
    setAnalysisText("Loading...");
  };

  const viewReport = () => {
    const report = document.createElement("a");
    report.setAttribute("href", queryStringUrl);
    report.setAttribute("target", "_blank");
    report.click();
  };

  const fetchProgress = async () => {
    try {
      const res = await checkProgress(); // Replace with your actual endpoint
      const { total, done, failed } = res;

      const currentProgress = total > 0 ? Math.round(((done + failed) / total) * 100) : 0;
      
      setStats({ total, done, failed });
      setProgress(currentProgress);
      setAnalysisText(currentProgress < 100 ? "Preparing……" : "Ready!");

      // Stop polling if finished
      if (done + failed >= total && total > 0) {
        stopProgressPolling();

        setTimeout(() => {
          viewReport();
        }, 2000);

        setTimeout(() => {
          if (onClose) onClose();
        }, 10000);
      }
    } catch (err) {
      console.error("Error fetching progress:", err.message);
    }
  };

  const startProgressPolling = () => {
    reset();
    stopProgressPolling();
    fetchProgress(); // Immediate call
    intervalRef.current = setInterval(fetchProgress, 3000);
  };

  const stopProgressPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Watch for isOpen changes (replacement for Vue watcher)
  useEffect(() => {
    if (isOpen) {
      startProgressPolling();
    } else {
      stopProgressPolling();
    }
    return () => stopProgressPolling();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="react-dialog-overlay">
      <div className="spinner-container">
        {/* New Outer Spinning Bar Layer */}
        <div className="outer-spin-bars">
          <div className="bar bar-1"></div>
          <div className="bar bar-2"></div>
          <div className="bar bar-3"></div>
        </div>

        {/* Progress Indicator Layer */}
        <div 
          className="spinner-progress" 
          style={{ '--percent': progress }}
        ></div>

        {/* Spinning Outer Wheel Layer (Fast Spin) */}
        <div className="spinner-circle"></div>

        {/* Inner Percentage Display */}
        <div className="spinner-inner-circle">{progress}%</div>

        <div className="progress-loader">{analysisText}</div>
      </div>
    </div>
  );
};

export default LoadingProgressDialog;