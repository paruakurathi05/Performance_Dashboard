import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import MainLayout from "../components/common/Layout/MainLayout";
import { parseAsUTC } from "../utils/helpers";
import {toast } from "react-toastify";
import { 
  FiSearch, 
  FiUser, 
  FiBriefcase,
  FiMessageSquare,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiEye,
  FiArrowLeft
} from "react-icons/fi";
import "./BpoHistory.css";

const BASE_URL = "https://performance-dashboard-be.onrender.com";

function BpoHistory({ user, logout }) {
  const [historyForms, setHistoryForms] = useState([]);
  const [filteredForms, setFilteredForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState(null);
  const [bpoReason, setBpoReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const navigate = useNavigate();

  const fetchHistory = async () => {
    try {
      const response = await axios.get(
        `${BASE_URL}/api/bpo-request/history`,
        { withCredentials: true }
      );
      setHistoryForms(response.data);
      setFilteredForms(response.data);
    } catch (error) {
      console.error("History Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Filter forms based on search, status, and date range
  useEffect(() => {
    let filtered = [...historyForms];
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(form => 
        form.vendorShopName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        form.vendorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        form.executiveName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        form.id?.toString().includes(searchTerm)
      );
    }
    
    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(form => 
        form.status?.toLowerCase() === statusFilter.toLowerCase()
      );
    }
    
    // Date filter (Single date or Custom Range)
    if (startDate || endDate) {
      filtered = filtered.filter(form => {
        const rawDate = form.createdAt || form.updatedAt || form.submittedAt || form.bpoSubmittedAt || form.date || form.created_at;
        if (!rawDate) return false;

          const itemDate = parseAsUTC(rawDate);
          if (!itemDate || isNaN(itemDate.getTime())) return false;

        // Format to YYYY-MM-DD in Asia/Kolkata timezone
        const itemDateStr = itemDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

        if (startDate && endDate) {
          return itemDateStr >= startDate && itemDateStr <= endDate;
        } else if (startDate) {
          return itemDateStr >= startDate;
        } else if (endDate) {
          return itemDateStr <= endDate;
        }
        return true;
      });
    }
    
    setFilteredForms(filtered);
  }, [searchTerm, statusFilter, startDate, endDate, historyForms]);

  const handleRequestManager = async () => {
    if (!bpoReason.trim()) {
      toast.error("Please enter reason for manager request");
      return;
    }

    try {
      setSubmitting(true);
      const response = await axios.put(
        `${BASE_URL}/api/bpo-request/request/${selectedForm.id}`,
        { bpoReason },
        { withCredentials: true }
      );

      setHistoryForms((prev) =>
        prev.map((form) =>
          form.id === selectedForm.id ? response.data : form
        )
      );

      toast.success("Request sent to Manager successfully!");
      setSelectedForm(null);
      setBpoReason("");
    } catch (error) {
      console.error("Request Error:", error);
      toast.warning("Failed to send request");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status) => {
    switch(status?.toLowerCase()) {
      case 'interested': return <FiCheckCircle className="status-icon interested" />;
      case 'not_interested': return <FiXCircle className="status-icon not-interested" />;
      default: return <FiAlertCircle className="status-icon default" />;
    }
  };

  const getStatusClass = (status) => {
    return `status-badge ${status?.toLowerCase() || 'default'}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = parseAsUTC(dateString);
    return date ? date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Kolkata'
    }) : 'N/A';
  };

  return (
    <MainLayout user={user} logout={logout}>
      <div className="bpo-history">
        {/* Header Section */}
        <div className="history-header">
          <div className="header-title">
            <button 
              className="back-btn-history" 
              onClick={() => navigate("/bpo-dashboard")}
            >
               <FiArrowLeft />
              Back to Dashboard
            </button>
            <h1>BPO Submission History</h1>
            <p>View and manage all your historical submissions ({historyForms.length} total)</p>
          </div>
        </div>

        {/* Filters Section */}
        <div className="filters-section">
          <div className="search-box">
            <FiSearch className="search-icon-history" />
            <input
              type="text"
              placeholder="Global Search: Shop, Vendor, Executive..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <div className="filter-select">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="interested">INTERESTED</option>
                <option value="not_interested">NOT INTERESTED</option>
              </select>
            </div>

            <div className="filter-date">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                title="Start Date"
                placeholder="From"
              />
            </div>
            <div className="filter-date">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                title="End Date"
                placeholder="To"
                min={startDate || undefined}
              />
            </div>
            {(startDate || endDate) && (
              <button
                className="clear-date-btn"
                onClick={() => { setStartDate(""); setEndDate(""); }}
                title="Clear date filters"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        {/* Content Section */}
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading history...</p>
          </div>
        ) : filteredForms.length === 0 ? (
          <div className="empty-state">
            <FiMessageSquare className="empty-icon" />
            <h3>No forms found</h3>
            <p>No BPO submission history matches your criteria</p>
          </div>
        ) : (
          <div className="forms-grid">
            {filteredForms.map((form) => (
              <div
                key={form.id}
                className="form-card"
                onClick={() => setSelectedForm(form)}
              >
                <div className="card-header">
                  <div className="shop-info">
                    <h3>{form.vendorShopName || "Unnamed Shop"}</h3>
                    <span className={getStatusClass(form.status)}>
                      {getStatusIcon(form.status)}
                      {form.status?.replace('_', ' ') || 'Unknown'}
                    </span>
                  </div>
                </div>

                <div className="card-body">
                  <div className="info-row">
                    <FiUser className="info-icon" />
                    <span className="info-value">{form.vendorName}</span>
                  </div>

                  <div className="info-row">
                    <FiBriefcase className="info-icon" />
                    <span className="info-value">{form.executiveName}</span>
                  </div>

                  <div className="card-footer">
                    <div className="team-info">
                      <span className="team-value">{form.areaName || "N/A"}</span>
                    </div>
                    <div className="view-details">
                      <FiEye className="view-icon" />
                      <span>Details / Request</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {selectedForm && (
          <div className="modal-overlay" onClick={() => { setSelectedForm(null); setBpoReason(""); }}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title">
                  <h2>{selectedForm.vendorShopName}</h2>
                  <span className={getStatusClass(selectedForm.status)}>
                    {getStatusIcon(selectedForm.status)}
                    {selectedForm.status}
                  </span>
                </div>
                <button className="modal-close" onClick={() => { setSelectedForm(null); setBpoReason(""); }}>×</button>
              </div>

              <div className="modal-body">
                {/* Information Sections (Synced with Dashboard) */}
                <div className="reviews-section">
                  <h4>🏢 Core Details</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Vendor Name</span>
                      <span className="detail-value">{selectedForm.vendorName}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Contact</span>
                      <span className="detail-value">{selectedForm.contactNumber}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Executive</span>
                      <span className="detail-value">{selectedForm.executiveName}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Team Lead</span>
                      <span className="detail-value">{selectedForm.teamleadName}</span>
                    </div>
                  </div>
                </div>

                <div className="reviews-section">
                  <h4>📍 Location & Address</h4>
                  <div className="review-box">
                    <p>{selectedForm.doorNumber}, {selectedForm.streetName}, {selectedForm.areaName}, {selectedForm.state} - {selectedForm.pinCode}</p>
                    <p style={{ marginTop: '8px', fontSize: '0.85rem', color: '#64748b' }}>
                      Mapped Location: {selectedForm.vendorLocation || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="reviews-section">
                  <h4>💬 Review History</h4>
                  {selectedForm.executiveReview && (
                    <div className="review-box">
                      <span className="review-box-label">Executive Review</span>
                      <p>{selectedForm.executiveReview}</p>
                    </div>
                  )}
                  {selectedForm.vendorReview && (
                    <div className="review-box">
                      <span className="review-box-label">Vendor Review</span>
                      <p>{selectedForm.vendorReview}</p>
                    </div>
                  )}
                </div>

                {/* Manager Request Section */}
                <div className="request-section">
                  <h4>⚠️ Request Manager for Resubmission</h4>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '12px' }}>
                    If this form needs to be re-edited and resubmitted, enter the reason clearly for manager approval.
                  </p>
                  <textarea
                    placeholder="e.g., Vendor changed contact number, address needs correction..."
                    value={bpoReason}
                    onChange={(e) => setBpoReason(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  className="btn-request"
                  onClick={handleRequestManager}
                  disabled={submitting}
                  style={{ flex: 1 }}
                >
                  {submitting ? "Sending Request..." : "Submit to Manager"}
                </button>
                <button 
                  className="btn-cancel"
                  onClick={() => { setSelectedForm(null); setBpoReason(""); }}
                  style={{ flex: 1 }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default BpoHistory;