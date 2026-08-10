// Team Data Merging & Consolidation Service

// Team Data Merging & Consolidation Service (Cloud Synced)
class TeamMergeService {
  constructor() {
    this.teamSubmissions = new Map(); // teamId -> Array of submissions
    this.listeners = new Set();
    this.syncInterval = null;
  }

  subscribe(callback) {
    this.listeners.add(callback);
    this.fetchCloudSubmissions();
    if (!this.syncInterval) {
      this.syncInterval = setInterval(() => this.fetchCloudSubmissions(), 15000);
    }
    callback(this.getAllSubmissions());
    return () => {
      this.listeners.delete(callback);
      if (this.listeners.size === 0) {
        clearInterval(this.syncInterval);
        this.syncInterval = null;
      }
    };
  }

  async fetchCloudSubmissions() {
    try {
      const res = await fetch('/api/submissions');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.submissions) {
          this.teamSubmissions.clear();
          data.submissions.forEach(sub => {
            const teamId = sub.teamId;
            if (!this.teamSubmissions.has(teamId)) {
              this.teamSubmissions.set(teamId, []);
            }
            this.teamSubmissions.get(teamId).push(sub);
          });
          this.notify();
        }
      }
    } catch (e) {
      console.warn("Failed to fetch cloud submissions:", e);
    }
  }

  async addSubmission(submission, clue = null) {
    // Optimistic local add
    const { teamId } = submission;
    if (!this.teamSubmissions.has(teamId)) {
      this.teamSubmissions.set(teamId, []);
    }
    this.teamSubmissions.get(teamId).push(submission);
    this.notify();

    // Push to cloud queue
    try {
      await fetch('/api/submissions/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission, clue: clue || {} })
      });
    } catch (e) {
      console.warn("Failed to enqueue submission to cloud:", e);
    }
  }

  submitClue(submission, clue) {
    return this.addSubmission(submission, clue);
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
