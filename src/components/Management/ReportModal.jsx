import React, { useState, useMemo } from 'react';
import { reportService } from '../../Services/report.service';
import './ReportModal.css'; // Create this CSS file

const ReportModal = ({ isOpen, onClose, forms, dateFields, dateFieldLabel }) => {
  const [reportType, setReportType] = useState('excel');
  const [reportPeriod, setReportPeriod] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [generating, setGenerating] = useState(false);

  // Helper function to get count for any period
  const getCountForPeriod = (period) => {
    if (!forms || forms.length === 0) return 0;
    return reportService.filterDataByPeriod(forms, period, startDate, endDate, dateFields)?.length || 0;
  };

  // Memoized filtered count for selected period
  const filteredCount = useMemo(() => {
    return getCountForPeriod(reportPeriod);
  }, [forms, reportPeriod, startDate, endDate, dateFields]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const filteredData = reportService.filterDataByPeriod(forms, reportPeriod, startDate, endDate, dateFields);

      if (!filteredData || filteredData.length === 0) {
        alert(`No data found for ${reportService.getPeriodLabel(reportPeriod, startDate, endDate)}!`);
        return;
      }

      if (reportType === "excel") {
        reportService.generateExcelReport(filteredData, reportPeriod, 'management', startDate, endDate);
      } else if (reportType === "pdf") {
        reportService.generatePDFReport(filteredData, reportPeriod, 'management', startDate, endDate);
      } 

      onClose();
    } catch (err) {
      console.error("❌ Report generation error:", err);
      alert("Report generation failed: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="rm-modal-overlay" onClick={onClose}>
      <div className="rm-modal-container" onClick={e => e.stopPropagation()}>
        {/* Header with gradient */}
        <div className="rm-modal-header">
          <div className="rm-header-content">
            <h2>Generate Report</h2>
          </div>
          <button className="rm-close-btn" onClick={onClose} disabled={generating}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="rm-modal-body">
          {/* Report Format Section */}
          <div className="rm-section">
            <div className="rm-section-title">
              <span className="rm-section-icon">📄</span>
              <h3>Report Format</h3>
            </div>
            <div className="rm-format-grid">
              {[
                { type: 'excel', icon: '📊', label: 'Excel', color: '#1D6F42', bgColor: '#E8F5E9' },
                { type: 'pdf', icon: '📄', label: 'PDF', color: '#E74C3C', bgColor: '#FDEDEC' },
               
              ].map(({ type, icon, label, color, bgColor }) => (
                <label
                  key={type}
                  className={`rm-format-card ${reportType === type ? 'rm-format-selected' : ''}`}
                  style={reportType === type ? { borderColor: color, backgroundColor: bgColor } : {}}
                >
                  <input
                    type="radio"
                    name="reportType"
                    value={type}
                    checked={reportType === type}
                    onChange={(e) => setReportType(e.target.value)}
                    disabled={generating}
                  />
                  <div className="rm-format-icon" style={{ color: color }}>
                    {icon}
                  </div>
                  <div className="rm-format-name">{label}</div>
                  {reportType === type && (
                    <div className="rm-check-badge" style={{ backgroundColor: color }}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M13.3334 4L6.00008 11.3333L2.66675 8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </div>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Time Period Section */}
          <div className="rm-section">
            <div className="rm-section-title">
              <span className="rm-section-icon">⏱️</span>
              <h3>Time Period</h3>
            </div>
            <div className="rm-period-selector">
              <select
                value={reportPeriod}
                onChange={(e) => setReportPeriod(e.target.value)}
                className="rm-period-select"
                disabled={generating}
              >
                <option value="all">📋 All Time ({forms?.length || 0} records)</option>
                <option value="today">📅 Today ({getCountForPeriod('today')} records)</option>
                <option value="15days">📊 Last 15 Days ({getCountForPeriod('15days')} records)</option>
                <option value="1month">📈 Last 1 Month ({getCountForPeriod('1month')} records)</option>
                <option value="3months">📉 Last 3 Months ({getCountForPeriod('3months')} records)</option>
                <option value="6months">📊 Last 6 Months ({getCountForPeriod('6months')} records)</option>
                <option value="annual">📅 Annual ({getCountForPeriod('annual')} records)</option>
                <option value="custom">📅 Custom Range ({getCountForPeriod('custom')} records)</option>
              </select>
              <div className="rm-select-arrow">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 7.5L10 12.5L15 7.5" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
            </div>

            {reportPeriod === 'custom' && (
              <div className="rm-custom-range-inputs">
                <div className="rm-date-input-group">
                  <label htmlFor="rm-start-date">Start Date</label>
                  <input
                    id="rm-start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="rm-date-input"
                    disabled={generating}
                  />
                </div>
                <div className="rm-date-input-group">
                  <label htmlFor="rm-end-date">End Date</label>
                  <input
                    id="rm-end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="rm-date-input"
                    disabled={generating}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Summary Info Box */}
          <div className="rm-summary-box">
            <div className="rm-summary-header">
              <span className="rm-summary-icon">📊</span>
              <span>Report Summary</span>
            </div>
            <div className="rm-summary-content">
              <div className="rm-summary-row">
                <span className="rm-summary-label">Selected Period</span>
                <span className="rm-summary-value rm-period-badge">
                  {reportService.getPeriodLabel(reportPeriod, startDate, endDate)}
                </span>
              </div>
              {dateFieldLabel && (
                <div className="rm-summary-row">
                  <span className="rm-summary-label">Date Matched On</span>
                  <span className="rm-summary-value">{dateFieldLabel}</span>
                </div>
              )}
              <div className="rm-summary-row rm-highlight-row">
                <span className="rm-summary-label">Records to Export</span>
                <span className={`rm-summary-value rm-count-value ${filteredCount === 0 ? 'rm-count-zero' : 'rm-count-positive'}`}>
                  {filteredCount}
                </span>
              </div>
              {filteredCount === 0 && (
                <div className="rm-warning-message">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="#E74C3C" strokeWidth="1.5"/>
                    <path d="M10 6V10M10 14H10.01" stroke="#E74C3C" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <span>No records found for this period</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer with Actions */}
        <div className="rm-modal-footer">
          <button 
            className="rm-btn rm-btn-secondary" 
            onClick={onClose}
            disabled={generating}
          >
            Cancel
          </button>
          <button 
            className="rm-btn rm-btn-primary"
            onClick={handleGenerate}
            disabled={generating || filteredCount === 0}
          >
            {generating ? (
              <>
                <span className="rm-spinner"></span>
                <span>Generating Report...</span>
              </>
            ) : (
              <>
                <span className="rm-btn-icon">📥</span>
                <span>Download {reportType.toUpperCase()} Report</span>
                {filteredCount > 0 && (
                  <span className="rm-btn-badge">{filteredCount}</span>
                )}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;