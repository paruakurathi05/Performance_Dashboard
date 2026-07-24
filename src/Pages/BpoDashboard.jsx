import React, { useState, useEffect } from "react";
import axios from "axios";
import MainLayout from "../components/common/Layout/MainLayout";
import { parseAsUTC } from "../utils/helpers";
import "./BpoDashboard.css";
import { useNavigate } from "react-router-dom";
import { FiSearch } from "react-icons/fi";

const BASE_URL = "https://performance-dashboard-be.onrender.com";

function BpoDashBoard({ user, logout }) {
  const currentUser = user || (() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch (e) {
      return null;
    }
  })();

  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedForm, setSelectedForm] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [locationFilter, setLocationFilter] = useState("All Locations");
  const [vendorTypeFilter, setVendorTypeFilter] = useState("All Types");
  // Review modal states
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedFormForReview, setSelectedFormForReview] = useState(null);
  const [executiveReview, setExecutiveReview] = useState("");
  const [vendorReview, setVendorReview] = useState("");
  const [idNumber, setIdNumber] = useState(currentUser?.userCode || "");
  const [bpoName, setBpoName] = useState(currentUser?.name || "");
  const [selectedAction, setSelectedAction] = useState("SOLVED");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(null);

  useEffect(() => {
    if (currentUser) {
      if (!idNumber && currentUser.userCode) setIdNumber(currentUser.userCode);
      if (!bpoName && currentUser.name) setBpoName(currentUser.name);
    }
  }, [user]);

  // Onboarding Readiness States
  const [vendorReady, setVendorReady] = useState(false);
  const [onboardInDays, setOnboardInDays] = useState(0);

  // Re-visit forms feature state
  const [activeTab, setActiveTab] = useState("FORMS"); // 'FORMS' or 'REVISITS'
  const [reappearForms, setReappearForms] = useState([]);

  // ── Approved Requests Feature State ───────────────────────────────────────
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [showApprovedModal, setShowApprovedModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [editFormData, setEditFormData] = useState(null);
  const [isFetchingApproved, setIsFetchingApproved] = useState(false);
  const [isResubmitting, setIsResubmitting] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    fetchForms();
    fetchReappearForms();
    fetchApprovedRequests();
  }, []);

  const fetchReappearForms = async () => {
    try {
      const response = await axios.get(
        `${BASE_URL}/api/bpo/reappear-forms`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true
        }
      );
      console.log("API Success BPO REAPPEAR FORMS DATA", response);
      setReappearForms(response.data || []);
    } catch (err) {
      console.error("Error fetching reappear forms:", err);
    }
  };

  const fetchForms = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${BASE_URL}/api/bpo/forms`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true
        }
      );

      console.log("API Success BPO FORMS DATA FROM RESPONSE", response);
      setForms(response.data);
      setError(null);
    } catch (err) {
      console.error("Axios Error:", err);

      if (err.response) {
        setError(`Server Error: ${err.response.status}`);
      } else if (err.request) {
        setError("No response from server");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovedRequests = async () => {
    try {
      setIsFetchingApproved(true);
      const response = await axios.get(
        `${BASE_URL}/api/bpo-request/reopened`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true
        }
      );
      console.log("fetch approved request response from bpoDashboard", response)

      setApprovedRequests(response.data || []);
    } catch (err) {
      console.error("Error fetching approved requests:", err);
    } finally {
      setIsFetchingApproved(false);
    }
  };

  // Handle review submission
  const handleReviewSubmit = async () => {
    if (!selectedFormForReview) return;

    // Validation
    if (!idNumber.trim()) {
      setSubmitError("Please provide ID Number");
      return;
    }
    if (!bpoName.trim()) {
      setSubmitError("Please provide BPO Name");
      return;
    }
    if (!executiveReview.trim()) {
      setSubmitError("Please provide executive review");
      return;
    }
    if (!vendorReview.trim()) {
      setSubmitError("Please provide vendor review");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const payload = {
        action: selectedAction,
        idNumber: idNumber.trim(),
        bpoName: bpoName.trim(),
        executiveReview: executiveReview.trim(),
        vendorReview: vendorReview.trim(),
        vendorReady: vendorReady,
        onboardInDays: vendorReady ? parseInt(onboardInDays) || 0 : 0
      };

      console.log("Submitting review:", payload);

      const response = await axios.post(
        `${BASE_URL}/api/bpo/submit/${selectedFormForReview.id}`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true
        }
      );

      console.log("Review submitted successfully:", response.data);

      setSubmitSuccess("Review submitted successfully!");

      // Auto-close modal after a short delay to let user see success state if needed
      // but the user wants it outside, so we close it immediately but keep success state
      setTimeout(() => {
        setShowReviewModal(false);
        setSelectedFormForReview(null);
        setExecutiveReview("");
        setVendorReview("");
        setIdNumber(currentUser?.userCode || "");
        setBpoName(currentUser?.name || "");
        setSelectedAction("SOLVED");
        setVendorReady(false);
        setOnboardInDays(0);
        setSubmitError(null);
        // We do NOT clear submitSuccess here so it stays visible outside
        setIsSubmitting(false);
      }, 800);

      // Automatically clear success message after 5 seconds
      setTimeout(() => {
        setSubmitSuccess(null);
      }, 5000);


    } catch (err) {
      console.error("Error submitting review:", err);
      setSubmitError(
        err.response?.data?.message ||
        "Failed to submit review. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open review modal
  const handleOpenReviewModal = (form, e) => {
    e.stopPropagation(); // Prevent card click
    setSelectedFormForReview(form);
    setExecutiveReview("");
    setVendorReview("");
    setIdNumber(currentUser?.userCode || "");
    setBpoName(currentUser?.name || "");
    setSelectedAction("SOLVED");
    setVendorReady(false);
    setOnboardInDays(0);
    setSubmitError(null);
    setSubmitSuccess(null);
    setShowReviewModal(true);
  };

  // Close review modal
  const handleCloseReviewModal = () => {
    setShowReviewModal(false);
    setSelectedFormForReview(null);
    setExecutiveReview("");
    setVendorReview("");
    setIdNumber(currentUser?.userCode || "");
    setBpoName(currentUser?.name || "");
    setSelectedAction("SOLVED");
    setVendorReady(false);
    setOnboardInDays(0);
    setSubmitError(null);
    setSubmitSuccess(null);
    setIsSubmitting(false);
  };

  // ── Approved Requests Handlers ────────────────────────────────────────────
  const handleEditRequest = (req) => {
    setEditingRequest(req);
    setEditFormData({
      vendorShopName: req.vendorShopName || "",
      vendorName: req.vendorName || "",
      contactNumber: req.contactNumber || "",
      mailId: req.mailId || "",
      vendorType: req.vendorType || "",
      doorNumber: req.doorNumber || "",
      streetName: req.streetName || "",
      areaName: req.areaName || "",
      pinCode: req.pinCode || "",
      state: req.state || "",
      district: req.district || "",
      vendorLocation: req.vendorLocation || "",
      latitude: req.latitude || "",
      longitude: req.longitude || "",
      idNumber: req.idNumber || currentUser?.userCode || "",
      bpoName: req.bpoName || currentUser?.name || "",
      executiveReview: req.executiveReview || "",
      vendorReview: req.vendorReview || "",
      action: req.action || "SOLVED"
    });
  };

  const handleEditChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  const handleUpdateAndResubmit = async () => {
    // Basic validation
    if (!editFormData.vendorShopName || !editFormData.vendorName || !editFormData.idNumber || !editFormData.bpoName || !editFormData.executiveReview || !editFormData.vendorReview) {
      alert("Please fill in all required fields (Shop Name, Owner Name, ID, BPO Name, and Reviews).");
      return;
    }

    try {
      setIsResubmitting(true);
      await axios.put(
        `${BASE_URL}/api/bpo-request/resubmit/${editingRequest.id}`,
        editFormData,
        {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true
        }
      );

      alert("BPO Request resubmitted successfully!");
      setEditingRequest(null);

      // Refresh data
      fetchApprovedRequests();
      fetchForms();

      // Auto-close if it was the last one
      if (approvedRequests.length <= 1) {
        setShowApprovedModal(false);
      }
    } catch (error) {
      console.error("Failed to resubmit request:", error);
      alert(error.response?.data?.message || "Failed to resubmit request. Please try again.");
    } finally {
      setIsResubmitting(false);
    }
  };

  // Open view details modal
  const handleViewDetails = (form) => {
    setSelectedForm(form);
  };

  const activeData = activeTab === "FORMS" ? forms : reappearForms;

  // Calculate statistics
  const stats = {
    total: activeData.length,
    interested: activeData.filter(f => f.status === 'INTERESTED').length,
    onboarded: activeData.filter(f => f.status === 'ONBOARDED').length,
    notInterested: activeData.filter(f => f.status === 'NOT_INTERESTED').length
  };
  // Generate unique districts (Alphabetical Order)
  const uniqueDistricts = [
    ...new Set(
      activeData
        .map(form => form.district)
        .filter(district => district && district.trim() !== "")
    )
  ].sort((a, b) => a.localeCompare(b));

  // Generate unique vendor types
  const uniqueVendorTypes = [
    ...new Set(
      activeData
        .map(form => form.vendorType)
        .filter(type => type && type.trim() !== "")
    )
  ].sort((a, b) => a.localeCompare(b));
  // Filter forms
  const filteredForms = activeData.filter((form) => {
    const searchValue = searchTerm.toLowerCase();

    const matchesSearch =
      searchTerm === "" ||
      form.vendorShopName?.toLowerCase().includes(searchValue) ||
      form.vendorName?.toLowerCase().includes(searchValue) ||
      form.executiveName?.toLowerCase().includes(searchValue) ||
      form.district?.toLowerCase().includes(searchValue) ||           // ✅ Added district to search
      form.vendorLocation?.toLowerCase().includes(searchValue) ||
      form.id?.toString().includes(searchTerm);

    const matchesStatus =
      statusFilter === "All Status" ||
      form.status?.toLowerCase() === statusFilter.toLowerCase();

    const matchesLocation =
      locationFilter === "All Locations" ||
      form.district === locationFilter; // ✅ Filtering by district field now
    const matchesVendorType =
      vendorTypeFilter === "All Types" ||
      form.vendorType === vendorTypeFilter;
    return matchesSearch && matchesStatus && matchesLocation && matchesVendorType;
  });

  // Icons
  const Icons = {
    shop: "🏪",
    owner: "👤",
    location: "📍",
    executive: "👨‍💼",
    teamlead: "👥",
    calendar: "📅",
    phone: "📞",
    email: "✉️",
    review: "✍️",
    submit: "📤"
  };

  return (
    <MainLayout user={user || currentUser} logout={logout}>
      <div className="bpo-dashboard">
        {/* Header Section */}
        <div className="dashboard-header">
          <div className="header-title-group">
            <h1>BPO Performance Dashboard</h1>
            <p>Manage and review vendor submissions ({activeTab === 'FORMS' ? forms.length : reappearForms.length} total)</p>
          </div>

          <div className="header-actions">
            <div className="view-toggle-group" style={{ display: 'flex', gap: '8px', marginRight: '8px' }}>
              <button 
                className={`bpo-btn-ghost ${activeTab === 'FORMS' ? 'active-tab' : ''}`}
                onClick={() => setActiveTab('FORMS')}
                style={activeTab === 'FORMS' ? { backgroundColor: '#e0e7ff', color: '#4f46e5', borderColor: '#4f46e5' } : {}}
              >
                📝 All Forms
              </button>
              <button 
                className={`bpo-btn-ghost ${activeTab === 'REVISITS' ? 'active-tab' : ''}`}
                onClick={() => setActiveTab('REVISITS')}
                style={activeTab === 'REVISITS' ? { backgroundColor: '#e0e7ff', color: '#4f46e5', borderColor: '#4f46e5' } : {}}
              >
                🔄 Re Visits {reappearForms.length > 0 && `(${reappearForms.length})`}
              </button>
            </div>
            <button
              className="back-btn-dashboard"
              onClick={() => navigate("/bpo-history")}
              style={{ marginRight: '8px' }}
            >
              📜 View History
            </button>
            <div className="bpo-approved-badge-container">
              <button
                className={`bpo-btn-ghost ${approvedRequests.length > 0 ? 'has-requests' : ''}`}
                onClick={() => setShowApprovedModal(true)}
              >
                📋 Approved Requests
              </button>
              <span className="bpo-badge-count">{approvedRequests.length}</span>
            </div>
            <button className="refresh-btn" onClick={() => { fetchForms(); fetchReappearForms(); fetchApprovedRequests(); }}>
              {Icons.refresh} Refresh
            </button>
          </div>
        </div>

        {/* Global Success Alert (Outside Modal) */}
        {submitSuccess && (
          <div className="alert alert-success bpo-global-toast">
            <span className="alert-icon">✅</span>
            <div className="alert-content">
              <strong>Success!</strong>
              <span>{submitSuccess}</span>
            </div>
            <button className="alert-close" onClick={() => setSubmitSuccess(null)}>×</button>
          </div>
        )}

        {/* Search and Filter */}
        <div className="filter-bar">
          <div className="search-input-wrapper">
            <div className="search-icon">
              <FiSearch />
            </div>
            <input
              type="text"
              placeholder="Search by shop name, owner, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="INTERESTED">INTERESTED</option>
            <option value="NOT_INTERESTED">NOT INTERESTED</option>
          </select>

          <select
            className="filter-select"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
          >
            <option value="All Locations">All Districts</option>
            {uniqueDistricts.map((district, index) => (
              <option key={index} value={district}>
                {district}
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={vendorTypeFilter}
            onChange={(e) => setVendorTypeFilter(e.target.value)}
          >
            <option value="All Types">All Types</option>
            {uniqueVendorTypes.map((type, index) => (
              <option key={index} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        {/* Loading State */}
        {loading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading forms...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="error-container">
            <div className="error-icon">⚠️</div>
            <p className="error-message">{error}</p>
            <button className="retry-btn" onClick={fetchForms}>
              Try Again
            </button>
          </div>
        )}

        {/* Forms Grid */}
        {!loading && !error && (
          <div className="forms-grid">
            {filteredForms.length === 0 ? (
              <div className="empty-state">
                <p>No forms found matching your criteria</p>
              </div>
            ) : (
              filteredForms.map((form) => (
                <div
                  key={form.id}
                  className="bpo-card-compact"
                  onClick={() => handleViewDetails(form)}
                >
                  <div className="card-top">
                    <div className="card-id">#{form.id}</div>
                    <span className={`status-badge status--${form.status?.toLowerCase().replace('_', '-')}`}>
                      {form.status?.replace('_', ' ')}
                    </span>
                  </div>

                  <h3 className="card-title">{form.vendorShopName || "Unnamed Shop"}</h3>
                  <div className="card-subtitle">
                    <span>👤 {form.vendorName}</span>
                  </div>

                  <div className="card-meta">
                    <div className="meta-item">
                      <span>📍 {form.district || form.areaName || form.vendorLocation?.split(',')[0] || "N/A"}</span>
                    </div>
                    <div className="meta-item">
                      <span>📅 {parseAsUTC(form.createdAt)?.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* View Details Modal */}
        {selectedForm && (
          <div className="bpo-modal-overlay" onClick={() => setSelectedForm(null)}>
            <div className="bpo-modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="bpo-modal-header">
                <div className="modal-header-info">
                  <h2>{selectedForm.vendorShopName || "Unnamed Shop"}</h2>
                  <p>Form ID: #{selectedForm.id} • Submitted on {parseAsUTC(selectedForm.createdAt)?.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) || 'N/A'}</p>
                </div>
                <button className="bpo-modal-close" onClick={() => setSelectedForm(null)}>×</button>
              </div>

              <div className="bpo-modal-body">
                {/* Core Details Section */}
                <div className="detail-section">
                  <div className="detail-section-title">🏢 Core Vendor Details</div>
                  <div className="detail-grid">
                    <div className="detail-field">
                      <label>Owner Name</label>
                      <div className="value">{selectedForm.vendorName}</div>
                    </div>
                    <div className="detail-field">
                      <label>Vendor Type</label>
                      <div className="value">{selectedForm?.vendorType ?? "N/A"}</div>
                    </div>
                    <div className="detail-field">
                      <label>Contact Number</label>
                      <div className="value">{selectedForm.contactNumber}</div>
                    </div>
                    <div className="detail-field">
                      <label>Email Address</label>
                      <div className="value">{selectedForm.mailId || "N/A"}</div>
                    </div>
                  </div>
                </div>

                {/* Address Section */}
                <div className="detail-section">
                  <div className="detail-section-title">📍 Address & Location</div>
                  <div className="detail-grid">
                    <div className="detail-field detail-field--full">
                      <label>Complete Address</label>
                      <div className="value">
                        {selectedForm.doorNumber}, {selectedForm.streetName}, {selectedForm.areaName}, {selectedForm.district}, {selectedForm.state} - {selectedForm.pinCode}
                      </div>
                    </div>
                    <div className="detail-field">
                      <label>Mapped Location</label>
                      <div className="value">{selectedForm.vendorLocation || "N/A"}</div>
                    </div>
                    <div className="detail-field">
                    </div>
                  </div>
                </div>

                {/* Team Section */}
                <div className="detail-section">
                  <div className="detail-section-title">👥 Assignment Hierarchy</div>
                  <div className="detail-grid">
                    <div className="detail-field">
                      <label>Executive Name</label>
                      <div className="value">{selectedForm.executiveName}</div>
                    </div>
                    <div className="detail-field">
                      <label>Team Lead</label>
                      <div className="value">{selectedForm.teamleadName}</div>
                    </div>
                  </div>
                </div>

                {/* Status Section */}
                <div className="detail-section">
                  <div className="detail-section-title">📊 Status & Tags</div>
                  <div className="detail-grid">
                    <div className="detail-field">
                      <label>Current Status</label>
                      <div className="value">
                        <span className={`status-badge status--${selectedForm.status?.toLowerCase().replace('_', '-')}`}>
                          {selectedForm.status}
                        </span>
                      </div>
                    </div>
                    <div className="detail-field">
                      <label>Priority Tag</label>
                      <div className="value">{selectedForm.tag || "NONE"}</div>
                    </div>
                  </div>
                </div>

                {/* Reviews Section */}
                {(selectedForm.executiveReview || selectedForm.vendorReview || selectedForm.review) && (
                  <div className="detail-section">
                    <div className="detail-section-title">💬 Review History</div>
                    <div className="detail-grid">
                      {selectedForm.executiveReview && (
                        <div className="detail-field detail-field--full">
                          <div className="review-card">
                            <span className="author">Executive Review</span>
                            <p>"{selectedForm.executiveReview}"</p>
                          </div>
                        </div>
                      )}
                      {selectedForm.vendorReview && (
                        <div className="detail-field detail-field--full">
                          <div className="review-card">
                            <span className="author">Vendor Review</span>
                            <p>"{selectedForm.vendorReview}"</p>
                          </div>
                        </div>
                      )}
                      {selectedForm.review && (
                        <div className="detail-field detail-field--full">
                          <div className="review-card">
                            <span className="author">Executive Comments</span>
                            <p>"{selectedForm.review}"</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="bpo-modal-footer">
                <button
                  className="bpo-btn-primary"
                  onClick={(e) => {
                    setSelectedForm(null);
                    handleOpenReviewModal(selectedForm, e);
                  }}
                >
                  ✎ Add Manual Review
                </button>
                <button className="bpo-btn-ghost" onClick={() => setSelectedForm(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Review Modal */}
        {showReviewModal && selectedFormForReview && (
          <div className="bpo-modal-overlay" onClick={handleCloseReviewModal}>
            <div
              className="bpo-modal-container review-modal-container"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bpo-modal-header">
                <div className="modal-header-info">
                  <h2>Submit Manual Review</h2>
                  <p>Form #{selectedFormForReview.id} — {selectedFormForReview.vendorShopName}</p>
                </div>
                <button className="bpo-modal-close" onClick={handleCloseReviewModal}>×</button>
              </div>

              <div className="bpo-modal-body">
                {/* Form Info Summary */}
                <div className="form-info-summary">
                  <div className="info-chip">
                    <span className="info-label">Vendor:</span>
                    <span className="info-value">{selectedFormForReview.vendorName}</span>
                  </div>
                  <div className="info-chip">
                    <span className="info-label">Contact:</span>
                    <span className="info-value">{selectedFormForReview.contactNumber}</span>
                  </div>
                  <div className="info-chip">
                    <span className="info-label">Current Status:</span>
                    <span className={`status ${selectedFormForReview.status}`}>
                      {selectedFormForReview.status}
                    </span>
                  </div>
                </div>



                {/* Error Message */}
                {submitError && (
                  <div className="alert alert-error">
                    <span className="alert-icon">⚠️</span>
                    {submitError}
                  </div>
                )}

                {/* ID Number */}
                <div className="bpo-form-group">
                  <label className="bpo-form-label">
                    BPO ID Number <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className="bpo-filter-input"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                    placeholder="Enter ID Number"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                {/* BPO Name */}
                <div className="bpo-form-group">
                  <label className="bpo-form-label">
                    BPO Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className="bpo-filter-input"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                    placeholder="Enter BPO Name"
                    value={bpoName}
                    onChange={(e) => {
                      const cleanedValue = e.target.value.replace(/[^A-Za-z\s]/g, "");
                      setBpoName(cleanedValue);
                    }}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Executive Review */}
                <div className="bpo-form-group review-field-group">
                  <label className="bpo-form-label">
                    Executive Review <span className="required">*</span>
                  </label>
                  <div className="textarea-wrapper">
                    <textarea
                      className="form-textarea premium-textarea"
                      rows="4"
                      placeholder="Enter detailed performance review for the executive..."
                      value={executiveReview}
                      onChange={(e) => setExecutiveReview(e.target.value)}
                      disabled={isSubmitting}
                    />
                    <div className="character-count">
                      {executiveReview.length} chars
                    </div>
                  </div>
                </div>

                {/* Vendor Review */}
                <div className="bpo-form-group review-field-group">
                  <label className="bpo-form-label">
                    Vendor Review <span className="required">*</span>
                  </label>
                  <div className="textarea-wrapper">
                    <textarea
                      className="form-textarea premium-textarea"
                      rows="4"
                      placeholder="Enter vendor feedback and response details..."
                      value={vendorReview}
                      onChange={(e) => setVendorReview(e.target.value)}
                      disabled={isSubmitting}
                    />
                    <div className="character-count">
                      {vendorReview.length} chars
                    </div>
                  </div>
                </div>
                 {/* Onboarding Readiness */}
                <div className="bpo-form-group">
                  <label className="bpo-form-label">
                    Onboarding Readiness <span className="required">*</span>
                  </label>
                  <select
                    className="bpo-filter-input"
                    value={vendorReady ? "READY" : "NOT_READY"}
                    onChange={(e) => {
                      setVendorReady(e.target.value === "READY");
                      if (e.target.value !== "READY") setOnboardInDays(0);
                    }}
                    disabled={isSubmitting}
                  >
                    <option value="NOT_READY">Not ready to onboard</option>
                    <option value="READY">Ready to onboard</option>
                  </select>
                </div>

                {/* Onboard In Days (Conditional) */}
                {vendorReady && (
                  <div className="bpo-form-group">
                    <label className="bpo-form-label">
                      How many days he wants to onboard <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      className="bpo-filter-input"
                      placeholder="Enter number of days"
                      value={onboardInDays}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setOnboardInDays(val);
                      }}
                      disabled={isSubmitting}
                    />
                  </div>
                )}
                {/* Action Selection */}
                <div className="bpo-form-group action-selection-group">
                  <label className="bpo-form-label">
                    Review Outcome <span className="required">*</span>
                  </label>
                  <div className="premium-action-buttons">
                    <button
                      type="button"
                      className={`premium-action-btn solved ${selectedAction === "SOLVED" ? 'active' : ''}`}
                      onClick={() => setSelectedAction("SOLVED")}
                      disabled={isSubmitting}
                    >
                      <span className="action-icon">✓</span> SOLVED
                    </button>
                    <button
                      type="button"
                      className={`premium-action-btn not-solved ${selectedAction === "NOT SOLVED" ? 'active' : ''}`}
                      onClick={() => setSelectedAction("NOT SOLVED")}
                      disabled={isSubmitting}
                    >
                      <span className="action-icon">✗</span> NOT SOLVED
                    </button>
                  </div>
                </div>

               

                {/* Preview Section */}
                {(idNumber || bpoName || executiveReview || vendorReview) && (
                  <div className="bpo-review-preview">
                    <h4>Preview</h4>
                    <div className="bpo-preview-content">
                      {idNumber && (
                        <div className="bpo-preview-item">
                          <strong>ID Number:</strong>
                          <p>{idNumber}</p>
                        </div>
                      )}
                      {bpoName && (
                        <div className="bpo-preview-item">
                          <strong>BPO Name:</strong>
                          <p>{bpoName}</p>
                        </div>
                      )}
                      {executiveReview && (
                        <div className="bpo-preview-item">
                          <strong>Executive Review:</strong>
                          <p>{executiveReview}</p>
                        </div>
                      )}
                      {vendorReview && (
                        <div className="bpo-preview-item">
                          <strong>Vendor Review:</strong>
                          <p>{vendorReview}</p>
                        </div>
                      )}
                      <div className="bpo-preview-item">
                        <strong>Ready to Onboard:</strong>
                        <p>{vendorReady ? "Yes" : "No"}</p>
                      </div>
                      {vendorReady && (
                        <div className="bpo-preview-item">
                          <strong>Onboard in Days:</strong>
                          <p>{onboardInDays}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="bpo-modal-footer">
                <button
                  className="bpo-btn-ghost"
                  onClick={handleCloseReviewModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  className="bpo-btn-primary"
                  onClick={handleReviewSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Submit BPO Review"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL 1: APPROVED REQUESTS LIST ── */}
        {showApprovedModal && (
          <div className="bpo-modal-overlay bpo-modal--resubmission" onClick={() => setShowApprovedModal(false)}>
            <div className="bpo-modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="bpo-modal-header">
                <div className="modal-header-info">
                  <h2>Approved BPO Requests</h2>
                  <p>Forms waiting for your resubmission ({approvedRequests.length})</p>
                </div>
                <button className="bpo-modal-close" onClick={() => setShowApprovedModal(false)}>×</button>
              </div>

              <div className="bpo-modal-body">
                {isFetchingApproved ? (
                  <div className="bpo-empty-state">
                    <div className="loading-spinner"></div>
                    <p>Fetching approved forms...</p>
                  </div>
                ) : approvedRequests.length === 0 ? (
                  <div className="bpo-empty-state">
                    <span className="bpo-empty-state-icon">✅</span>
                    <p className="bpo-empty-state-title">All Caught Up!</p>
                    <p className="bpo-empty-state-sub">No resubmissions pending at the moment.</p>
                  </div>
                ) : (
                  <div className="bpo-approved-grid">
                    {approvedRequests.map(req => (
                      <div key={req.id} className="resubmission-card">
                        <div className="card-header">
                          <span className="card-id">#{req.id}</span>
                          <span className="status-badge status--pending">Needs Edit</span>
                        </div>
                        <h3 className="shop-name">🏪 {req.vendorShopName || 'Unnamed Shop'}</h3>

                        <div className="reasons-container">
                          <div className="reason-block">
                            <strong>Original Request:</strong>
                            <p>{req.resendReason || "N/A"}</p>
                          </div>
                          <div className="reason-block manager-feedback">
                            <strong>Manager Review:</strong>
                            <p>{req.review || "N/A"}</p>
                          </div>
                        </div>

                        <div className="card-footer">
                          <span className="date">📅 {parseAsUTC(req.createdAt)?.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) || 'N/A'}</span>
                          <button
                            className="bpo-btn-primary"
                            onClick={() => handleEditRequest(req)}
                            style={{ padding: '8px 16px', fontSize: '0.8125rem' }}
                          >
                            ✎ Edit Data
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL 2: EDIT & RESUBMIT FORM ── */}
        {editingRequest && editFormData && (
          <div className="bpo-modal-overlay" onClick={() => setEditingRequest(null)}>
            <div className="bpo-modal-container bpo-modal--large" onClick={(e) => e.stopPropagation()}>
              <div className="bpo-modal-header">
                <div className="modal-header-info">
                  <h2>Edit & Resubmit BPO Data</h2>
                  <p>Form #{editingRequest.id} — Feedback: {editingRequest.resendReason || "N/A"}</p>
                </div>
                <button
                  className="bpo-modal-close"
                  onClick={() => setEditingRequest(null)}
                  disabled={isResubmitting}
                >
                  ×
                </button>
              </div>

              <div className="bpo-modal-body">
                <div className="bpo-edit-form">
                  <div className="bpo-edit-section">
                    <h4>🏢 Core Vendor Details</h4>
                    <div className="bpo-edit-grid">
                      <div className="bpo-form-group">
                        <label>Shop Name*</label>
                        <input name="vendorShopName" value={editFormData.vendorShopName} onChange={handleEditChange} placeholder="Enter shop name" />
                      </div>
                      <div className="bpo-form-group">
                        <label>Owner Name*</label>
                        <input name="vendorName" value={editFormData.vendorName} onChange={handleEditChange} placeholder="Enter owner name" />
                      </div>
                      <div className="bpo-form-group">
                        <label>Contact Number</label>
                        <input name="contactNumber" value={editFormData.contactNumber} onChange={handleEditChange} placeholder="Enter contact" />
                      </div>
                      <div className="bpo-form-group">
                        <label>Email Address</label>
                        <input name="mailId" value={editFormData.mailId} onChange={handleEditChange} placeholder="Enter email" />
                      </div>
                      <div className="bpo-form-group">
                        <label>Vendor Type</label>
                        <input name="vendorType" value={editFormData.vendorType} onChange={handleEditChange} placeholder="Enter type" />
                      </div>
                    </div>
                  </div>

                  <div className="bpo-edit-section">
                    <h4>📍 Address Information</h4>
                    <div className="bpo-edit-grid">
                      <div className="bpo-form-group">
                        <label>Door Number</label>
                        <input name="doorNumber" value={editFormData.doorNumber} onChange={handleEditChange} placeholder="Door #" />
                      </div>
                      <div className="bpo-form-group">
                        <label>Street Name</label>
                        <input name="streetName" value={editFormData.streetName} onChange={handleEditChange} placeholder="Street" />
                      </div>
                      <div className="bpo-form-group">
                        <label>Area Name</label>
                        <input name="areaName" value={editFormData.areaName} onChange={handleEditChange} placeholder="Area" />
                      </div>
                      <div className="bpo-form-group">
                        <label>PIN Code</label>
                        <input name="pinCode" value={editFormData.pinCode} onChange={handleEditChange} placeholder="PIN" />
                      </div>
                      <div className="bpo-form-group">
                        <label>State</label>
                        <input name="state" value={editFormData.state} onChange={handleEditChange} placeholder="State" />
                      </div>
                      <div className="bpo-form-group">
                        <label>District</label>
                        <input name="district" value={editFormData.district} onChange={handleEditChange} placeholder="District" />
                      </div>
                    </div>
                  </div>

                  <div className="bpo-edit-section">
                    <h4>🌍 Location Metadata</h4>
                    <div className="bpo-edit-grid">
                      <div className="bpo-form-group">
                        <label>Latitude</label>
                        <input name="latitude" value={editFormData.latitude} onChange={handleEditChange} placeholder="Lat" />
                      </div>
                      <div className="bpo-form-group">
                        <label>Longitude</label>
                        <input name="longitude" value={editFormData.longitude} onChange={handleEditChange} placeholder="Long" />
                      </div>
                      <div className="bpo-form-group">
                        <label>Mapped Location</label>
                        <input name="vendorLocation" value={editFormData.vendorLocation} onChange={handleEditChange} placeholder="Coordinates" />
                      </div>
                    </div>
                  </div>

                  <div className="bpo-edit-section">
                    <h4>✍️ BPO Review Details</h4>
                    <div className="bpo-edit-grid">
                      <div className="bpo-form-group">
                        <label>ID Number*</label>
                        <input name="idNumber" value={editFormData.idNumber} onChange={handleEditChange} placeholder="ID #" />
                      </div>
                      <div className="bpo-form-group">
                        <label>BPO Name*</label>
                        <input name="bpoName" value={editFormData.bpoName} onChange={handleEditChange} placeholder="BPO Name" />
                      </div>
                      <div className="bpo-form-group">
                        <label>Action Update</label>
                        <select name="action" value={editFormData.action} onChange={handleEditChange} className="bpo-action-select">
                          <option value="SOLVED">SOLVED</option>
                          <option value="NOT SOLVED">NOT SOLVED</option>
                        </select>
                      </div>
                    </div>
                    <div className="bpo-edit-grid bpo-edit-grid--full" style={{ marginTop: '20px' }}>
                      <div className="bpo-form-group">
                        <label>Executive Review Update*</label>
                        <textarea
                          name="executiveReview"
                          value={editFormData.executiveReview}
                          onChange={handleEditChange}
                          rows="3"
                          placeholder="Update executive review..."
                        />
                      </div>
                      <div className="bpo-form-group">
                        <label>Vendor Review Update*</label>
                        <textarea
                          name="vendorReview"
                          value={editFormData.vendorReview}
                          onChange={handleEditChange}
                          rows="3"
                          placeholder="Update vendor review..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bpo-modal-footer">
                <button
                  className="bpo-btn--secondary"
                  style={{ padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                  onClick={() => setEditingRequest(null)}
                  disabled={isResubmitting}
                >
                  Cancel
                </button>
                <button
                  className="bpo-btn--success"
                  style={{ padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                  onClick={handleUpdateAndResubmit}
                  disabled={isResubmitting}
                >
                  {isResubmitting ? "Resubmitting..." : "Resubmit BPO Data"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default BpoDashBoard;