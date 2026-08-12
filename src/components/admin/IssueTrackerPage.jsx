import React, { useState, useEffect, useMemo } from 'react';

const INITIAL_BACKLOG_ITEMS = [
  {
    id: 'ISSUE-101',
    title: 'GPS Drift handling on weak mobile network connection',
    description: 'When running clue capture in low-signal areas, GPS accuracy drops to >50m, causing false out-of-bounds alerts.',
    category: 'BUG',
    severity: 'HIGH',
    priority: 'P1_HIGH',
    status: 'IN_PROGRESS',
    reporter: 'George Corea (coreagc@gmail.com)',
    upvotes: 8,
    tags: ['GPS', 'Mobile', 'Accuracy'],
    createdAt: '2026-08-10T14:20:00.000Z'
  },
  {
    id: 'ISSUE-102',
    title: 'Add GPX/KML route overlay export to Admin Planner',
    description: 'Allow course planners to export designed waypoints directly into standard GIS GPX/KML formats.',
    category: 'FEATURE',
    severity: 'MEDIUM',
    priority: 'P2_MEDIUM',
    status: 'OPEN',
    reporter: 'William Dean (william.dean@fungis.org)',
    upvotes: 14,
    tags: ['GIS', 'Export', 'KML', 'GPX'],
    createdAt: '2026-08-11T09:15:00.000Z'
  },
  {
    id: 'ISSUE-103',
    title: 'App crash when uploading >20MB photo submission',
    description: 'Submitting high resolution photos without client-side canvas compression causes memory overflow on low-end phones.',
    category: 'BUG',
    severity: 'CRITICAL',
    priority: 'P0_BLOCKER',
    status: 'OPEN',
    reporter: 'Mobile Tester',
    upvotes: 21,
    tags: ['Photo', 'Crash', 'Performance'],
    createdAt: '2026-08-11T11:00:00.000Z'
  },
  {
    id: 'ISSUE-104',
    title: 'Dark mode theme contrast improvement on Leaderboard tables',
    description: 'Text contrast ratio on secondary headers in Forest Dark mode is slightly below WCAG AAA standard.',
    category: 'UI_UX',
    severity: 'LOW',
    priority: 'P3_LOW',
    status: 'RESOLVED',
    reporter: 'UX Audit Bot',
    upvotes: 3,
    tags: ['Accessibility', 'Theme', 'CSS'],
    createdAt: '2026-08-09T18:45:00.000Z'
  }
];

const STORAGE_KEY = 'spatial_course_issue_backlog';

export default function IssueTrackerPage() {
  const [issues, setIssues] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_BACKLOG_ITEMS;
    } catch (e) {
      return INITIAL_BACKLOG_ITEMS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(issues));
    } catch (e) {
      console.error('Failed to persist issues to local storage', e);
    }
  }, [issues]);

  // Form State
  const [showLogForm, setShowLogForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'BUG',
    severity: 'MEDIUM',
    priority: 'P2_MEDIUM',
    reporter: 'George Corea (coreagc@gmail.com)',
    tags: ''
  });

  // Filter & Search State
  const [showFilters, setShowFilters] = useState(false);
  const [expandedIssueIds, setExpandedIssueIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedSeverities, setSelectedSeverities] = useState([]);
  const [selectedPriorities, setSelectedPriorities] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [sortBy, setSortBy] = useState('PRIORITY'); // PRIORITY, UPVOTES, SEVERITY, DATE

  const toggleIssueExpanded = (id) => {
    setExpandedIssueIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateIssue = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const newIssue = {
      id: `ISSUE-${Date.now().toString().slice(-4)}`,
      title: formData.title.trim(),
      description: formData.description.trim(),
      category: formData.category,
      severity: formData.severity,
      priority: formData.priority,
      status: 'OPEN',
      reporter: formData.reporter.trim() || 'Anonymous',
      upvotes: 1,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      createdAt: new Date().toISOString()
    };

    setIssues(prev => [newIssue, ...prev]);
    setFormData({
      title: '',
      description: '',
      category: 'BUG',
      severity: 'MEDIUM',
      priority: 'P2_MEDIUM',
      reporter: 'George Corea (coreagc@gmail.com)',
      tags: ''
    });
    setShowLogForm(false);
  };

  const handleUpvote = (id) => {
    setIssues(prev => prev.map(issue => {
      if (issue.id === id) {
        return { ...issue, upvotes: issue.upvotes + 1 };
      }
      return issue;
    }));
  };

  const handleStatusChange = (id, newStatus) => {
    setIssues(prev => prev.map(issue => {
      if (issue.id === id) {
        return { ...issue, status: newStatus };
      }
      return issue;
    }));
  };

  const handleDeleteIssue = (id) => {
    if (window.confirm(`Delete issue ${id}?`)) {
      setIssues(prev => prev.filter(issue => issue.id !== id));
    }
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(issues, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `spatial_course_backlog_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const toggleMultiSelect = (item, setFn) => {
    setFn(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  // Filtering & Sorting logic
  const filteredAndSortedIssues = useMemo(() => {
    return issues.filter(issue => {
      // Live search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = issue.title.toLowerCase().includes(q);
        const matchesDesc = issue.description.toLowerCase().includes(q);
        const matchesReporter = issue.reporter.toLowerCase().includes(q);
        const matchesTags = issue.tags.some(t => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDesc && !matchesReporter && !matchesTags) {
          return false;
        }
      }

      if (selectedCategories.length > 0 && !selectedCategories.includes(issue.category)) return false;
      if (selectedSeverities.length > 0 && !selectedSeverities.includes(issue.severity)) return false;
      if (selectedPriorities.length > 0 && !selectedPriorities.includes(issue.priority)) return false;
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(issue.status)) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'UPVOTES') return b.upvotes - a.upvotes;
      if (sortBy === 'DATE') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'SEVERITY') {
        const sevOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return (sevOrder[b.severity] || 0) - (sevOrder[a.severity] || 0);
      }
      // Default PRIORITY sort (P0 -> P3)
      const prioOrder = { P0_BLOCKER: 4, P1_HIGH: 3, P2_MEDIUM: 2, P3_LOW: 1 };
      return (prioOrder[b.priority] || 0) - (prioOrder[a.priority] || 0);
    });
  }, [issues, searchQuery, selectedCategories, selectedSeverities, selectedPriorities, selectedStatuses, sortBy]);

  const severityBadge = (sev) => {
    switch (sev) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-600/20 text-red-400 border border-red-500/40">CRITICAL</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/40">HIGH</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">MEDIUM</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">LOW</span>;
    }
  };

  const priorityBadge = (prio) => {
    switch (prio) {
      case 'P0_BLOCKER':
        return <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-rose-700/30 text-rose-300 border border-rose-500/50">P0 BLOCKER</span>;
      case 'P1_HIGH':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">P1 HIGH</span>;
      case 'P2_MEDIUM':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">P2 MEDIUM</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-500/20 text-slate-300 border border-slate-500/40">P3 LOW</span>;
    }
  };

  const categoryIcon = (cat) => {
    switch (cat) {
      case 'BUG': return 'bug_report';
      case 'FEATURE': return 'add_task';
      case 'ENHANCEMENT': return 'auto_awesome';
      case 'UI_UX': return 'palette';
      case 'PERFORMANCE': return 'speed';
      default: return 'label';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-theme-surface border border-theme rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-theme-primary text-3xl">bug_report</span>
            <h1 className="text-2xl font-bold tracking-tight text-theme-main">Bugs, Issues & Feature Request Backlog</h1>
          </div>
          <p className="text-sm text-theme-sub mt-1">
            Submit, grade, upvote, and filter system improvements and critical blockers for SpatialCourse Crafter.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowLogForm(!showLogForm)}
            className="px-4 py-2.5 rounded-xl bg-theme-primary text-black font-semibold hover:opacity-90 transition-all flex items-center gap-2 text-sm shadow-md"
          >
            <span className="material-symbols-outlined text-[20px]">{showLogForm ? 'close' : 'add_circle'}</span>
            <span>{showLogForm ? 'Cancel Entry' : 'Log New Issue'}</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="px-4 py-2.5 rounded-xl bg-theme-container border border-theme text-theme-main hover:bg-theme-primary/10 transition-all flex items-center gap-2 text-sm"
            title="Export backlog to JSON"
          >
            <span className="material-symbols-outlined text-[20px]">download</span>
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Form Modal/Drawer */}
      {showLogForm && (
        <form onSubmit={handleCreateIssue} className="bg-theme-surface border border-theme rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <h2 className="text-lg font-bold text-theme-main border-b border-theme pb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-theme-primary">edit_note</span>
            Log Issue or Feature Request
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase text-theme-sub mb-1">Issue Title *</label>
              <input
                type="text"
                name="title"
                required
                placeholder="e.g. Geofence radius trigger fails when offline"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-theme-container border border-theme text-theme-main text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-theme-sub mb-1">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-theme-container border border-theme text-theme-main text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary"
              >
                <option value="BUG">Bug Report</option>
                <option value="FEATURE">Feature Request</option>
                <option value="ENHANCEMENT">Enhancement</option>
                <option value="UI_UX">UI/UX Update</option>
                <option value="PERFORMANCE">Performance Issue</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-theme-sub mb-1">Severity Level</label>
              <select
                name="severity"
                value={formData.severity}
                onChange={handleInputChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-theme-container border border-theme text-theme-main text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary"
              >
                <option value="LOW">LOW - Minor visual or non-blocking</option>
                <option value="MEDIUM">MEDIUM - Standard bug or feature</option>
                <option value="HIGH">HIGH - Major functional workflow degraded</option>
                <option value="CRITICAL">CRITICAL - System crash / data risk</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-theme-sub mb-1">Criticality Priority</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-theme-container border border-theme text-theme-main text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary"
              >
                <option value="P3_LOW">P3_LOW - Minor / Nice to have</option>
                <option value="P2_MEDIUM">P2_MEDIUM - Standard priority</option>
                <option value="P1_HIGH">P1_HIGH - High priority next release</option>
                <option value="P0_BLOCKER">P0_BLOCKER - Must Fix Now</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-theme-sub mb-1">Reporter</label>
              <input
                type="text"
                name="reporter"
                value={formData.reporter}
                onChange={handleInputChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-theme-container border border-theme text-theme-main text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase text-theme-sub mb-1">Description & Reproduction Steps</label>
              <textarea
                name="description"
                rows={3}
                placeholder="Provide details, environment, expected vs actual behavior..."
                value={formData.description}
                onChange={handleInputChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-theme-container border border-theme text-theme-main text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase text-theme-sub mb-1">Tags (Comma-separated)</label>
              <input
                type="text"
                name="tags"
                placeholder="GPS, Mapbox, Sync, UI"
                value={formData.tags}
                onChange={handleInputChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-theme-container border border-theme text-theme-main text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowLogForm(false)}
              className="px-4 py-2 rounded-xl bg-theme-container border border-theme text-theme-sub hover:text-theme-main text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-theme-primary text-black font-semibold text-sm hover:opacity-90 shadow-md"
            >
              Submit Backlog Entry
            </button>
          </div>
        </form>
      )}

      {/* Filtering & Live Search Controls - Collapsible */}
      <div className="bg-theme-surface border border-theme rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Live Search */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3.5 top-2.5 text-theme-sub text-xl">search</span>
            <input
              type="text"
              placeholder="Live search by title, description, reporter, or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-theme-container border border-theme text-theme-main text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="px-3.5 py-2 rounded-xl bg-theme-container border border-theme text-theme-main text-xs font-semibold hover:bg-theme-primary/10 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">filter_list</span>
              <span>Filter Options</span>
              <span className="material-symbols-outlined text-base">{showFilters ? 'expand_less' : 'expand_more'}</span>
            </button>

            {/* Sort By */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase text-theme-sub">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 rounded-xl bg-theme-container border border-theme text-theme-main text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary"
              >
                <option value="PRIORITY">Priority Rank (P0 -&gt; P3)</option>
                <option value="UPVOTES">Most Upvoted</option>
                <option value="SEVERITY">Highest Severity</option>
                <option value="DATE">Newest First</option>
              </select>
            </div>
          </div>
        </div>

        {/* Collapsible Multi-select filter chips */}
        {showFilters && (
          <div className="space-y-2 pt-2 border-t border-theme/50 text-xs animate-in fade-in duration-200">
            {/* Categories */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-theme-sub w-20">Category:</span>
              {['BUG', 'FEATURE', 'ENHANCEMENT', 'UI_UX', 'PERFORMANCE'].map(cat => (
                <button
                  key={cat}
                  onClick={() => toggleMultiSelect(cat, setSelectedCategories)}
                  className={`px-2.5 py-1 rounded-lg border transition-all ${
                    selectedCategories.includes(cat)
                      ? 'bg-theme-primary text-black font-bold border-theme-primary'
                      : 'bg-theme-container border-theme text-theme-sub hover:text-theme-main'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Severity */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-theme-sub w-20">Severity:</span>
              {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(sev => (
                <button
                  key={sev}
                  onClick={() => toggleMultiSelect(sev, setSelectedSeverities)}
                  className={`px-2.5 py-1 rounded-lg border transition-all ${
                    selectedSeverities.includes(sev)
                      ? 'bg-theme-primary text-black font-bold border-theme-primary'
                      : 'bg-theme-container border-theme text-theme-sub hover:text-theme-main'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>

            {/* Priority */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-theme-sub w-20">Priority:</span>
              {['P0_BLOCKER', 'P1_HIGH', 'P2_MEDIUM', 'P3_LOW'].map(prio => (
                <button
                  key={prio}
                  onClick={() => toggleMultiSelect(prio, setSelectedPriorities)}
                  className={`px-2.5 py-1 rounded-lg border transition-all ${
                    selectedPriorities.includes(prio)
                      ? 'bg-theme-primary text-black font-bold border-theme-primary'
                      : 'bg-theme-container border-theme text-theme-sub hover:text-theme-main'
                  }`}
                >
                  {prio}
                </button>
              ))}
            </div>

            {/* Status */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-theme-sub w-20">Status:</span>
              {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map(status => (
                <button
                  key={status}
                  onClick={() => toggleMultiSelect(status, setSelectedStatuses)}
                  className={`px-2.5 py-1 rounded-lg border transition-all ${
                    selectedStatuses.includes(status)
                      ? 'bg-theme-primary text-black font-bold border-theme-primary'
                      : 'bg-theme-container border-theme text-theme-sub hover:text-theme-main'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Clear Filters Reset */}
        {(selectedCategories.length > 0 || selectedSeverities.length > 0 || selectedPriorities.length > 0 || selectedStatuses.length > 0 || searchQuery) && (
          <div className="flex justify-end pt-1">
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategories([]);
                setSelectedSeverities([]);
                setSelectedPriorities([]);
                setSelectedStatuses([]);
              }}
              className="text-xs text-theme-primary hover:underline flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">restart_alt</span>
              Clear All Active Filters
            </button>
          </div>
        )}
      </div>

      {/* Backlog List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm text-theme-sub px-1">
          <span>Showing <strong>{filteredAndSortedIssues.length}</strong> of {issues.length} backlog items</span>
          <span className="text-xs text-theme-sub italic">Click issue row to expand/collapse details</span>
        </div>

        {filteredAndSortedIssues.length === 0 ? (
          <div className="bg-theme-surface border border-theme rounded-2xl p-12 text-center text-theme-sub space-y-3">
            <span className="material-symbols-outlined text-5xl opacity-40">find_in_page</span>
            <p className="text-base font-medium">No matching backlog items found.</p>
            <p className="text-xs opacity-75">Try clearing filters or search terms.</p>
          </div>
        ) : (
          filteredAndSortedIssues.map(issue => {
            const isExpanded = expandedIssueIds.has(issue.id);

            return (
              <div
                key={issue.id}
                onClick={() => toggleIssueExpanded(issue.id)}
                className={`bg-theme-surface border border-theme rounded-2xl p-4 shadow-md hover:shadow-lg transition-all cursor-pointer ${
                  isExpanded ? 'ring-1 ring-theme-primary/40' : ''
                }`}
              >
                {/* Header Summary Row - Visible when collapsed */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2.5 flex-wrap flex-1 min-w-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpvote(issue.id);
                      }}
                      className="px-2 py-1 rounded-lg bg-theme-container border border-theme hover:text-theme-primary transition-colors font-bold text-xs flex items-center gap-1 shrink-0"
                      title="Upvote"
                    >
                      <span className="material-symbols-outlined text-base">thumb_up</span>
                      <span>{issue.upvotes}</span>
                    </button>

                    <span className="font-mono text-xs text-theme-sub shrink-0">{issue.id}</span>
                    {priorityBadge(issue.priority)}
                    {severityBadge(issue.severity)}
                    
                    <h3 className="text-sm font-bold text-theme-main truncate flex-1 min-w-[200px]">
                      {issue.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-theme-container text-theme-sub border border-theme">
                      {issue.status}
                    </span>
                    <span className="material-symbols-outlined text-theme-sub text-lg">
                      {isExpanded ? 'expand_less' : 'expand_more'}
                    </span>
                  </div>
                </div>

                {/* Expanded Details - Description, Reporter, Status dropdown & Delete */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-theme/50 space-y-3 animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
                    <p className="text-sm text-theme-sub leading-relaxed">{issue.description}</p>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-theme-sub pt-1">
                      <div className="flex items-center gap-4 flex-wrap">
                        <span>Reporter: <strong className="text-theme-main">{issue.reporter}</strong></span>
                        <span>Logged: {new Date(issue.createdAt).toLocaleDateString()}</span>
                        {issue.tags && issue.tags.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            {issue.tags.map(t => (
                              <span key={t} className="bg-theme-container text-theme-sub px-2 py-0.5 rounded text-[10px]">
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <label className="text-[10px] font-bold uppercase text-theme-sub">Status:</label>
                          <select
                            value={issue.status}
                            onChange={(e) => handleStatusChange(issue.id, e.target.value)}
                            className="px-2.5 py-1 rounded-lg bg-theme-container border border-theme text-theme-main text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-theme-primary cursor-pointer"
                          >
                            <option value="OPEN">OPEN</option>
                            <option value="IN_PROGRESS">IN PROGRESS</option>
                            <option value="RESOLVED">RESOLVED</option>
                            <option value="CLOSED">CLOSED</option>
                          </select>
                        </div>

                        <button
                          onClick={() => handleDeleteIssue(issue.id)}
                          className="text-theme-sub hover:text-red-400 transition-colors p-1 cursor-pointer"
                          title="Delete issue"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
