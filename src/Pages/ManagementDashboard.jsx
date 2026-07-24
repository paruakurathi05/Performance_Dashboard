import React, { useState, useEffect } from 'react';
import MainLayout from '../components/common/Layout/MainLayout';
import axios from 'axios';
import { managerService } from '../Services/manager.service';
import ReportModal from '../components/Management/ReportModal';
import AttendanceDownloader from './AttendanceDownloader';
import { parseAsUTC, getIstTodayKey, shiftDateKey, resolveDateKey } from '../utils/helpers';
import { DATE_FIELDS } from '../Services/report.service';
import './ManagementDashboard.css';
import {toast } from "react-toastify";

const ManagementDashboard = ({ user, logout }) => {
  const dashboardUser = user || JSON.parse(localStorage.getItem('user'));
const [showReportModal, 
  setShowReportModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceUserCode, setAttendanceUserCode] = useState('');
  const [attendanceStartDate, setAttendanceStartDate] = useState('');
  const [attendanceEndDate, setAttendanceEndDate] = useState('');
  const [bpoForms, setBpoForms] = useState([]);
  const [executiveForms, setExecutiveForms] = useState([]);
  const [activeTab, setActiveTab] = useState('BPO_RESOLVED'); // 'BPO_RESOLVED' | 'EXECUTIVE'
  const [filteredForms, setFilteredForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);

  // Derived state for the currently active tab's forms
  const forms = activeTab === 'BPO_RESOLVED' ? bpoForms : executiveForms;

  // A BPO-resolved row is dated by when the BPO actioned it; an executive row by
  // when it was created. Shared by the on-page filter and the report download so
  // the two can never disagree about what "today" means.
  const activeDateFields = activeTab === 'BPO_RESOLVED'
    ? DATE_FIELDS.bpoResolved
    : DATE_FIELDS.executive;

  // ── Requests Feature State ────────────────────────────────────────────────
  const [editRequests, setEditRequests] = useState([]);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'ACCEPT'|'REJECT', request: obj }
  const [isProcessingRequest, setIsProcessingRequest] = useState(false);

  // ── BPO Requests Feature State ────────────────────────────────────────────
  const [bpoRequests, setBpoRequests] = useState([]);
  const [requestViewMode, setRequestViewMode] = useState('EXECUTIVE'); // 'EXECUTIVE' | 'BPO'

  // Fetch all forms & requests
  useEffect(() => {
    fetchAllForms();
    fetchRequests();
    fetchBpoRequests();
  }, []);

  const fetchAllForms = async () => {
    try {
      setLoading(true);
      // Fetch BPO resolved forms
      const bpoResponse = await axios.get(
        "https://performance-dashboard-be.onrender.com/api/data/forms",
        {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true 
        }
      );

      // Fetch Executive forms
      let execData = [];
      try {
        execData = await managerService.getExecutiveForms();
      } catch (err) {
        console.error("Error fetching executive forms:", err);
      }

      console.log("BPO Forms:", bpoResponse.data);
      console.log("Executive Forms:", execData);
      
      const bpoFormsData = Array.isArray(bpoResponse.data) ? bpoResponse.data : [];
      const execFormsData = Array.isArray(execData) ? execData : [];
      
      setBpoForms(bpoFormsData);
      setExecutiveForms(execFormsData);
      setError(null);
    } catch (error) {
      console.error("Error fetching forms:", error);
      setError("Failed to load data. Please try again.");
      setBpoForms([]);
      setExecutiveForms([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      const response = await managerService.getRequests();
      console.log("get request from manager dashboard",response);
      setEditRequests(response || []);
    } catch (error) {
      console.error("Error fetching edit requests:", error);
    }
  };

  const fetchBpoRequests = async () => {
    try {
      const response = await managerService.getBpoRequests();
      console.log("get BPO requests from manager dashboard", response);
      setBpoRequests(response || []);
    } catch (error) {
      console.error("Error fetching BPO edit requests:", error);
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...forms];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(form => 
        form.vendorShopName?.toLowerCase().includes(term) ||
        form.vendorName?.toLowerCase().includes(term) ||
        form.executiveName?.toLowerCase().includes(term) ||
        form.teamleadName?.toLowerCase().includes(term) ||
        form.areaName?.toLowerCase().includes(term) ||
        form.contactNumber?.includes(term)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(form => form.status === statusFilter);
    }

    // Apply team filter (by teamlead)
    if (teamFilter !== 'all') {
      filtered = filtered.filter(form => form.teamleadName === teamFilter);
    }

    // Apply date range filter — compared as "YYYY-MM-DD" keys in IST, against the
    // timestamp that actually matters for the active tab (see activeDateFields).
    if (dateRange !== 'all') {
      const todayKey = getIstTodayKey();

      let rangeStart = null;
      let rangeEnd = todayKey;

      if (dateRange === 'today') {
        rangeStart = todayKey;
      } else if (dateRange === 'week') {
        rangeStart = shiftDateKey(todayKey, { days: -7 });
      } else if (dateRange === 'month') {
        rangeStart = shiftDateKey(todayKey, { months: -1 });
      } else if (dateRange === 'custom') {
        rangeStart = startDate || null;
        rangeEnd = endDate || null;
      }

      if (rangeStart || rangeEnd) {
        filtered = filtered.filter(form => {
          const key = resolveDateKey(form, activeDateFields);
          if (!key) return false;
          if (rangeStart && key < rangeStart) return false;
          if (rangeEnd && key > rangeEnd) return false;
          return true;
        });
      }
    }

    setFilteredForms(filtered);
  }, [searchTerm, statusFilter, teamFilter, dateRange, startDate, endDate, forms, activeDateFields]);

  // Get unique team leads for filter
  const teamLeads = [...new Set(forms.map(form => form.teamleadName).filter(Boolean))];

  // Get unique executives for stats
  const executives = [...new Set(forms.map(form => form.executiveId))];

  // Calculate statistics
  const stats = {
    total: forms.length,
    interested: forms.filter(f => f.status === 'INTERESTED').length,
    onboarded: forms.filter(f => f.status === 'ONBOARDED').length,
    notInterested: forms.filter(f => f.status === 'NOT_INTERESTED').length,
    totalExecutives: executives.length,
    totalTeamLeads: teamLeads.length
  };

  // Format date
  const formatDate = (dateString) => {
    const date = parseAsUTC(dateString);
    return date ? date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata'
    }) : '—';
  };

  // Get status badge style
  const getStatusBadge = (status) => {
    const styles = {
      'INTERESTED': { background: '#dcfce7', color: 'black', label: 'Interested' },
      'ONBOARDED': { background: '#dbeafe', color: 'black', label: 'Onboarded' },
      'NOT_INTERESTED': { background: '#fee2e2', color: 'black', label: 'Not Interested' }
    };
    const style = styles[status] || { background: '#f1f5f9', color: '#475569', label: status };
    
    return (
      <span className="badge" style={{ backgroundColor: style.background, color: style.color }}>
        {style.label}
      </span>
    );
  };

  // Get tag badge style
  const getTagBadge = (tag) => {
    const styles = {
      'GREEN': { background: '#dcfce7', color: '#166534' },
      'ORANGE': { background: '#ffedd5', color: '#9a3412' },
      'YELLOW': { background: '#fef9c3', color: '#854d0e' },
      'RED': { background: '#fee2e2', color: '#991b1b' }
    };
    const style = styles[tag] || { background: '#f1f5f9', color: '#475569' };
    
    return (
      <span className="badge tag-badge" style={{ backgroundColor: style.background, color: style.color }}>
        {tag || 'N/A'}
      </span>
    );
  };

  const toggleRowExpand = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  // ── Requests Flow Functions ───────────────────────────────────────────────
  const handleRequestAction = (type, request) => {
    setConfirmAction({ type, request });
  };

  const cancelRequestAction = () => {
    setConfirmAction(null);
  };

  const confirmRequestAction = async () => {
    if (!confirmAction) return;

    const { type, request } = confirmAction;
    setIsProcessingRequest(true);

    try {
      if (requestViewMode === 'EXECUTIVE') {
        if (type === 'ACCEPT') {
          await managerService.approveRequest(request.id);
          toast.success("Request approved successfully.");
        } else if (type === 'REJECT') {
          await managerService.rejectRequest(request.id);
          toast.error("Request rejected successfully.");
        }
      } else if (requestViewMode === 'BPO') {
        if (type === 'ACCEPT') {
          await managerService.approveBpoRequest(request.id, { approved: true });
          toast.success("BPO Request approved successfully.");
        } else if (type === 'REJECT') {
          // Note: If backend doesn't support reject for BPO, you could alert or handle differently.
          // Assuming reject is not fully supported for BPO yet based on provided APIs
          toast.warning("Rejection is not currently supported for BPO requests via the API.");
          setIsProcessingRequest(false);
          setConfirmAction(null);
          return;
        }
      }

      // Close confirm and detail modal
      setConfirmAction(null);
      setSelectedRequest(null);
      
      // Refresh requests and forms
      fetchRequests();
      fetchBpoRequests();
      fetchAllForms();

      // Close list modal if no requests left in current view tab
      const currentListLength = requestViewMode === 'EXECUTIVE' ? editRequests.length : bpoRequests.length;
      if (currentListLength <= 1) {
        setShowRequestsModal(false);
      }
    } catch (err) {
      console.error(`Failed to ${type.toLowerCase()} request:`, err);
      toast.error(`Failed to ${type.toLowerCase()} request. Please try again.`);
    } finally {
      setIsProcessingRequest(false);
    }
  };

  const handleRefresh = () => {
    fetchAllForms();
    fetchRequests();
    fetchBpoRequests();
  };

  return (
    <MainLayout user={dashboardUser} logout={logout}>
      <div className="management-dashboard">
        {/* Header */}
        <div className="card header-card">
          <div className="header-content">
            <div className='header-left'>
              <h1>Management Dashboard</h1>
              {/* <p className="text-muted">
                Consolidated view of all field operations • {forms.length} total entries
              </p> */}
                <button 
                className="btn btn-success" 
                onClick={() => setShowReportModal(true)}
                disabled={loading}
              >
                📊 Generate Report
              </button>
            </div>
             
            <div className="header-actions">
              <button 
                className="btn btn-attendance" 
                onClick={() => setShowAttendanceModal(true)}
              >
                📋 Attendance
              </button>
              <button 
                className="btn btn-requests" 
                onClick={() => setShowRequestsModal(true)}
              >
                Requests {(editRequests.length > 0 || bpoRequests.length > 0) && (
                  <span className="badge-notification">{editRequests.length + bpoRequests.length}</span>
                )}
              </button>
              <button 
                onClick={handleRefresh} 
                className="btn btn-primary" 
                disabled={loading}
              >
                {loading ? 'Refreshing...' : 'Refresh Data'}
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="card error-card">
            <p>{error}</p>
            <button onClick={handleRefresh} className="btn btn-outline">
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="card loading-card">
            <div className="loader"></div>
            <p>Loading dashboard data...</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Statistics Cards */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value" style={{color:'black'}}>{stats.total}</div>
                <div className="stat-label" style={{color:'black'}}>Total Entries</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{color:'black'}}>{stats.totalExecutives}</div>
                <div className="stat-label" style={{color:'black'}}>Executives</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{color:'black'}}>{stats.totalTeamLeads}</div>
                <div className="stat-label" style={{color:'black'}}>Team Leads</div>
              </div>
            </div>

            {/* Dashboard Tabs switcher */}
            <div className="dashboard-tabs">
              <button 
                className={`dashboard-tab ${activeTab === 'BPO_RESOLVED' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('BPO_RESOLVED');
                  setExpandedRow(null);
                }}
              >
                📥 BPO Resolved Forms
                <span className="tab-count-badge">{bpoForms.length}</span>
              </button>
              <button 
                className={`dashboard-tab ${activeTab === 'EXECUTIVE' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('EXECUTIVE');
                  setExpandedRow(null);
                }}
              >
                👷 Executive Submissions
                <span className="tab-count-badge">{executiveForms.length}</span>
              </button>
            </div>

            {/* Filters */}
            <div className="card filters-card">
              
              <div className="filters-grid">
                <input
                  type="text"
                  placeholder="Search by shop, vendor, executive..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="filter-input"
                />


                <select 
                  value={teamFilter}
                  onChange={(e) => setTeamFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Team Leads</option>
                  {teamLeads.map(lead => (
                    <option key={lead} value={lead}>{lead}</option>
                  ))}
                </select>

                <select 
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                  <option value="custom">Custom Range</option>
                </select>

                {dateRange === 'custom' && (
                  <>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="filter-input"
                      placeholder="Start Date"
                      title="Start Date"
                    />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="filter-input"
                      placeholder="End Date"
                      title="End Date"
                    />
                  </>
                )}

                 
                {(searchTerm || statusFilter !== 'all' || teamFilter !== 'all' || dateRange !== 'all' || startDate || endDate) && (
                  <button 
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                      setTeamFilter('all');
                      setDateRange('all');
                      setStartDate('');
                      setEndDate('');
                    }}
                    className="btn btn-outline"
                  >
                    Clear Filters
                  </button>
                )}
              </div>

              <div className="results-count">
                Showing {filteredForms.length} of {forms.length} entries
              </div>
            </div>

            {/* Unified Card View */}
            <div className="mgmt-grid">
              {filteredForms.map(form => (
                <div 
                  key={form.id} 
                  className="mgmt-card"
                  onClick={() => toggleRowExpand(form.id)}
                >
                  <div className="mgmt-card-header">
                    <h3 className="mgmt-shop-name">{form.vendorShopName || 'Unnamed Shop'}</h3>
                    <div className="mgmt-badges">
                      {getStatusBadge(form.status)}
                      {getTagBadge(form.tag)}
                    </div>
                  </div>
                  
                  <div className="mgmt-card-body">
                    <p className="mgmt-vendor-name">{form.vendorName || 'No Vendor Name'}</p>
                    <div className="mgmt-card-meta">
                      <span>👤 {form.executiveName || `ID: ${form.executiveId}`}</span>
                      <span>📍 {form.areaName || 'N/A'}, {form.state}</span>
                      <span>📅 {formatDate(form.createdAt)}</span>
                    </div>
                  </div>
                  
                  <div className="mgmt-card-footer">
                    <span className="mgmt-view-btn">View Details &rarr;</span>
                  </div>
                </div>
              ))}

              {filteredForms.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">📊</div>
                  <h3>No Forms Found</h3>
                  <p>Try adjusting your search or filters to find what you're looking for.</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── DETAIL MODAL (Manager View) ── */}
        {expandedRow && (
          <div className="mgmt-detail-modal-overlay" onClick={() => setExpandedRow(null)}>
            <div className="mgmt-detail-modal-content" onClick={e => e.stopPropagation()}>
              
              {/* Detail Header */}
              {forms.filter(f => f.id === expandedRow).map(form => (
                <React.Fragment key={`detail-${form.id}`}>
                  <div className="mgmt-detail-header">
                    <div>
                      <h2>{form.vendorShopName || 'Unnamed Shop'}</h2>
                      <p className="text-muted">ID: {form.id} • Submitted: {formatDate(form.createdAt)}</p>
                    </div>
                    <button className="mgr-close-btn" onClick={() => setExpandedRow(null)}>×</button>
                  </div>

                  {/* Detail Body */}
                  <div className="mgmt-detail-body">
                    
                    {/* Status & Tags Strip */}
                    <div className="mgmt-detail-strip">
                      <div className="strip-item">
                        <span className="strip-label">Status</span>
                        {getStatusBadge(form.status)}
                      </div>
                      <div className="strip-item">
                        <span className="strip-label">Priority Tag</span>
                        {getTagBadge(form.tag)}
                      </div>
                      <div className="strip-item">
                        <span className="strip-label">Solved</span>
                        <span className="info-value">{form.solved !== null ? (form.solved ? '✅ Yes' : '❌ No') : 'N/A'}</span>
                      </div>
                    </div>

                    <div className="mgmt-detail-grid">
                      {/* Left Column: Vendor & Contact */}
                      <div className="mgmt-detail-section">
                        <h3>Vendor Information</h3>
                        <div className="mgmt-detail-row">
                          <span className="detail-label">Owner Name</span>
                          <span className="detail-value">{form.vendorName || 'N/A'}</span>
                        </div>
                        <div className="mgmt-detail-row">
                          <span className="detail-label">Contact Number</span>
                          <span className="detail-value">{form.contactNumber || 'N/A'}</span>
                        </div>
                        <div className="mgmt-detail-row">
                          <span className="detail-label">Email Address</span>
                          <span className="detail-value">{form.mailId || 'N/A'}</span>
                        </div>
                      </div>

                      {/* Right Column: Hierarchy */}
                      <div className="mgmt-detail-section">
                        <h3>Executive & Team</h3>
                        <div className="mgmt-detail-row">
                          <span className="detail-label">Executive</span>
                          <span className="detail-value">{form.executiveName || `ID: ${form.executiveId}`}</span>
                        </div>
                        <div className="mgmt-detail-row">
                          <span className="detail-label">Team Lead</span>
                          <span className="detail-value">{form.teamleadName || `ID: ${form.teamleadId}`}</span>
                        </div>
                        <div className="mgmt-detail-row">
                          <span className="detail-label">Assigned BPO Name</span>
                          <span className="detail-value">{form.bpoName || 'Not Assigned'}</span>
                        </div>
                      </div>

                      {/* Full Width: Location */}
                      <div className="mgmt-detail-section full-width">
                        <h3>Location Details</h3>
                        <div className="mgmt-detail-row-inline">
                          <span className="detail-label">Street:</span>
                          <span className="detail-value">{form.streetName || 'N/A'}</span>
                        </div>
                        <div className="mgmt-detail-row-inline">
                          <span className="detail-label">Area/City:</span>
                          <span className="detail-value">{form.areaName || 'N/A'}</span>
                        </div>
                        <div className="mgmt-detail-row-inline">
                          <span className="detail-label">District:</span>
                          <span className="detail-value">{form.district || 'N/A'}</span>
                        </div>
                        <div className="mgmt-detail-row-inline">
                          <span className="detail-label">State:</span>
                          <span className="detail-value">{form.state || 'N/A'}</span>
                        </div>
                        <div className="mgmt-detail-row-inline">
                          <span className="detail-label">PIN:</span>
                          <span className="detail-value">{form.pinCode || 'N/A'}</span>
                        </div>
                      </div>

                      {/* Full Width: Reviews & Dates */}
                      <div className="mgmt-detail-section full-width">
                        <h3>Reviews & Actions</h3>
                        {form.review && (
                          <div className="review-box">
                            <strong>General Review:</strong>
                            <p>{form.review}</p>
                          </div>
                        )}
                        {form.executiveReview && (
                          <div className="review-box">
                            <strong>Executive Review:</strong>
                            <p>{form.executiveReview}</p>
                          </div>
                        )}
                        {form.vendorReview && (
                          <div className="review-box">
                            <strong>Vendor Review:</strong>
                            <p>{form.vendorReview}</p>
                          </div>
                        )}
                        
                        <div className="action-dates">
                          <div className="date-badge">
                            <span className="date-label">BPO Action Date:</span>
                            <span>{form.bpoActionDate ? formatDate(form.bpoActionDate) : 'Pending'}</span>
                          </div>
                          <div className="date-badge">
                            <span className="date-label">Reappear Date:</span>
                            <span>{form.reappearDate ? formatDate(form.reappearDate) : 'Not Set'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* ── MODAL 1: REQUESTS LIST ── */}
        {showRequestsModal && (
          <div className="mgr-modal-overlay" onClick={() => setShowRequestsModal(false)}>
            <div className="mgr-list-modal" onClick={e => e.stopPropagation()}>
              <div className="mgr-modal-header">
                <h2>Pending Edit Requests ({requestViewMode === 'EXECUTIVE' ? editRequests.length : bpoRequests.length})</h2>
                <button className="mgr-close-btn" onClick={() => setShowRequestsModal(false)}>×</button>
              </div>
              <div className="mgr-modal-body">
                {/* ── VIEW SWITCHER ── */}
                <div className="mgr-requests-tabs">
                  <button 
                    className={`mgr-tab-btn ${requestViewMode === 'EXECUTIVE' ? 'active' : ''}`}
                    onClick={() => setRequestViewMode('EXECUTIVE')}
                  >
                    Requests from Executives ({editRequests.length})
                  </button>
                  <button 
                    className={`mgr-tab-btn ${requestViewMode === 'BPO' ? 'active' : ''}`}
                    onClick={() => setRequestViewMode('BPO')}
                  >
                    Requests from BPO ({bpoRequests.length})
                  </button>
                </div>

                {(requestViewMode === 'EXECUTIVE' ? editRequests : bpoRequests).length === 0 ? (
                  <div className="empty-state">
                    <p>No pending edit requests for this category.</p>
                  </div>
                ) : (
                  <div className="mgr-requests-grid">
                    {(requestViewMode === 'EXECUTIVE' ? editRequests : bpoRequests).map(req => (
                      <div 
                        key={req.id} 
                        className="mgr-request-card"
                        onClick={() => setSelectedRequest(req)}
                      >
                        <div className="mgr-req-header">
                          <span className="mgr-req-title">{req.vendorShopName || 'Unnamed Shop'}</span>
                          <span className="mgr-req-date">{formatDate(req.createdAt)}</span>
                        </div>
                        <div className="mgr-req-subtitle">
                          {requestViewMode === 'EXECUTIVE' 
                            ? `Requested by: ${req.executiveName || 'Unknown'}` 
                            : `Requested by BPO: ${req.bpoName || 'Unknown'}`
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL 2: REQUEST DETAIL ── */}
        {selectedRequest && !confirmAction && (
          <div className="mgr-modal-overlay mgr-modal-overlay--detail" onClick={() => setSelectedRequest(null)}>
            <div className="mgr-detail-modal" onClick={e => e.stopPropagation()}>
              <div className="mgr-modal-header">
                <h2>Request Details: {selectedRequest.vendorShopName || 'Unnamed Shop'}</h2>
                <button className="mgr-close-btn" onClick={() => setSelectedRequest(null)}>×</button>
              </div>
              <div className="mgr-modal-body mgr-modal-body--scrollable">

                <div className="mgr-detail-section">
                  <h4 style={{ margin: '0 0 12px 0', color: '#334155' }}>Core Information</h4>
                  <div className="mgr-detail-grid">
                    <div className="mgr-detail-group">
                      <label>ID</label>
                      <p>#{selectedRequest.id}</p>
                    </div>
                    <div className="mgr-detail-group">
                      <label>Created At</label>
                      <p>{formatDate(selectedRequest.createdAt)}</p>
                    </div>
                    <div className="mgr-detail-group">
                      <label>Status</label>
                      <p>{selectedRequest.status || 'N/A'}</p>
                    </div>
                    <div className="mgr-detail-group">
                      <label>Tag</label>
                      <p>{selectedRequest.tag || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="mgr-detail-section">
                  <h4 style={{ margin: '0 0 12px 0', color: '#334155' }}>Vendor Details</h4>
                  <div className="mgr-detail-grid">
                    <div className="mgr-detail-group">
                      <label>Owner Name</label>
                      <p>{selectedRequest.vendorName || 'N/A'}</p>
                    </div>
                    <div className="mgr-detail-group">
                      <label>Vendor Type</label>
                      <p>{selectedRequest.vendorType || 'N/A'}</p>
                    </div>
                    <div className="mgr-detail-group">
                      <label>Contact Number</label>
                      <p>{selectedRequest.contactNumber || 'N/A'}</p>
                    </div>
                    <div className="mgr-detail-group">
                      <label>Mail ID</label>
                      <p>{selectedRequest.mailId || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="mgr-detail-section">
                  <h4 style={{ margin: '0 0 12px 0', color: '#334155' }}>Location Information</h4>
                  <div className="mgr-detail-grid">
                    <div className="mgr-detail-group">
                      <label>Street Name</label>
                      <p>{selectedRequest.streetName || 'N/A'}</p>
                    </div>
                    <div className="mgr-detail-group">
                      <label>Area Name</label>
                      <p>{selectedRequest.areaName || 'N/A'}</p>
                    </div>
                    <div className="mgr-detail-group">
                      <label>State & PIN</label>
                      <p>{selectedRequest.state || 'N/A'} {selectedRequest.pinCode || ''}</p>
                    </div>
                  </div>
                </div>

                <div className="mgr-detail-section">
                  <h4 style={{ margin: '0 0 12px 0', color: '#334155' }}>Hierarchy & Organization</h4>
                  <div className="mgr-detail-grid">
                    <div className="mgr-detail-group">
                      <label>Executive Name</label>
                      <p>{selectedRequest.executiveName || `ID: ${selectedRequest.executiveId}`}</p>
                    </div>
                    <div className="mgr-detail-group">
                      <label>Team Lead</label>
                      <p>{selectedRequest.teamleadName || `ID: ${selectedRequest.teamleadId}`}</p>
                    </div>
                    <div className="mgr-detail-group">
                      <label>Assigned BPO Name</label>
                      <p>{selectedRequest.bpoName || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="mgr-detail-section">
                  <h4 style={{ margin: '0 0 12px 0', color: '#334155' }}>Reviews & Request Intel</h4>
                  <div className="mgr-detail-grid" style={{ gridTemplateColumns: '1fr' }}>
                    <div className="mgr-detail-group">
                      <label style={{ color: '#ef4444' }}>Edit Resend Reason (from Executive)</label>
                      <p style={{ borderColor: '#ef4444', backgroundColor: '#fef2f2' }}>{selectedRequest.resendReason || 'N/A'}</p>
                    </div>
                    {/* <div className="mgr-detail-group">
                      <label>Manager Review</label>
                      <p>{selectedRequest.review || 'N/A'}</p>
                    </div> */}
                    {/* <div className="mgr-detail-group">
                      <label>Executive Review</label>
                      <p>{selectedRequest.executiveReview || 'N/A'}</p>
                    </div> */}
                    {/* <div className="mgr-detail-group">
                      <label>Vendor Review</label>
                      <p>{selectedRequest.vendorReview || 'N/A'}</p>
                    </div> */}
                    {/* <div className="mgr-detail-group">
                      <label>BPO Reason / Note</label>
                      <p>{selectedRequest.bpoReason || 'N/A'}</p>
                    </div> */}
                  </div>
                </div>

              </div>
              <div className="mgr-modal-footer">
                <button 
                  className="btn btn-danger" 
                  onClick={() => handleRequestAction('REJECT', selectedRequest)}
                >
                  Reject Edit Request
                </button>
                <button 
                  className="btn btn-success" 
                  onClick={() => handleRequestAction('ACCEPT', selectedRequest)}
                >
                  Approve Edit Request
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL 3: CONFIRM ACTION ── */}
        {confirmAction && (
          <div className="mgr-modal-overlay mgr-modal-overlay--prompt" onClick={cancelRequestAction}>
            <div className="mgr-prompt-modal" onClick={e => e.stopPropagation()}>
              <div className="mgr-prompt-header">
                <h4>Confirm {confirmAction.type === 'ACCEPT' ? 'Approval' : 'Rejection'}</h4>
                <button className="mgr-close-btn" onClick={cancelRequestAction} disabled={isProcessingRequest}>×</button>
              </div>
              <div className="mgr-prompt-body">
                <p>Are you sure you want to <strong>{confirmAction.type.toLowerCase()}</strong> this edit request?</p>
              </div>
              <div className="mgr-prompt-footer">
                <button 
                  className="btn btn-outline" 
                  onClick={cancelRequestAction}
                  disabled={isProcessingRequest}
                >
                  Cancel
                </button>
                <button 
                  className={`btn ${confirmAction.type === 'ACCEPT' ? 'btn-success' : 'btn-danger'}`}
                  onClick={confirmRequestAction}
                  disabled={isProcessingRequest}
                >
                  {isProcessingRequest ? 'Processing...' : 'Proceed'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Report Generation Modal */}
<ReportModal
  isOpen={showReportModal}
  onClose={() => setShowReportModal(false)}
  forms={forms}
  dateFields={activeDateFields}
  dateFieldLabel={activeTab === 'BPO_RESOLVED' ? 'BPO Action Date' : 'Form Created Date'}
  onGenerate={() => {
    // Optional: Show success message or refresh data
    console.log('Report generated successfully');
  }}
/>

        {/* Attendance Modal */}
        {showAttendanceModal && (
          <div className="mgr-modal-overlay" onClick={() => setShowAttendanceModal(false)}>
            <div className="mgr-list-modal" style={{ maxWidth: '800px', width: '90%' }} onClick={e => e.stopPropagation()}>
              <div className="mgr-modal-header" style={{ padding: '20px 24px' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>📅 Executive Attendance Management</h2>
                <button className="mgr-close-btn" style={{ fontSize: '1.8rem' }} onClick={() => setShowAttendanceModal(false)}>×</button>
              </div>
              <div className="mgr-modal-body" style={{ padding: '24px' }}>
                <AttendanceDownloader
                  userCode={attendanceUserCode}
                  setUsercode={setAttendanceUserCode}
                  startDate={attendanceStartDate}
                  setStartDate={setAttendanceStartDate}
                  endDate={attendanceEndDate}
                  setEndDate={setAttendanceEndDate}
                  isManagement={true}
                />
              </div>
              <div className="mgr-modal-footer">
                <button className="btn btn-outline" onClick={() => setShowAttendanceModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ManagementDashboard;