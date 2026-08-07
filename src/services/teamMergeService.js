// Team Data Merging & Consolidation Service

class TeamMergeService {
  constructor() {
    this.teamSubmissions = new Map(); // teamId -> Array of submissions
    this.listeners = new Set();
  }

  subscribe(callback) {
    this.listeners.add(callback);
    callback(this.getAllSubmissions());
    return () => this.listeners.delete(callback);
  }

  addSubmission(submission) {
    const { teamId } = submission;
    if (!this.teamSubmissions.has(teamId)) {
      this.teamSubmissions.set(teamId, []);
    }
    const teamList = this.teamSubmissions.get(teamId);
    
    // Check if this clue was already submitted by another team member
    const existingIndex = teamList.findIndex(s => s.clueId === submission.clueId);
    if (existingIndex >= 0) {
      // Merge attributes & keep highest precision coordinates
      const existing = teamList[existingIndex];
      teamList[existingIndex] = {
        ...existing,
        ...submission,
        mergedCount: (existing.mergedCount || 1) + 1,
        contributors: [...new Set([...(existing.contributors || [existing.submittedBy]), submission.submittedBy])],
        updatedAt: new Date().toISOString()
      };
    } else {
      teamList.push({
        ...submission,
        mergedCount: 1,
        contributors: [submission.submittedBy],
        createdAt: new Date().toISOString()
      });
    }

    this.notify();
  }

  getTeamSubmissions(teamId) {
    return this.teamSubmissions.get(teamId) || [];
  }

  getAllSubmissions() {
    const all = [];
    this.teamSubmissions.forEach((subs) => all.push(...subs));
    return all;
  }

  notify() {
    const all = this.getAllSubmissions();
    this.listeners.forEach(cb => cb(all));
  }
}

export const teamMergeService = new TeamMergeService();
