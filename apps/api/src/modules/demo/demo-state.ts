type QuestionDraft = {
  id: string;
  topic: string;
  type: string;
  difficulty: string;
  prompt: string;
  status: "draft" | "approved";
};

type ImportJob = {
  id: string;
  source: string;
  status: "preview_ready" | "importing" | "completed";
  detected: {
    students: number;
    teachers: number;
    classes: number;
    subjects: number;
    enrollments: number;
    invalidRecords: number;
  };
  progress: number;
};

const questionDrafts: QuestionDraft[] = [
  {
    id: "q-101",
    topic: "Linear equations",
    type: "Multiple choice",
    difficulty: "Medium",
    prompt: "Which operation isolates x in 3x + 6 = 21?",
    status: "draft"
  },
  {
    id: "q-102",
    topic: "Cell structure",
    type: "True / false",
    difficulty: "Easy",
    prompt: "The nucleus contains most of a cell's genetic material.",
    status: "draft"
  },
  {
    id: "q-103",
    topic: "Argument writing",
    type: "Short answer",
    difficulty: "Hard",
    prompt: "Identify the claim and supporting evidence in the paragraph.",
    status: "approved"
  }
];

const importJobs: ImportJob[] = [
  {
    id: "imp-204",
    source: "CSV upload",
    status: "preview_ready",
    detected: {
      students: 418,
      teachers: 32,
      classes: 18,
      subjects: 11,
      enrollments: 1226,
      invalidRecords: 7
    },
    progress: 0
  }
];

export const demoState = {
  getDashboard() {
    const approved = questionDrafts.filter((question) => question.status === "approved").length;
    const drafts = questionDrafts.length - approved;

    return {
      school: {
        id: "school-northview",
        name: "Northview"
      },
      metrics: [
        { label: "Students active today", value: 824, delta: "+9%" },
        { label: "Quiz completion", value: "86%", delta: "+4%" },
        { label: "Open teacher reviews", value: drafts, delta: "AI queue" },
        { label: "Import issues", value: 7, delta: "Needs review" }
      ],
      student: {
        streakDays: 12,
        xp: 2840,
        level: 8,
        dueToday: [
          { id: "task-1", title: "Linear equations", subject: "Mathematics", progress: 72 },
          { id: "task-2", title: "Photosynthesis", subject: "Science", progress: 45 },
          { id: "task-3", title: "Argument writing", subject: "English", progress: 88 }
        ],
        weakAreas: ["Fractions", "Cell transport", "Evidence selection"]
      },
      teacher: {
        drafts: questionDrafts,
        classSignals: [
          { label: "Grade 8 A", value: "Fractions", severity: "High" },
          { label: "Grade 9 B", value: "Chemical equations", severity: "Medium" }
        ]
      },
      admin: {
        imports: importJobs,
        tenantControls: ["Parent access", "Leaderboard visibility", "AI quota", "File limits"]
      },
      platform: {
        schools: 12,
        aiRequestsToday: 1840,
        estimatedAiCostUsd: 21.42,
        failedJobs: 3
      }
    };
  },

  approveQuestion(id: string) {
    const question = questionDrafts.find((candidate) => candidate.id === id);
    if (!question) {
      return undefined;
    }

    question.status = "approved";
    return question;
  },

  startImport(id: string) {
    const job = importJobs.find((candidate) => candidate.id === id);
    if (!job) {
      return undefined;
    }

    job.status = "importing";
    job.progress = Math.min(100, job.progress + 35);
    return job;
  }
};
