"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  ClipboardList,
  Download,
  FileText,
  Flame,
  FolderOpen,
  GraduationCap,
  ListChecks,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Users,
  Wand2
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  type ActivityFeed,
  type AreteDashboard,
  type LmsOverview,
  type MigrationSource,
  type MigrationWizard,
  type Person,
  analyzeMigration,
  approveQuestion,
  commitMigration,
  createClerkSession,
  createAssignment,
  createClass,
  createMaterial,
  createMigrationWizard,
  createPerson,
  createQuiz,
  createQuizFromBank,
  createSchool,
  enrollStudent,
  fetchActivity,
  fetchDashboard,
  fetchLmsOverview,
  fetchMigrationSources,
  fetchPeople,
  generateAiDrafts,
  downloadMaterialFile,
  gradeSubmission,
  linkParent,
  login,
  markAttendance,
  markNotificationRead,
  publishQuiz,
  resetDemoData,
  seedDemoData,
  skipInvalidMigrationRows,
  submitAssignment,
  submitPracticeAttempt,
  submitQuiz,
  switchSchool,
  uploadMaterialFile,
  validateMigration,
  startImport
} from "../../lib/api";

type View = "student" | "teacher" | "parent" | "admin" | "platform";
type TeacherWorkflow = "assignment" | "material" | "quiz" | "rubric" | "calendar";
type StudentPracticeMode = "quick" | "learn" | "exam" | "mistake" | "question";
type SectionId =
  | "overview"
  | "work"
  | "practice"
  | "attendance"
  | "children"
  | "author"
  | "review"
  | "library"
  | "classes"
  | "people"
  | "migration"
  | "analytics"
  | "schools";

const nav: Array<{ id: View; label: string }> = [
  { id: "student", label: "Student" },
  { id: "teacher", label: "Teacher" },
  { id: "parent", label: "Parent" },
  { id: "admin", label: "School Admin" },
  { id: "platform", label: "Owner" }
];

const rolePresets: Array<{ view: View; role: string; label: string; email: string }> = [
  { view: "student", role: "student", label: "Student", email: "student@arete.local" },
  { view: "teacher", role: "teacher", label: "Teacher", email: "teacher@arete.local" },
  { view: "parent", role: "parent", label: "Parent", email: "parent@arete.local" },
  { view: "admin", role: "school_admin", label: "School Admin", email: "admin@arete.local" },
  { view: "platform", role: "platform_admin", label: "Owner", email: "owner@arete.local" }
];
const defaultRolePreset = rolePresets[0]!;

function viewFromRole(role: string): View {
  if (role === "platform_admin") {
    return "platform";
  }
  if (role === "school_admin") {
    return "admin";
  }
  if (role === "parent") {
    return "parent";
  }
  if (role === "teacher") {
    return "teacher";
  }
  return "student";
}

const sectionNav: Record<View, Array<{ id: SectionId; label: string; icon: LucideIcon }>> = {
  student: [
    { id: "overview", label: "Today", icon: CalendarDays },
    { id: "work", label: "Classwork", icon: ClipboardList },
    { id: "practice", label: "Practice", icon: Sparkles },
    { id: "library", label: "Resources", icon: FolderOpen },
    { id: "attendance", label: "Attendance", icon: ClipboardCheck }
  ],
  teacher: [
    { id: "overview", label: "Dashboard", icon: BarChart3 },
    { id: "classes", label: "Classes", icon: GraduationCap },
    { id: "author", label: "Classwork", icon: ClipboardList },
    { id: "library", label: "Resources", icon: FolderOpen },
    { id: "review", label: "Grades", icon: BookOpen },
    { id: "attendance", label: "Attendance", icon: ClipboardCheck }
  ],
  parent: [
    { id: "overview", label: "Summary", icon: BarChart3 },
    { id: "children", label: "Children", icon: Users },
    { id: "work", label: "Classwork", icon: ClipboardList },
    { id: "library", label: "Resources", icon: FolderOpen },
    { id: "attendance", label: "Attendance", icon: ClipboardCheck }
  ],
  admin: [
    { id: "overview", label: "Operations", icon: ShieldCheck },
    { id: "classes", label: "Classes", icon: GraduationCap },
    { id: "people", label: "People", icon: Users },
    { id: "attendance", label: "Attendance", icon: ClipboardCheck },
    { id: "migration", label: "Migration", icon: UploadCloud },
    { id: "analytics", label: "Reports", icon: BarChart3 }
  ],
  platform: [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "schools", label: "Schools", icon: ShieldCheck },
    { id: "people", label: "People", icon: Users },
    { id: "analytics", label: "Usage", icon: Sparkles }
  ]
};

export function AreteDashboardShell() {
  const clerkConfigured =
    process.env.NEXT_PUBLIC_CLERK_ENABLED === "true" && Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const [clerkEnabled, setClerkEnabled] = useState(false);
  const [activeView, setActiveView] = useState<View>("student");
  const [activeSection, setActiveSection] = useState<SectionId>("overview");
  const [dashboard, setDashboard] = useState<AreteDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState("student@arete.local");
  const [selectedRole, setSelectedRole] = useState("student");
  const [selectedSchoolSlug, setSelectedSchoolSlug] = useState("northview");
  const [lms, setLms] = useState<LmsOverview | null>(null);
  const [activity, setActivity] = useState<ActivityFeed | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [practiceResult, setPracticeResult] = useState<string | null>(null);
  const [quizResult, setQuizResult] = useState<string | null>(null);
  const [migrationSources, setMigrationSources] = useState<MigrationSource[]>([]);
  const [migrationWizard, setMigrationWizard] = useState<MigrationWizard | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  async function load(nextToken = token) {
    if (!nextToken) {
      return;
    }

    try {
      setError(null);
      const [nextDashboard, nextLms, nextActivity] = await Promise.all([
        fetchDashboard(nextToken),
        fetchLmsOverview(nextToken),
        fetchActivity(nextToken)
      ]);
      const nextPeople = nextDashboard.user.roles.some((role) => role === "school_admin" || role === "platform_admin")
        ? await fetchPeople(nextToken)
        : [];
      setDashboard(nextDashboard);
      setLms(nextLms);
      setActivity(nextActivity);
      setPeople(nextPeople);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Something went wrong");
    }
  }

  useEffect(() => {
    setClerkEnabled(clerkConfigured && !window.location.hostname.endsWith(".vercel.app"));
    const stored = window.localStorage.getItem("arete.accessToken");
    if (stored) {
      setToken(stored);
      void load(stored);
    }
    void fetchMigrationSources().then(setMigrationSources).catch(() => setMigrationSources([]));
  }, [clerkConfigured]);

  useEffect(() => {
    const sections = sectionNav[activeView];
    if (!sections.some((section) => section.id === activeSection)) {
      setActiveSection(sections[0]?.id ?? "overview");
    }
  }, [activeSection, activeView]);

  async function signIn() {
    await signInAs(selectedRole, selectedAccount);
  }

  async function signInAs(role: string, email: string) {
    setBusyId("login");
    try {
      setError(null);
      await seedDemoData();
      const result = await login(email, "Arete@12345", role, selectedSchoolSlug);
      setSelectedAccount(email);
      setSelectedRole(role);
      await openWorkspace(result);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login failed");
    } finally {
      setBusyId(null);
    }
  }

  async function signInWithClerk(role: string) {
    setBusyId(`clerk-${role}`);
    try {
      setError(null);
      await seedDemoData();
      const result = await createClerkSession(role, selectedSchoolSlug);
      setSelectedRole(role);
      await openWorkspace(result);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Signed-in session could not be opened");
    } finally {
      setBusyId(null);
    }
  }

  async function openWorkspace(result: Awaited<ReturnType<typeof login>>) {
      window.localStorage.setItem("arete.accessToken", result.accessToken);
      setToken(result.accessToken);
      setActiveView(viewFromRole(result.activeContext.roles[0] ?? "student"));
      setActiveSection("overview");
      await load(result.accessToken);
  }

  async function openProvisionedSchool(schoolSlug: string) {
    if (!token) {
      return;
    }
    setBusyId("open-school");
    try {
      setError(null);
      await openWorkspace(await switchSchool(token, schoolSlug));
    } catch (switchError) {
      setError(switchError instanceof Error ? switchError.message : "School workspace could not be opened");
    } finally {
      setBusyId(null);
    }
  }

  function signOut() {
    window.localStorage.removeItem("arete.accessToken");
    setToken(null);
    setDashboard(null);
    setLms(null);
    setActivity(null);
    setPeople([]);
  }

  async function resetAndSignIn() {
    setBusyId("reset");
    try {
      await resetDemoData();
      await signIn();
    } finally {
      setBusyId(null);
    }
  }

  async function runAction(id: string, action: () => Promise<void>) {
    if (!token) {
      setError("Sign in first");
      return;
    }

    setBusyId(id);
    try {
      setError(null);
      await action();
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  const pageTitle = useMemo(() => {
    if (!dashboard) {
      return "Loading";
    }

    return sectionNav[activeView].find((item) => item.id === activeSection)?.label ?? "Overview";
  }, [activeSection, activeView, dashboard]);

  if (!token) {
    return (
      <LandingGate
        busyId={busyId}
        clerkEnabled={clerkEnabled}
        error={error}
        schoolSlug={selectedSchoolSlug}
        setSchoolSlug={setSelectedSchoolSlug}
        signInAs={signInAs}
        signInWithClerk={signInWithClerk}
      />
    );
  }

  return (
    <main className={sidebarCollapsed ? "shell sidebarCollapsed" : "shell"}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark">A</div>
          <strong>Arete</strong>
          <button
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="sidebarToggle"
            onClick={() => setSidebarCollapsed((current) => !current)}
            type="button"
          >
            {sidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>

        <section className="accountBox">
          <div>
            <span>{dashboard?.school.name ?? selectedSchoolSlug}</span>
            <strong>{dashboard?.user.displayName ?? selectedAccount}</strong>
            {dashboard ? <small>{nav.find((item) => item.id === activeView)?.label}</small> : null}
          </div>
          <div className="accountActions">
            {clerkEnabled ? <UserButton /> : null}
            <button aria-label="Sign out" onClick={signOut} type="button">
              <CircleAlert size={18} />
            </button>
            <button aria-label="Reset data" disabled={busyId === "reset"} onClick={() => void resetAndSignIn()} type="button">
              <RefreshCcw size={18} />
            </button>
          </div>
        </section>

        {dashboard ? (
          <nav className="sectionNav" aria-label="Workspace sections">
            <span>Workspace</span>
            {sectionNav[activeView].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  className={item.id === activeSection ? "navItem sub active" : "navItem sub"}
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  type="button"
                >
                  <span><Icon size={17} /> {item.label}</span>
                  <ChevronRight size={15} />
                </button>
              );
            })}
          </nav>
        ) : null}
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>{pageTitle}</h1>
            {dashboard ? <span>{dashboard.school.name} · {nav.find((item) => item.id === activeView)?.label}</span> : null}
          </div>
          <div className="topActions">
            <button aria-label="Search" type="button"><Search size={19} /></button>
            <button aria-label="Refresh" onClick={() => void load()} type="button">
              <RefreshCcw size={19} />
            </button>
            <button aria-label="Notifications" type="button">
              <Bell size={19} />
            </button>
          </div>
        </header>

        {error ? <div className="notice">{error}</div> : null}
        {!dashboard && !token ? (
          <div className="notice">Sign in to continue.</div>
        ) : null}
        {!dashboard && token ? <div className="notice">Loading workspace data...</div> : null}

        {dashboard ? (
          <>
            {activeSection === "overview" ? (
              <>
                <section className="metricGrid">
                  {dashboard.metrics.map((metric) => (
                    <article className="metric" key={metric.label}>
                      <span>{metric.label}</span>
                      <strong>{metric.value}</strong>
                      <small>{metric.delta}</small>
                    </article>
                  ))}
                </section>

                <ActivityPanel activity={activity} runAction={runAction} token={token} />
              </>
            ) : null}

            {activeView === "student" ? (
              <StudentView
                dashboard={dashboard}
                lms={lms}
                practiceResult={practiceResult}
                quizResult={quizResult}
                runAction={runAction}
                activeSection={activeSection}
                setPracticeResult={setPracticeResult}
                setQuizResult={setQuizResult}
                token={token}
              />
            ) : null}
            {activeView === "parent" ? <ParentView activeSection={activeSection} dashboard={dashboard} lms={lms} /> : null}
            {activeView === "teacher" ? (
              <TeacherView
                activeSection={activeSection}
                dashboard={dashboard}
                busyId={busyId}
                lms={lms}
                runAction={runAction}
                setActiveSection={setActiveSection}
                token={token}
              />
            ) : null}
            {activeView === "admin" ? (
              <AdminView
                dashboard={dashboard}
                busyId={busyId}
                lms={lms}
                migrationSources={migrationSources}
                migrationWizard={migrationWizard}
                people={people}
                runAction={runAction}
                activeSection={activeSection}
                setMigrationWizard={setMigrationWizard}
                token={token}
              />
            ) : null}
            {activeView === "platform" ? (
              <PlatformView
                activeSection={activeSection}
                busyId={busyId}
                dashboard={dashboard}
                lms={lms}
                onOpenSchool={openProvisionedSchool}
                people={people}
                runAction={runAction}
                token={token}
              />
            ) : null}
          </>
        ) : null}
      </section>
    </main>
  );
}

function LandingGate({
  busyId,
  clerkEnabled,
  error,
  schoolSlug,
  setSchoolSlug,
  signInAs,
  signInWithClerk
}: {
  busyId: string | null;
  clerkEnabled: boolean;
  error: string | null;
  schoolSlug: string;
  setSchoolSlug: (value: string) => void;
  signInAs: (role: string, email: string) => Promise<void>;
  signInWithClerk: (role: string) => Promise<void>;
}) {
  const [selectedRole, setSelectedRole] = useState(defaultRolePreset);

  return (
    <main className="landing">
      <header className="landingNav">
        <div className="brand">
          <div className="brandMark">A</div>
          <strong>Arete</strong>
        </div>
        <div className="authActions">
          {clerkEnabled ? (
            <>
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <button className="textButton secondary" type="button">Sign in</button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="textButton" type="button">Create account</button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                <UserButton />
              </Show>
            </>
          ) : null}
        </div>
      </header>

      <section className="landingHero">
        <div className="heroCopy">
          <span className="eyebrow">Arete</span>
          <h1>Choose your workspace.</h1>
          <p>Select a role to open the matching dashboard, classwork, people, and progress tools.</p>
          <label className="schoolField">
            <span>School slug</span>
            <input suppressHydrationWarning value={schoolSlug} onChange={(event) => setSchoolSlug(event.target.value)} />
          </label>
        </div>

        <div className="roleEntryPanel">
          <div className="roleSelector" aria-label="Choose login">
            {rolePresets.map((role) => (
              <button
                className={selectedRole.role === role.role ? "roleCard active" : "roleCard"}
                key={role.role}
                onClick={() => setSelectedRole(role)}
                type="button"
              >
                <strong>{role.label}</strong>
                <span>{role.email}</span>
              </button>
            ))}
          </div>
          <div className="entryActions">
            {clerkEnabled ? (
              <Show when="signed-in">
                <button
                  className="textButton fullWidth"
                  disabled={busyId === `clerk-${selectedRole.role}`}
                  onClick={() => void signInWithClerk(selectedRole.role)}
                  type="button"
                >
                  Continue with Google session
                </button>
              </Show>
            ) : null}
            {clerkEnabled ? (
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <button className="textButton fullWidth" type="button">Sign in with Google</button>
                </SignInButton>
              </Show>
            ) : null}
            <button
              className="textButton fullWidth secondary"
              disabled={busyId === "login"}
              onClick={() => void signInAs(selectedRole.role, selectedRole.email)}
              type="button"
            >
              Open workspace
            </button>
          </div>
          {error ? <div className="notice compact">{error}</div> : null}
        </div>
      </section>
    </main>
  );
}

function ActivityPanel({
  activity,
  runAction,
  token
}: {
  activity: ActivityFeed | null;
  runAction: (id: string, action: () => Promise<void>) => Promise<void>;
  token: string | null;
}) {
  const notifications = activity?.notifications.slice(0, 4) ?? [];
  const auditEvents = activity?.auditEvents.slice(0, 5) ?? [];

  if (!notifications.length && !auditEvents.length) {
    return null;
  }

  return (
    <section className="activityGrid">
      {notifications.length ? (
        <article className="panel activityPanel">
          <div className="panelHeader">
            <h2>Notifications</h2>
            <Bell size={22} />
          </div>
          <div className="activityList">
            {notifications.map((notification) => (
              <div className={notification.read ? "activityItem" : "activityItem unread"} key={notification.id}>
                <div>
                  <strong>{notification.message}</strong>
                  <span>{new Date(notification.createdAt).toLocaleString()}</span>
                </div>
                {!notification.read ? (
                  <button
                    className="iconTextButton"
                    onClick={() => void runAction(`read-${notification.id}`, () => markNotificationRead(token ?? "", notification.id))}
                    type="button"
                  >
                    <Check size={16} />
                    Mark read
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </article>
      ) : null}

      {auditEvents.length ? (
        <article className="panel activityPanel">
          <div className="panelHeader">
            <h2>Audit</h2>
            <ShieldCheck size={22} />
          </div>
          <div className="activityList">
            {auditEvents.map((event) => (
              <div className="activityItem" key={event.id}>
                <strong>{event.action}</strong>
                <span>{event.targetType}{event.targetId ? ` · ${event.targetId}` : ""}</span>
              </div>
            ))}
          </div>
        </article>
      ) : null}
    </section>
  );
}

function EmptyState({ children }: { children: string }) {
  return <div className="emptyState">{children}</div>;
}

function ParentView({
  activeSection,
  dashboard,
  lms
}: {
  activeSection: SectionId;
  dashboard: AreteDashboard;
  lms: LmsOverview | null;
}) {
  return (
    <section className="contentGrid">
      {activeSection === "overview" || activeSection === "children" ? <article className="panel wide">
        <div className="panelHeader">
          <h2>Children</h2>
          <Users size={22} />
        </div>
        {dashboard.parent.children.map((child) => (
          <div className="importBox" key={child.name}>
            <div className="importTop">
              <div>
                <strong>{child.name}</strong>
                <span>{child.quizAverage} quiz average</span>
              </div>
              <span className="status approved">{child.streakDays} day streak</span>
            </div>
            <div className="detectedGrid">
              <div><span>Assignments due</span><strong>{child.assignmentsDue}</strong></div>
              {child.focusAreas.map((area) => (
                <div key={area}><span>Focus</span><strong>{area}</strong></div>
              ))}
            </div>
          </div>
        ))}
      </article> : null}

      {activeSection === "overview" || activeSection === "work" || activeSection === "library" ? <article className="panel">
        <h2>Announcements</h2>
        {dashboard.parent.announcements.map((announcement) => (
          <div className="alertLine" key={announcement}>
            <Bell size={18} />
            <span>{announcement}</span>
          </div>
        ))}
        <h2>Submissions</h2>
        <div className="mappingList">
          {(lms?.submissions ?? []).map((submission) => (
            <div key={submission.id}>
              <strong>{submission.status === "graded" ? `${submission.score}%` : "Submitted"}</strong>
              <span>{submission.feedback ?? submission.response}</span>
            </div>
          ))}
        </div>
        <h2>Quiz attempts</h2>
        <div className="mappingList">
          {(lms?.quizAttempts ?? []).map((attempt) => (
            <div key={attempt.id}>
              <strong>{attempt.score}%</strong>
              <span>{attempt.correct}/{attempt.total} · {new Date(attempt.submittedAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
        <h2>Materials</h2>
        <div className="mappingList">
          {(lms?.materials ?? []).slice(0, 5).map((material) => (
            <div key={material.id}>
              <strong>{material.title}</strong>
              <span>{material.filename ?? material.content}</span>
            </div>
          ))}
        </div>
      </article> : null}
      {activeSection === "attendance" ? <AttendancePanel lms={lms} /> : null}
    </section>
  );
}

function StudentView({
  dashboard,
  lms,
  practiceResult,
  quizResult,
  runAction,
  activeSection,
  setPracticeResult,
  setQuizResult,
  token
}: {
  dashboard: AreteDashboard;
  lms: LmsOverview | null;
  practiceResult: string | null;
  quizResult: string | null;
  runAction: (id: string, action: () => Promise<void>) => Promise<void>;
  activeSection: SectionId;
  setPracticeResult: (value: string | null) => void;
  setQuizResult: (value: string | null) => void;
  token: string | null;
}) {
  const [selectedPracticeIndex, setSelectedPracticeIndex] = useState(0);
  const [practiceMode, setPracticeMode] = useState<StudentPracticeMode>("quick");
  const questions = lms?.practice ?? [];
  const question = questions[selectedPracticeIndex] ?? questions[0];
  const quiz = lms?.quizzes.find((item) => item.status === "published");
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const assignments = lms?.assignments ?? [];
  const materials = lms?.materials ?? [];
  const currentClass = question ? lms?.classes[0] : undefined;
  const modes: Array<{ id: StudentPracticeMode; label: string }> = [
    { id: "quick", label: "Quick Practice" },
    { id: "learn", label: "Learn Topic" },
    { id: "exam", label: "Exam Prep" },
    { id: "mistake", label: "Explain Mistake" },
    { id: "question", label: "Ask Question" }
  ];

  function coachPrompt(kind: "hint" | "explain" | "similar" | "plan") {
    if (!question) {
      setPracticeResult("No practice question is available for this class yet.");
      return;
    }

    const firstStep = question.explanation.split(".")[0] || question.explanation;
    if (kind === "hint") {
      setPracticeResult(`Hint: focus on the first move. ${firstStep}. Try the option that matches that step.`);
      return;
    }
    if (kind === "similar") {
      setPracticeResult(`Similar practice: keep the same method and change the numbers. ${firstStep}.`);
      return;
    }
    if (kind === "plan") {
      setPracticeResult("Plan: answer this question, review the explanation, then do one similar problem before moving difficulty up.");
      return;
    }
    setPracticeResult(`Explanation: ${question.explanation}`);
  }

  return (
    <section className="contentGrid">
      {activeSection === "overview" || activeSection === "work" ? <article className="panel wide">
        <div className="panelHeader">
          <h2>{activeSection === "overview" ? "Today" : "Assignments"}</h2>
          <GraduationCap size={22} />
        </div>
        <div className="taskList">
          {dashboard.student.dueToday.map((task) => (
            <div className="task" key={task.id}>
              <div>
                <strong>{task.title}</strong>
                <span>{task.subject}</span>
              </div>
              <div className="bar" aria-label={`${task.progress}% complete`}>
                <div style={{ width: `${task.progress}%` }} />
              </div>
            </div>
          ))}
          {(lms?.assignments ?? []).map((assignment) => {
            const submission = lms?.submissions.find((item) => item.assignmentId === assignment.id);
            return (
              <div className="task" key={assignment.id}>
                <div>
                  <strong>{assignment.title}</strong>
                  <span>{submission ? `${submission.status}${submission.score !== undefined ? ` · ${submission.score}%` : ""}` : assignment.instructions}</span>
                </div>
                <button
                  className="textButton"
                  onClick={() =>
                    void runAction(`submit-${assignment.id}`, () =>
                      submitAssignment(token ?? "", {
                        assignmentId: assignment.id,
                        response: `Submitted from web at ${new Date().toLocaleString()}`
                      })
                    )
                  }
                  type="button"
                >
                  Submit
                </button>
              </div>
            );
          })}
          {!dashboard.student.dueToday.length && !assignments.length ? <EmptyState>New assignments from your teachers will appear here.</EmptyState> : null}
        </div>
      </article> : null}

      {activeSection === "overview" || activeSection === "practice" ? <article className="panel learningStudio wide">
        <div className="panelHeader">
          <div>
            <h2>Practice with AI</h2>
            <span>{currentClass ? `Based on ${currentClass.name} ${currentClass.section}` : "Adaptive practice"}</span>
          </div>
          <Sparkles size={22} />
        </div>
        <div className="modeTabs" aria-label="Practice mode">
          {modes.map((mode) => (
            <button
              className={practiceMode === mode.id ? "modeTab active" : "modeTab"}
              key={mode.id}
              onClick={() => setPracticeMode(mode.id)}
              type="button"
            >
              {mode.label}
            </button>
          ))}
        </div>
        {question ? (
          <div className="practiceSession">
            <div className="problemPane">
              <span className="sectionEyebrow">{practiceMode === "exam" ? "Timed check" : "Current question"}</span>
              <strong>{question.prompt}</strong>
              <div className="answerGrid">
                {question.options.map((option, index) => (
                  <button
                    className="answerButton"
                    key={option}
                    onClick={() =>
                      void runAction(`attempt-${question.id}-${index}`, async () => {
                        const result = await submitPracticeAttempt(token ?? "", {
                          questionId: question.id,
                          selectedIndex: index
                        });
                        setPracticeResult(`${result.correct ? "Correct" : "Review"}: ${result.explanation}`);
                      })
                    }
                    type="button"
                  >
                    {option}
                  </button>
                ))}
              </div>
              <div className="sessionControls">
                <button className="iconTextButton" onClick={() => coachPrompt("hint")} type="button"><Sparkles size={16} /> Hint</button>
                <button className="iconTextButton" onClick={() => coachPrompt("explain")} type="button"><MessageSquare size={16} /> Explain</button>
                <button className="iconTextButton" onClick={() => coachPrompt("similar")} type="button"><RefreshCcw size={16} /> Similar</button>
                <button
                  className="iconTextButton"
                  onClick={() => {
                    setSelectedPracticeIndex((current) => (questions.length ? (current + 1) % questions.length : current));
                    setPracticeResult(null);
                  }}
                  type="button"
                >
                  <ChevronRight size={16} /> Skip
                </button>
              </div>
              {practiceResult ? <p className="resultLine">{practiceResult}</p> : null}
            </div>
            <aside className="coachPanel">
              <span className="sectionEyebrow">Session</span>
              <div className="scoreStack compact">
                <div><Flame size={18} /> {lms?.progress.streakDays ?? dashboard.student.streakDays} days</div>
                <div><ClipboardCheck size={18} /> {lms?.progress.xp ?? dashboard.student.xp} XP</div>
                <div><BarChart3 size={18} /> {lms?.progress.accuracy ?? 0}%</div>
              </div>
              <button className="textButton secondary fullWidth" onClick={() => coachPrompt("plan")} type="button">Build study plan</button>
              <div className="chips">
                {((lms?.progress.achievements.length ? lms.progress.achievements : dashboard.student.weakAreas)).map((area) => (
                  <span key={area}>{area}</span>
                ))}
              </div>
            </aside>
          </div>
        ) : <EmptyState>No practice questions are available yet. Ask a teacher to publish questions from the bank.</EmptyState>}
      </article> : null}

      {activeSection === "overview" || activeSection === "library" ? <article className="panel">
        <div className="panelHeader">
          <h2>Resources</h2>
          <FolderOpen size={22} />
        </div>
        {!materials.length ? <EmptyState>Class materials will appear here after your teacher publishes them.</EmptyState> : null}
        <div className="mappingList">
          {materials.slice(0, activeSection === "library" ? undefined : 4).map((material) => (
            <div key={material.id}>
              <strong>{material.title}</strong>
              <span>{material.kind} - {material.filename ?? material.content}</span>
              {material.kind === "file" ? (
                <button
                  className="iconTextButton"
                  onClick={() => void runAction(`download-${material.id}`, () => downloadMaterialFile(token ?? "", material.id, material.filename ?? material.title))}
                  type="button"
                >
                  <Download size={16} />
                  Download
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </article> : null}

      {activeSection === "practice" || activeSection === "work" ? <article className="panel quizLane">
        {quiz ? (
          <div className="practiceCard">
            <h2>Quiz</h2>
            <strong>{quiz.title}</strong>
            {quiz.questions.map((quizQuestion, questionIndex) => (
              <div className="quizQuestion" key={quizQuestion.id}>
                <span>{quizQuestion.prompt}</span>
                <div className="answerGrid">
                  {quizQuestion.options.map((option, optionIndex) => (
                    <button
                      className={quizAnswers[quizQuestion.id] === optionIndex ? "answerButton selected" : "answerButton"}
                      key={option}
                      onClick={() => setQuizAnswers((current) => ({ ...current, [quizQuestion.id]: optionIndex }))}
                      type="button"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button
              className="textButton"
              disabled={quiz.questions.some((quizQuestion) => quizAnswers[quizQuestion.id] === undefined)}
              onClick={() =>
                void runAction(`quiz-${quiz.id}-submit`, async () => {
                  const answers = quiz.questions.map((quizQuestion) => quizAnswers[quizQuestion.id] ?? 0);
                  const result = await submitQuiz(token ?? "", { quizId: quiz.id, answers });
                  setQuizResult(`${result.score}% · ${result.correct}/${result.total}`);
                  setQuizAnswers({});
                })
              }
              type="button"
            >
              Submit quiz
            </button>
            {quizResult ? <p className="resultLine">{quizResult}</p> : null}
          </div>
        ) : <EmptyState>Published quizzes will appear here.</EmptyState>}
      </article> : null}
      {activeSection === "attendance" ? <AttendancePanel lms={lms} /> : null}
    </section>
  );
}

function TeacherView({
  activeSection,
  dashboard,
  busyId,
  lms,
  runAction,
  setActiveSection,
  token
}: {
  activeSection: SectionId;
  dashboard: AreteDashboard;
  busyId: string | null;
  lms: LmsOverview | null;
  runAction: (id: string, action: () => Promise<void>) => Promise<void>;
  setActiveSection: (section: SectionId) => void;
  token: string | null;
}) {
  const firstClassId = lms?.classes[0]?.id ?? "class-8a";
  const [assignmentForm, setAssignmentForm] = useState({
    classId: firstClassId,
    title: "Practice assignment",
    instructions: "Complete the attached work and show your reasoning.",
    dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().slice(0, 16)
  });
  const [aiForm, setAiForm] = useState({ topic: "Linear equations", questionCount: 2 });
  const [materialForm, setMaterialForm] = useState({
    classId: firstClassId,
    title: "Lesson note",
    kind: "note" as "link" | "note" | "file",
    content: "Balance both sides of the equation and isolate the variable.",
    file: null as File | null
  });
  const [quizForm, setQuizForm] = useState({
    classId: firstClassId,
    title: "Quick check",
    questionOne: "Solve: 4x = 20",
    optionOne: "4, 5, 16, 24",
    correctOne: 1,
    explanationOne: "Divide 20 by 4.",
    questionTwo: "Solve: x + 9 = 15",
    optionTwo: "3, 6, 9, 24",
    correctTwo: 1,
    explanationTwo: "Subtract 9 from both sides."
  });
  const [teacherWorkflow, setTeacherWorkflow] = useState<TeacherWorkflow>("assignment");
  const [rubricRows, setRubricRows] = useState([
    { criterion: "Reasoning", weight: "40", proficient: "Explains each step clearly" },
    { criterion: "Accuracy", weight: "40", proficient: "Uses correct methods and final answer" },
    { criterion: "Presentation", weight: "20", proficient: "Work is organized and readable" }
  ]);
  const [calendarPlan, setCalendarPlan] = useState([
    "Introduce concept and model one worked example",
    "Students complete guided practice from uploaded material",
    "Exit ticket from quiz bank and assign follow-up practice"
  ]);
  const workflows: Array<{ id: TeacherWorkflow; label: string; icon: typeof ClipboardList }> = [
    { id: "assignment", label: "Assignment", icon: ClipboardList },
    { id: "material", label: "Material", icon: FolderOpen },
    { id: "quiz", label: "Quiz", icon: ListChecks }
  ];

  return (
    <section className="contentGrid">
      {activeSection === "overview" || activeSection === "review" ? <article className="panel wide">
        <div className="panelHeader">
          <h2>Review queue</h2>
          <BookOpen size={22} />
        </div>
        <div className="reviewList">
          {!dashboard.teacher.drafts.length ? <EmptyState>No questions are waiting for review.</EmptyState> : null}
          {dashboard.teacher.drafts.map((question) => (
            <div className="reviewItem" key={question.id}>
              <div>
                <strong>{question.prompt}</strong>
                <span>{question.topic} · {question.type} · {question.difficulty}</span>
              </div>
              {question.status === "approved" ? (
                <span className="status approved"><Check size={16} /> Approved</span>
              ) : (
                <button
                  className="textButton"
                  disabled={busyId === question.id}
                  onClick={() => void runAction(question.id, () => approveQuestion(token ?? "", question.id))}
                  type="button"
                >
                  Approve
                </button>
              )}
            </div>
          ))}
        </div>
      </article> : null}

      {activeSection === "author" ? (
        <article className="panel wide classworkStudio">
          <div className="panelHeader">
            <div>
              <h2>Create classwork</h2>
              <span>Choose what students need next, fill in the essentials, then publish.</span>
            </div>
            <span className="status approved">Saved directly to the selected class</span>
          </div>

          <div className="modeTabs workflowTabs" aria-label="Teacher workflow">
            {workflows.map((workflow) => {
              const Icon = workflow.icon;
              return (
                <button
                  className={teacherWorkflow === workflow.id ? "modeTab active" : "modeTab"}
                  key={workflow.id}
                  onClick={() => setTeacherWorkflow(workflow.id)}
                  type="button"
                >
                  <Icon size={16} />
                  {workflow.label}
                </button>
              );
            })}
          </div>

          <div className="workflowLayout">
            <div className="workflowMain">
              {teacherWorkflow === "assignment" ? (
                <>
                  <div className="workflowHeader">
                    <div>
                      <span className="sectionEyebrow">Assignment</span>
                      <h2>Create assignment</h2>
                    </div>
                    <span className="status approved">Editable before publish</span>
                  </div>
                  <div className="formStack">
                    <label>
                      <span>Class</span>
                      <select
                        value={assignmentForm.classId}
                        onChange={(event) => setAssignmentForm((current) => ({ ...current, classId: event.target.value }))}
                      >
                        {(lms?.classes ?? []).map((item) => (
                          <option key={item.id} value={item.id}>{item.name} {item.section}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Due</span>
                      <input type="datetime-local" value={assignmentForm.dueAt} onChange={(event) => setAssignmentForm((current) => ({ ...current, dueAt: event.target.value }))} />
                    </label>
                    <label>
                      <span>Title</span>
                      <input value={assignmentForm.title} onChange={(event) => setAssignmentForm((current) => ({ ...current, title: event.target.value }))} />
                    </label>
                    <label>
                      <span>Instructions</span>
                      <textarea value={assignmentForm.instructions} onChange={(event) => setAssignmentForm((current) => ({ ...current, instructions: event.target.value }))} />
                    </label>
                    <button
                      className="textButton fullWidth"
                      onClick={() =>
                        void runAction("create-assignment", () =>
                          createAssignment(token ?? "", {
                            classId: assignmentForm.classId || firstClassId,
                            title: assignmentForm.title,
                            instructions: assignmentForm.instructions,
                            dueAt: new Date(assignmentForm.dueAt).toISOString()
                          })
                        )
                      }
                      type="button"
                    >
                      Publish assignment
                    </button>
                  </div>
                </>
              ) : null}

              {teacherWorkflow === "material" ? (
                <>
                  <div className="workflowHeader">
                    <div>
                      <span className="sectionEyebrow">Material</span>
                      <h2>Upload class material</h2>
                    </div>
                    <span className="status approved">{materialForm.kind}</span>
                  </div>
                  <div className="formStack">
                    <label>
                      <span>Class</span>
                      <select value={materialForm.classId} onChange={(event) => setMaterialForm((current) => ({ ...current, classId: event.target.value }))}>
                        {(lms?.classes ?? []).map((item) => (
                          <option key={item.id} value={item.id}>{item.name} {item.section}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Kind</span>
                      <select value={materialForm.kind} onChange={(event) => setMaterialForm((current) => ({ ...current, kind: event.target.value as "link" | "note" | "file" }))}>
                        <option value="note">Text note</option>
                        <option value="link">Link</option>
                        <option value="file">File upload</option>
                      </select>
                    </label>
                    <label>
                      <span>Title</span>
                      <input value={materialForm.title} onChange={(event) => setMaterialForm((current) => ({ ...current, title: event.target.value }))} />
                    </label>
                    <label>
                      <span>{materialForm.kind === "link" ? "URL" : "Description"}</span>
                      <textarea value={materialForm.content} onChange={(event) => setMaterialForm((current) => ({ ...current, content: event.target.value }))} />
                    </label>
                    {materialForm.kind === "file" ? (
                      <label>
                        <span>Upload</span>
                        <input
                          type="file"
                          onChange={(event) => setMaterialForm((current) => ({ ...current, file: event.target.files?.[0] ?? null }))}
                        />
                      </label>
                    ) : null}
                    <button
                      className="textButton fullWidth"
                      onClick={() =>
                        void runAction("create-material", async () => {
                          if (materialForm.kind === "file" && materialForm.file) {
                            await uploadMaterialFile(token ?? "", {
                              classId: materialForm.classId || firstClassId,
                              title: materialForm.title,
                              file: materialForm.file
                            });
                            setMaterialForm((current) => ({ ...current, kind: "note", file: null }));
                            setActiveSection("library");
                            return;
                          }
                          if (materialForm.kind === "file") {
                            throw new Error("Choose a file before saving this material");
                          }
                          await createMaterial(token ?? "", {
                            classId: materialForm.classId || firstClassId,
                            title: materialForm.title,
                            kind: materialForm.kind,
                            content: materialForm.content
                          });
                          setActiveSection("library");
                        })
                      }
                      type="button"
                    >
                      Save material
                    </button>
                  </div>
                </>
              ) : null}

              {teacherWorkflow === "quiz" ? (
                <>
                  <div className="workflowHeader">
                    <div>
                      <span className="sectionEyebrow">Quiz</span>
                      <h2>Create quiz</h2>
                    </div>
                    <button
                      className="iconTextButton"
                      onClick={() =>
                        void runAction("bank-quiz", async () => {
                          const questionIds = (lms?.questionBank ?? []).filter((question) => question.approved).slice(0, 3).map((question) => question.id);
                          const quiz = await createQuizFromBank(token ?? "", {
                            classId: quizForm.classId || firstClassId,
                            title: `${quizForm.title} bank`,
                            questionIds
                          });
                          await publishQuiz(token ?? "", quiz.id);
                        })
                      }
                      type="button"
                    >
                      <ListChecks size={16} /> From bank
                    </button>
                    <button
                      className="iconTextButton"
                      onClick={() => void runAction("generate-ai", () => generateAiDrafts(token ?? "", { topic: aiForm.topic, questionCount: aiForm.questionCount }))}
                      type="button"
                    >
                      <Wand2 size={16} /> Generate with AI
                    </button>
                  </div>
                  <div className="formStack">
                    <label>
                      <span>Class</span>
                      <select value={quizForm.classId} onChange={(event) => setQuizForm((current) => ({ ...current, classId: event.target.value }))}>
                        {(lms?.classes ?? []).map((item) => (
                          <option key={item.id} value={item.id}>{item.name} {item.section}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Title</span>
                      <input value={quizForm.title} onChange={(event) => setQuizForm((current) => ({ ...current, title: event.target.value }))} />
                    </label>
                    <label>
                      <span>Question 1</span>
                      <textarea value={quizForm.questionOne} onChange={(event) => setQuizForm((current) => ({ ...current, questionOne: event.target.value }))} />
                    </label>
                    <label>
                      <span>Question 2</span>
                      <textarea value={quizForm.questionTwo} onChange={(event) => setQuizForm((current) => ({ ...current, questionTwo: event.target.value }))} />
                    </label>
                    <label>
                      <span>Options 1</span>
                      <input value={quizForm.optionOne} onChange={(event) => setQuizForm((current) => ({ ...current, optionOne: event.target.value }))} />
                    </label>
                    <label>
                      <span>Options 2</span>
                      <input value={quizForm.optionTwo} onChange={(event) => setQuizForm((current) => ({ ...current, optionTwo: event.target.value }))} />
                    </label>
                    <label>
                      <span>Correct option 1</span>
                      <input min={1} max={4} type="number" value={quizForm.correctOne + 1} onChange={(event) => setQuizForm((current) => ({ ...current, correctOne: Number(event.target.value) - 1 }))} />
                    </label>
                    <label>
                      <span>Correct option 2</span>
                      <input min={1} max={4} type="number" value={quizForm.correctTwo + 1} onChange={(event) => setQuizForm((current) => ({ ...current, correctTwo: Number(event.target.value) - 1 }))} />
                    </label>
                    <label>
                      <span>Explanation 1</span>
                      <input value={quizForm.explanationOne} onChange={(event) => setQuizForm((current) => ({ ...current, explanationOne: event.target.value }))} />
                    </label>
                    <label>
                      <span>Explanation 2</span>
                      <input value={quizForm.explanationTwo} onChange={(event) => setQuizForm((current) => ({ ...current, explanationTwo: event.target.value }))} />
                    </label>
                    <button
                      className="textButton fullWidth"
                      onClick={() =>
                        void runAction("create-quiz", async () => {
                          const quiz = await createQuiz(token ?? "", {
                            classId: quizForm.classId || firstClassId,
                            title: quizForm.title,
                            questions: [
                              {
                                prompt: quizForm.questionOne,
                                options: quizForm.optionOne.split(",").map((option) => option.trim()).filter(Boolean),
                                correctIndex: quizForm.correctOne,
                                explanation: quizForm.explanationOne
                              },
                              {
                                prompt: quizForm.questionTwo,
                                options: quizForm.optionTwo.split(",").map((option) => option.trim()).filter(Boolean),
                                correctIndex: quizForm.correctTwo,
                                explanation: quizForm.explanationTwo
                              }
                            ]
                          });
                          await publishQuiz(token ?? "", quiz.id);
                        })
                      }
                      type="button"
                    >
                      Create and publish quiz
                    </button>
                  </div>
                </>
              ) : null}

              {teacherWorkflow === "rubric" ? (
                <>
                  <div className="workflowHeader">
                    <div>
                      <span className="sectionEyebrow">Rubric</span>
                      <h2>Rubric builder</h2>
                    </div>
                    <button
                      className="iconTextButton"
                      onClick={() =>
                        setRubricRows([
                          { criterion: "Concept understanding", weight: "35", proficient: `Shows clear understanding of ${aiForm.topic}` },
                          { criterion: "Process", weight: "35", proficient: "Uses a valid method and explains reasoning" },
                          { criterion: "Communication", weight: "30", proficient: "Presents final answer with correct notation" }
                        ])
                      }
                      type="button"
                    >
                      <Wand2 size={16} /> Draft rubric
                    </button>
                  </div>
                  <div className="rubricGrid">
                    <span>Criterion</span>
                    <span>Weight</span>
                    <span>Proficient evidence</span>
                    {rubricRows.map((row, index) => (
                      <div className="rubricRow" key={row.criterion}>
                        <input value={row.criterion} onChange={(event) => setRubricRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, criterion: event.target.value } : item))} />
                        <input value={row.weight} onChange={(event) => setRubricRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, weight: event.target.value } : item))} />
                        <input value={row.proficient} onChange={(event) => setRubricRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, proficient: event.target.value } : item))} />
                      </div>
                    ))}
                  </div>
                  <div className="notice compact">Rubrics are drafted locally in this screen until a persisted rubric API is added.</div>
                </>
              ) : null}

              {teacherWorkflow === "calendar" ? (
                <>
                  <div className="workflowHeader">
                    <div>
                      <span className="sectionEyebrow">Calendar</span>
                      <h2>Lesson plan</h2>
                    </div>
                    <button
                      className="iconTextButton"
                      onClick={() =>
                        setCalendarPlan([
                          `Warm-up: diagnose prior knowledge for ${aiForm.topic}`,
                          "Teach: model one example and pause for student checks",
                          "Practice: assign class material, then publish a short quiz"
                        ])
                      }
                      type="button"
                    >
                      <Sparkles size={16} /> Suggest sequence
                    </button>
                  </div>
                  <div className="formStack">
                    <label>
                      <span>Class</span>
                      <select defaultValue={firstClassId}>
                        {(lms?.classes ?? []).map((item) => (
                          <option key={item.id} value={item.id}>{item.name} {item.section}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Topic</span>
                      <input value={aiForm.topic} onChange={(event) => setAiForm((current) => ({ ...current, topic: event.target.value }))} />
                    </label>
                  </div>
                  <div className="stepList">
                    {calendarPlan.map((step, index) => (
                      <div key={step}>
                        <span>{index + 1}</span>
                        <strong>{step}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="notice compact">Calendar items are planned here; persistent calendar scheduling needs a backend calendar endpoint.</div>
                </>
              ) : null}
            </div>

            {teacherWorkflow === "quiz" ? <aside className="aiSidePanel">
              <div className="panelHeader">
                <div>
                  <h2>AI assist</h2>
                  <span>Reviewable drafts only</span>
                </div>
                <Sparkles size={20} />
              </div>
              <div className="formStack single">
                <label>
                  <span>Topic or objective</span>
                  <input value={aiForm.topic} onChange={(event) => setAiForm((current) => ({ ...current, topic: event.target.value }))} />
                </label>
                <label>
                  <span>Question count</span>
                  <input
                    min={1}
                    max={5}
                    type="number"
                    value={aiForm.questionCount}
                    onChange={(event) => setAiForm((current) => ({ ...current, questionCount: Number(event.target.value) }))}
                  />
                </label>
              </div>
              <button
                className="textButton fullWidth secondary"
                onClick={() =>
                  void runAction("generate-ai", () =>
                    generateAiDrafts(token ?? "", { topic: aiForm.topic, questionCount: aiForm.questionCount })
                  )
                }
                type="button"
              >
                Generate question drafts
              </button>
              <div className="mappingList">
                {(lms?.questionBank ?? []).slice(0, 3).map((question) => (
                  <div key={question.id}>
                    <strong>{question.prompt}</strong>
                    <span>{question.source ?? "manual"} - {question.approved ? "approved" : "draft"}</span>
                  </div>
                ))}
              </div>
            </aside> : null}
          </div>
        </article>
      ) : null}

      {activeSection === "overview" ? <article className="panel">
        <h2>Submissions</h2>
        <div className="signalList">
          {!(lms?.submissions ?? []).length ? <EmptyState>No submissions are waiting right now.</EmptyState> : null}
          {(lms?.submissions ?? []).map((submission) => (
            <div key={submission.id}>
              <span>{submission.studentName}</span>
              <strong>{submission.status === "graded" ? `${submission.score}%` : "Ready to grade"}</strong>
              <small>{submission.response}</small>
              {submission.status !== "graded" ? <small>Open Grades to review and return feedback.</small> : null}
            </div>
          ))}
        </div>
      </article> : null}

      {activeSection === "review" ? <TeacherReviewWorkspace lms={lms} runAction={runAction} token={token} /> : null}
      {activeSection === "review" ? <GradebookPanel lms={lms} /> : null}

      {activeSection === "library" ? <article className="panel wide">
        <h2>Materials</h2>
        <div className="mappingList">
          {!(lms?.materials ?? []).length ? <EmptyState>No resources have been added yet.</EmptyState> : null}
          {(lms?.materials ?? []).map((material) => (
            <div key={material.id}>
              <strong>{material.title}</strong>
              <span>{material.kind} · {material.filename ?? material.content}{material.byteSize ? ` · ${Math.round(material.byteSize / 1024)} KB` : ""}</span>
              {material.kind === "file" ? (
                <button
                  className="iconTextButton"
                  onClick={() => void runAction(`download-${material.id}`, () => downloadMaterialFile(token ?? "", material.id, material.filename ?? material.title))}
                  type="button"
                >
                  <Download size={16} />
                  Download
                </button>
              ) : null}
            </div>
          ))}
        </div>
        <h2>Quizzes</h2>
        <div className="mappingList">
          {(lms?.quizzes ?? []).map((quiz) => (
            <div key={quiz.id}>
              <strong>{quiz.title}</strong>
              <span>{quiz.status} · {quiz.questions.length} questions</span>
              {quiz.status === "draft" ? (
                <button className="textButton fullWidth" onClick={() => void runAction(`publish-${quiz.id}`, () => publishQuiz(token ?? "", quiz.id))} type="button">
                  Publish
                </button>
              ) : null}
            </div>
          ))}
        </div>
        <h2>Question bank</h2>
        <div className="mappingList">
          {(lms?.questionBank ?? []).map((question) => (
            <div key={question.id}>
              <strong>{question.prompt}</strong>
              <span>{question.source ?? "manual"} · {question.approved ? "approved" : "draft"}</span>
              {!question.approved ? (
                <button className="textButton fullWidth" onClick={() => void runAction(question.id, () => approveQuestion(token ?? "", question.id))} type="button">
                  Approve
                </button>
              ) : null}
            </div>
          ))}
        </div>
        <h2>Performance</h2>
        <div className="mappingList">
          {(lms?.quizAttempts ?? []).map((attempt) => (
            <div key={attempt.id}>
              <strong>{attempt.studentName}: {attempt.score}%</strong>
              <span>{attempt.correct}/{attempt.total} · {new Date(attempt.submittedAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
        <h2>Leaderboard</h2>
        <div className="mappingList">
          {(lms?.leaderboard ?? []).map((row, index) => (
            <div key={row.studentUserId}>
              <strong>{index + 1}. {row.studentName}</strong>
              <span>{row.xp} XP · {row.average}% average · {row.attempts} attempts</span>
            </div>
          ))}
        </div>
      </article> : null}

      {activeSection === "overview" ? <article className="panel">
        <h2>Class signals</h2>
        <div className="signalList">
          {dashboard.teacher.classSignals.map((signal) => (
                <div key={signal.label}>
                  <span>{signal.label}</span>
                  <strong>{signal.value}</strong>
                  <small>{signal.severity}</small>
                </div>
              ))}
        </div>
      </article> : null}
      {activeSection === "classes" ? <TeacherClassroom lms={lms} onCreateClasswork={() => setActiveSection("author")} runAction={runAction} token={token} /> : null}
      {activeSection === "attendance" ? <AttendanceManager lms={lms} runAction={runAction} token={token} /> : null}
    </section>
  );
}

function TeacherClassroom({
  lms,
  onCreateClasswork,
  runAction,
  token
}: {
  lms: LmsOverview | null;
  onCreateClasswork: () => void;
  runAction: (id: string, action: () => Promise<void>) => Promise<void>;
  token: string | null;
}) {
  const [selectedClassId, setSelectedClassId] = useState(lms?.classes[0]?.id ?? "");
  const [classTab, setClassTab] = useState<"stream" | "classwork" | "people" | "grades">("stream");
  const [newStudentId, setNewStudentId] = useState("");
  const [classForm, setClassForm] = useState({ name: "Grade 8", section: "B", subject: "Mathematics" });
  const classes = lms?.classes ?? [];
  const activeClass = classes.find((item) => item.id === selectedClassId) ?? classes[0];
  const roster = (lms?.enrollments ?? []).filter((enrollment) => enrollment.classId === activeClass?.id);
  const enrolledIds = new Set(roster.map((student) => student.studentUserId));
  const availableStudents = (lms?.students ?? []).filter((student) => !enrolledIds.has(student.id));
  const classAssignments = (lms?.assignments ?? []).filter((assignment) => assignment.classId === activeClass?.id);
  const classMaterials = (lms?.materials ?? []).filter((material) => material.classId === activeClass?.id);
  const classQuizzes = (lms?.quizzes ?? []).filter((quiz) => quiz.classId === activeClass?.id);

  return (
    <article className="panel wide classWorkspace">
      <div className="workflowHeader">
        <div>
          <span className="sectionEyebrow">Classes</span>
          <h2>Classroom management</h2>
        </div>
        <span className="status approved">{classes.length} active</span>
      </div>
      <div className="classWorkspaceGrid">
        <aside className="classRail">
          <strong>Your classes</strong>
          {classes.map((item) => (
            <button className={activeClass?.id === item.id ? "classSelector active" : "classSelector"} key={item.id} onClick={() => setSelectedClassId(item.id)} type="button">
              <span>{item.name} {item.section}</span>
              <small>{item.subject} · {item.studentCount} students</small>
            </button>
          ))}
          <details className="createClassDisclosure">
            <summary>New class</summary>
            <div className="formStack single">
              <label><span>Class name</span><input value={classForm.name} onChange={(event) => setClassForm((current) => ({ ...current, name: event.target.value }))} /></label>
              <label><span>Section</span><input value={classForm.section} onChange={(event) => setClassForm((current) => ({ ...current, section: event.target.value }))} /></label>
              <label><span>Subject</span><input value={classForm.subject} onChange={(event) => setClassForm((current) => ({ ...current, subject: event.target.value }))} /></label>
              <button className="textButton fullWidth" onClick={() => void runAction("teacher-create-class", () => createClass(token ?? "", classForm))} type="button">Create class</button>
            </div>
          </details>
        </aside>
        <div className="classDetail">
          {activeClass ? (
            <>
              <div className="classDetailHeader">
                <div>
                  <h2>{activeClass.name} {activeClass.section}</h2>
                  <span>{activeClass.subject} · {roster.length} enrolled students</span>
                </div>
                <span className="status approved">{activeClass.teacher}</span>
              </div>
              <div className="modeTabs classTabs" aria-label="Class detail">
                <button className={classTab === "stream" ? "modeTab active" : "modeTab"} onClick={() => setClassTab("stream")} type="button">Stream</button>
                <button className={classTab === "classwork" ? "modeTab active" : "modeTab"} onClick={() => setClassTab("classwork")} type="button">Classwork</button>
                <button className={classTab === "people" ? "modeTab active" : "modeTab"} onClick={() => setClassTab("people")} type="button">People</button>
                <button className={classTab === "grades" ? "modeTab active" : "modeTab"} onClick={() => setClassTab("grades")} type="button">Grades</button>
              </div>
              {classTab === "stream" ? <div className="classStream">
                <div className="streamComposer">
                  <div><strong>Keep {activeClass.name} {activeClass.section} moving</strong><span>Create an assignment, upload a resource, or publish a quiz from Classwork.</span></div>
                  <button className="textButton" onClick={() => setClassTab("classwork")} type="button">View classwork</button>
                </div>
                <div className="streamList">
                  {classAssignments.slice(0, 3).map((item) => <div key={item.id}><ClipboardList size={18} /><div><strong>{item.title}</strong><span>Assignment · Due {new Date(item.dueAt).toLocaleDateString()} · {item.submissions} submitted</span></div></div>)}
                  {classMaterials.slice(0, 3).map((item) => <div key={item.id}><FolderOpen size={18} /><div><strong>{item.title}</strong><span>Material shared with this class</span></div></div>)}
                  {classQuizzes.slice(0, 3).map((item) => <div key={item.id}><ListChecks size={18} /><div><strong>{item.title}</strong><span>{item.status === "published" ? "Quiz published" : "Quiz draft"}</span></div></div>)}
                  {!classAssignments.length && !classMaterials.length && !classQuizzes.length ? <EmptyState>This stream will show classwork as you publish it.</EmptyState> : null}
                </div>
              </div> : null}
              {classTab === "people" ? <div className="classRoster">
                <div className="rosterActions">
                  <select value={newStudentId} onChange={(event) => setNewStudentId(event.target.value)}>
                    <option value="">Add an enrolled school student</option>
                    {availableStudents.map((student) => <option key={student.id} value={student.id}>{student.displayName} · {student.email}</option>)}
                  </select>
                  <button className="textButton" disabled={!newStudentId} onClick={() => void runAction(`teacher-enroll-${newStudentId}`, async () => {
                    await enrollStudent(token ?? "", { classId: activeClass.id, studentUserId: newStudentId });
                    setNewStudentId("");
                  })} type="button">Add student</button>
                </div>
                <div className="mappingList">
                  {!roster.length ? <EmptyState>Enroll students from the school directory to begin.</EmptyState> : null}
                  {roster.map((student) => <div key={student.id}><strong>{student.studentName}</strong><span>Active enrollment</span></div>)}
                </div>
              </div> : null}
              {classTab === "classwork" ? <div className="classworkBoard">
                <div className="classworkBoardHeader"><div><strong>Classwork</strong><span>Assignments, materials, and quizzes for this class</span></div><button className="textButton" onClick={onCreateClasswork} type="button">Create</button></div>
                <div className="classworkItems">
                  {classAssignments.map((item) => <div key={item.id}><ClipboardList size={18} /><div><strong>{item.title}</strong><span>Assignment · Due {new Date(item.dueAt).toLocaleDateString()} · {item.submissions} submitted</span></div></div>)}
                  {classMaterials.map((item) => <div key={item.id}><FolderOpen size={18} /><div><strong>{item.title}</strong><span>Material · {item.kind}</span></div></div>)}
                  {classQuizzes.map((item) => <div key={item.id}><ListChecks size={18} /><div><strong>{item.title}</strong><span>Quiz · {item.status} · {item.questions.length} questions</span></div></div>)}
                  {!classAssignments.length && !classMaterials.length && !classQuizzes.length ? <EmptyState>Create the first item for this class from the Classwork page.</EmptyState> : null}
                </div>
              </div> : null}
              {classTab === "grades" ? <div className="mappingList">
                {(lms?.gradebook ?? []).filter((row) => roster.some((student) => student.studentUserId === row.studentUserId)).map((row) => (
                  <div key={row.studentUserId}><strong>{row.studentName}</strong><span>Assignment {row.assignmentAverage}% · Quiz {row.quizAverage}% · Practice {row.practiceAccuracy}%</span></div>
                ))}
              </div> : null}
            </>
          ) : <EmptyState>Create your first class to begin building classwork.</EmptyState>}
        </div>
      </div>
    </article>
  );
}

function TeacherReviewWorkspace({
  lms,
  runAction,
  token
}: {
  lms: LmsOverview | null;
  runAction: (id: string, action: () => Promise<void>) => Promise<void>;
  token: string | null;
}) {
  const submissions = lms?.submissions ?? [];
  const [selectedId, setSelectedId] = useState(submissions.find((submission) => submission.status !== "graded")?.id ?? submissions[0]?.id ?? "");
  const selected = submissions.find((submission) => submission.id === selectedId) ?? submissions[0];
  const [score, setScore] = useState("85");
  const [feedback, setFeedback] = useState("Clear reasoning. Review the final step and resubmit if you would like another attempt.");

  useEffect(() => {
    if (selected) {
      setScore(String(selected.score ?? 85));
      setFeedback(selected.feedback ?? "Clear reasoning. Review the final step and resubmit if you would like another attempt.");
    }
  }, [selected?.id]);

  return (
    <article className="panel wide reviewWorkspace">
      <div className="workflowHeader">
        <div><span className="sectionEyebrow">Grades</span><h2>Submission review</h2></div>
        <span className="status approved">{submissions.filter((submission) => submission.status !== "graded").length} to review</span>
      </div>
      <div className="reviewWorkspaceGrid">
        <aside className="submissionRail">
          {submissions.map((submission) => <button className={selected?.id === submission.id ? "submissionSelector active" : "submissionSelector"} key={submission.id} onClick={() => setSelectedId(submission.id)} type="button"><strong>{submission.studentName}</strong><span>{submission.status === "graded" ? `${submission.score}% graded` : "Ready to grade"}</span></button>)}
          {!submissions.length ? <EmptyState>No submissions are waiting right now.</EmptyState> : null}
        </aside>
        {selected ? <div className="submissionDetail">
          <div><span className="sectionEyebrow">Student response</span><h2>{selected.studentName}</h2><p>{selected.response}</p></div>
          <div className="formStack single gradingForm">
            <label><span>Score</span><input max={100} min={0} type="number" value={score} onChange={(event) => setScore(event.target.value)} /></label>
            <label><span>Feedback</span><textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} /></label>
            <button className="textButton fullWidth" onClick={() => void runAction(`grade-${selected.id}`, () => gradeSubmission(token ?? "", { submissionId: selected.id, score: Number(score), feedback }))} type="button">Save grade and feedback</button>
          </div>
        </div> : null}
      </div>
    </article>
  );
}

function GradebookPanel({ lms }: { lms: LmsOverview | null }) {
  return (
    <article className="panel wide">
      <div className="panelHeader">
        <h2>Gradebook</h2>
        <ClipboardCheck size={22} />
      </div>
      <div className="mappingList">
        {(lms?.gradebook ?? []).map((row) => (
          <div key={row.studentUserId}>
            <strong>{row.studentName}</strong>
            <span>{row.classes.join(", ") || "No class"}</span>
            <small>
              Assignments {row.assignmentsSubmitted}/{row.assignmentsTotal} · Missing {row.missingAssignments} · Assignment avg {row.assignmentAverage}% · Quiz avg {row.quizAverage}% · Practice {row.practiceAccuracy}% · Level {row.level}
            </small>
          </div>
        ))}
      </div>
    </article>
  );
}

function AttendancePanel({ lms }: { lms: LmsOverview | null }) {
  return (
    <article className="panel wide">
      <div className="panelHeader">
        <h2>Attendance</h2>
        <ClipboardCheck size={22} />
      </div>
      <div className="detectedGrid">
        <div><span>Present rate</span><strong>{lms?.attendanceSummary.presentRate ?? 0}%</strong></div>
        <div><span>Present</span><strong>{lms?.attendanceSummary.present ?? 0}</strong></div>
        <div><span>Absent</span><strong>{lms?.attendanceSummary.absent ?? 0}</strong></div>
        <div><span>Late</span><strong>{lms?.attendanceSummary.late ?? 0}</strong></div>
        <div><span>Excused</span><strong>{lms?.attendanceSummary.excused ?? 0}</strong></div>
      </div>
      <div className="mappingList">
        {(lms?.attendance ?? []).slice(0, 20).map((record) => (
          <div key={record.id}>
            <strong>{record.studentName}</strong>
            <span>{record.date} · {record.status}</span>
            {record.note ? <small>{record.note}</small> : null}
          </div>
        ))}
      </div>
    </article>
  );
}

function AttendanceManager({
  lms,
  runAction,
  token
}: {
  lms: LmsOverview | null;
  runAction: (id: string, action: () => Promise<void>) => Promise<void>;
  token: string | null;
}) {
  const firstClassId = lms?.classes[0]?.id ?? "";
  const [attendanceForm, setAttendanceForm] = useState({
    classId: firstClassId,
    date: new Date().toISOString().slice(0, 10)
  });
  const classId = attendanceForm.classId || firstClassId;
  const roster = (lms?.enrollments ?? []).filter((enrollment) => enrollment.classId === classId);

  return (
    <article className="panel wide">
      <div className="panelHeader">
        <h2>Attendance</h2>
        <ClipboardCheck size={22} />
      </div>
      <div className="formStack">
        <label>
          <span>Class</span>
          <select value={classId} onChange={(event) => setAttendanceForm((current) => ({ ...current, classId: event.target.value }))}>
            {(lms?.classes ?? []).map((item) => (
              <option key={item.id} value={item.id}>{item.name} {item.section}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Date</span>
          <input aria-label="Attendance date" type="date" value={attendanceForm.date} onChange={(event) => setAttendanceForm((current) => ({ ...current, date: event.target.value }))} />
        </label>
      </div>
      <div className="mappingList">
        {roster.map((student) => (
          <div key={student.studentUserId}>
            <strong>{student.studentName}</strong>
            <span>{attendanceForm.date}</span>
            <div className="wizardActions">
              {(["present", "absent", "late", "excused"] as const).map((status) => (
                <button
                  className={status === "present" ? "textButton" : "textButton secondary"}
                  key={status}
                  onClick={() =>
                    void runAction(`attendance-${student.studentUserId}-${status}`, () =>
                      markAttendance(token ?? "", {
                        classId,
                        date: attendanceForm.date,
                        records: [{ studentUserId: student.studentUserId, status }]
                      })
                    )
                  }
                  type="button"
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        ))}
        {!roster.length ? <EmptyState>No students are enrolled in this class yet.</EmptyState> : null}
      </div>
      <div className="detectedGrid">
        <div><span>Present rate</span><strong>{lms?.attendanceSummary.presentRate ?? 0}%</strong></div>
        <div><span>Present</span><strong>{lms?.attendanceSummary.present ?? 0}</strong></div>
        <div><span>Absent</span><strong>{lms?.attendanceSummary.absent ?? 0}</strong></div>
      </div>
    </article>
  );
}

function AdminView({
  activeSection,
  dashboard,
  busyId,
  lms,
  migrationSources,
  migrationWizard,
  people,
  runAction,
  setMigrationWizard,
  token
}: {
  activeSection: SectionId;
  dashboard: AreteDashboard;
  busyId: string | null;
  lms: LmsOverview | null;
  migrationSources: MigrationSource[];
  migrationWizard: MigrationWizard | null;
  people: Person[];
  runAction: (id: string, action: () => Promise<void>) => Promise<void>;
  setMigrationWizard: (wizard: MigrationWizard | null) => void;
  token: string | null;
}) {
  const teachers = people.filter((person) => person.roles.includes("teacher"));
  const [classForm, setClassForm] = useState({
    name: "Grade 8",
    section: "A",
    subject: "Mathematics",
    teacherUserId: teachers[0]?.id ?? ""
  });

  return (
    <section className="contentGrid">
      {activeSection === "migration" ? <article className="panel wide">
        <div className="panelHeader">
          <h2>Migration</h2>
          <UploadCloud size={22} />
        </div>

        <div className="sourceGrid">
          {migrationSources.map((source) => (
            <button
              className="sourceButton"
              key={source.id}
              onClick={() =>
                void runAction(`migration-${source.id}`, async () => {
                  setMigrationWizard(await createMigrationWizard(token ?? "", source.id));
                })
              }
              type="button"
            >
              <strong>{source.label}</strong>
              <span>{source.automaticImport.length ? source.automaticImport.join(", ") : "No import"}</span>
            </button>
          ))}
        </div>

        {migrationWizard ? (
          <div className="wizardBox">
            <div className="importTop">
              <div>
                <strong>{migrationWizard.source.replace("_", " ")}</strong>
                <span>{migrationWizard.step}</span>
              </div>
              <div className="wizardActions">
                <button
                  className="textButton"
                  disabled={busyId === `analyze-${migrationWizard.id}`}
                  onClick={() =>
                    void runAction(`analyze-${migrationWizard.id}`, async () => {
                      setMigrationWizard(await analyzeMigration(token ?? "", migrationWizard.id));
                    })
                  }
                  type="button"
                >
                  Analyze
                </button>
                <button
                  className="textButton secondary"
                  disabled={busyId === `validate-${migrationWizard.id}`}
                  onClick={() =>
                    void runAction(`validate-${migrationWizard.id}`, async () => {
                      setMigrationWizard(await validateMigration(token ?? "", migrationWizard.id));
                    })
                  }
                  type="button"
                >
                  Validate
                </button>
                <button
                  className="textButton secondary"
                  disabled={busyId === `skip-${migrationWizard.id}`}
                  onClick={() =>
                    void runAction(`skip-${migrationWizard.id}`, async () => {
                      setMigrationWizard(await skipInvalidMigrationRows(token ?? "", migrationWizard.id));
                    })
                  }
                  type="button"
                >
                  Skip invalid
                </button>
                <button
                  className="textButton secondary"
                  disabled={busyId === `commit-${migrationWizard.id}` || migrationWizard.canCommit === false}
                  onClick={() =>
                    void runAction(`commit-${migrationWizard.id}`, async () => {
                      setMigrationWizard(await commitMigration(token ?? "", migrationWizard.id));
                    })
                  }
                  type="button"
                >
                  Commit
                </button>
              </div>
            </div>
            <div className="detectedGrid">
              {Object.entries(migrationWizard.detected).map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            {migrationWizard.imported ? (
              <>
                <h2>Imported</h2>
                <div className="detectedGrid">
                  {Object.entries(migrationWizard.imported).map(([label, value]) => (
                    <div key={label}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            <h2>Mappings</h2>
            <div className="mappingList">
              {migrationWizard.mappings.map((mapping) => (
                <div key={mapping.sourceField}>
                  <strong>{mapping.sourceField}</strong>
                  <span>{mapping.targetField}</span>
                  <small>{mapping.confidence}% confidence</small>
                </div>
              ))}
            </div>

            <h2>Validation</h2>
            <div className="mappingList">
              {migrationWizard.issues.map((issue) => (
                <div className={issue.severity === "error" ? "issue error" : "issue"} key={`${issue.row}-${issue.field}`}>
                  <strong>Row {issue.row}: {issue.field}</strong>
                  <span>{issue.message}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {dashboard.admin.imports.map((job) => (
          <div className="importBox" key={job.id}>
            <div className="importTop">
              <div>
                <strong>{job.source}</strong>
                <span>{job.status.replace("_", " ")}</span>
              </div>
              <button
                className="textButton"
                disabled={busyId === job.id}
                onClick={() => void runAction(job.id, () => startImport(token ?? "", job.id))}
                type="button"
              >
                Start
              </button>
            </div>
            <div className="bar">
              <div style={{ width: `${job.progress}%` }} />
            </div>
          </div>
        ))}
      </article> : null}

      {activeSection === "classes" ? <article className="panel">
        <h2>Create class</h2>
        <div className="formStack">
          <label>
            <span>Class name</span>
            <input value={classForm.name} onChange={(event) => setClassForm((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label>
            <span>Section</span>
            <input value={classForm.section} onChange={(event) => setClassForm((current) => ({ ...current, section: event.target.value }))} />
          </label>
          <label>
            <span>Subject</span>
            <input value={classForm.subject} onChange={(event) => setClassForm((current) => ({ ...current, subject: event.target.value }))} />
          </label>
          <label>
            <span>Teacher</span>
            <select value={classForm.teacherUserId} onChange={(event) => setClassForm((current) => ({ ...current, teacherUserId: event.target.value }))}>
              <option value="">Unassigned</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>{teacher.displayName}</option>
              ))}
            </select>
          </label>
          <button
            className="textButton fullWidth"
            onClick={() =>
              void runAction("create-class", () => {
                const input = {
                  name: classForm.name,
                  section: classForm.section,
                  subject: classForm.subject
                };
                return createClass(token ?? "", classForm.teacherUserId ? { ...input, teacherUserId: classForm.teacherUserId } : input);
              })
            }
            type="button"
          >
            Create class
          </button>
        </div>
        <div className="toggleList">
          {dashboard.admin.tenantControls.map((control) => (
            <label key={control}>
              <input type="checkbox" defaultChecked={control !== "Leaderboard visibility"} />
              {control}
            </label>
          ))}
        </div>
      </article> : null}
      {activeSection === "attendance" ? <AttendanceManager lms={lms} runAction={runAction} token={token} /> : null}

      {activeSection === "overview" || activeSection === "analytics" ? <article className="panel">
        <h2>School analytics</h2>
        <div className="detectedGrid">
          {Object.entries(dashboard.operational ?? {}).map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </article> : null}

      {activeSection === "analytics" ? <GradebookPanel lms={lms} /> : null}

      {activeSection === "people" ? <PeoplePanel lms={lms} people={people} runAction={runAction} token={token} /> : null}
    </section>
  );
}

function PeoplePanel({
  lms,
  people,
  runAction,
  token
}: {
  lms: LmsOverview | null;
  people: Person[];
  runAction: (id: string, action: () => Promise<void>) => Promise<void>;
  token: string | null;
}) {
  const firstClass = lms?.classes[0];
  const students = people.filter((person) => person.roles.includes("student"));
  const parents = people.filter((person) => person.roles.includes("parent"));
  const [personForm, setPersonForm] = useState({
    email: "new.student@arete.local",
    displayName: "New Student",
    role: "student"
  });
  const [relationshipForm, setRelationshipForm] = useState({
    parentUserId: parents[0]?.id ?? "",
    studentUserId: students[0]?.id ?? "",
    classId: firstClass?.id ?? ""
  });
  const [peopleMode, setPeopleMode] = useState<"add" | "link" | "enroll" | "directory">("add");

  return (
    <article className="panel wide peopleWorkspace">
      <div className="workflowHeader">
        <div>
          <span className="sectionEyebrow">School setup</span>
          <h2>People and rosters</h2>
        </div>
        <span className="status approved">{people.length} people</span>
      </div>
      <div className="modeTabs" aria-label="People workflow">
        <button className={peopleMode === "add" ? "modeTab active" : "modeTab"} onClick={() => setPeopleMode("add")} type="button">Add person</button>
        <button className={peopleMode === "link" ? "modeTab active" : "modeTab"} onClick={() => setPeopleMode("link")} type="button">Link parent</button>
        <button className={peopleMode === "enroll" ? "modeTab active" : "modeTab"} onClick={() => setPeopleMode("enroll")} type="button">Enroll student</button>
        <button className={peopleMode === "directory" ? "modeTab active" : "modeTab"} onClick={() => setPeopleMode("directory")} type="button">Directory</button>
      </div>
      {peopleMode === "add" ? <div className="formStack single workflowForm">
        <label>
          <span>Name</span>
          <input value={personForm.displayName} onChange={(event) => setPersonForm((current) => ({ ...current, displayName: event.target.value }))} />
        </label>
        <label>
          <span>Email</span>
          <input value={personForm.email} onChange={(event) => setPersonForm((current) => ({ ...current, email: event.target.value }))} />
        </label>
        <label>
          <span>Role</span>
          <select value={personForm.role} onChange={(event) => setPersonForm((current) => ({ ...current, role: event.target.value }))}>
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="parent">Parent</option>
            <option value="school_admin">School Admin</option>
          </select>
        </label>
        <button
          className="textButton fullWidth"
          onClick={() =>
            void runAction("create-person", () =>
              createPerson(token ?? "", {
                email: personForm.email,
                displayName: personForm.displayName,
                roles: [personForm.role]
              }).then(() => undefined)
            )
          }
          type="button"
        >
          Add person
        </button>
      </div> : null}
      {peopleMode === "link" ? <div className="formStack single workflowForm">
        <label>
          <span>Parent</span>
          <select value={relationshipForm.parentUserId} onChange={(event) => setRelationshipForm((current) => ({ ...current, parentUserId: event.target.value }))}>
            <option value="">Select parent</option>
            {parents.map((parent) => (
              <option key={parent.id} value={parent.id}>{parent.displayName}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Student</span>
          <select value={relationshipForm.studentUserId} onChange={(event) => setRelationshipForm((current) => ({ ...current, studentUserId: event.target.value }))}>
            <option value="">Select student</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>{student.displayName}</option>
            ))}
          </select>
        </label>
        <button
          className="textButton fullWidth secondary"
          disabled={!relationshipForm.parentUserId || !relationshipForm.studentUserId}
          onClick={() =>
            void runAction("link-parent", () =>
              linkParent(token ?? "", {
                parentUserId: relationshipForm.parentUserId,
                studentUserId: relationshipForm.studentUserId
              })
            )
          }
          type="button"
        >
          Link parent
        </button>
      </div> : null}
      {peopleMode === "enroll" ? <div className="formStack single workflowForm">
        <label>
          <span>Class</span>
          <select value={relationshipForm.classId} onChange={(event) => setRelationshipForm((current) => ({ ...current, classId: event.target.value }))}>
            <option value="">Select class</option>
            {(lms?.classes ?? []).map((item) => (
              <option key={item.id} value={item.id}>{item.name} {item.section}</option>
            ))}
          </select>
        </label>
        <button
          className="textButton fullWidth secondary"
          disabled={!relationshipForm.classId || !relationshipForm.studentUserId}
          onClick={() =>
            void runAction(`enroll-${relationshipForm.studentUserId}`, () =>
              enrollStudent(token ?? "", {
                classId: relationshipForm.classId,
                studentUserId: relationshipForm.studentUserId
              })
            )
          }
          type="button"
        >
          Enroll student
        </button>
      </div> : null}
      {peopleMode === "directory" ? <div className="signalList peopleDirectory">
        {!people.length ? <EmptyState>No people have been added yet.</EmptyState> : null}
        {people.map((person) => (
          <div key={person.id}>
            <span>{person.email}</span>
            <strong>{person.displayName}</strong>
            <small>{person.roles.join(", ")}</small>
          </div>
        ))}
      </div> : null}
      {peopleMode === "directory" && lms?.enrollments.length ? (
        <>
          <h2>Roster</h2>
          <div className="mappingList">
            {lms.enrollments.map((enrollment) => (
              <div key={enrollment.id}>
                <strong>{enrollment.studentName}</strong>
                <span>{lms.classes.find((item) => item.id === enrollment.classId)?.name ?? enrollment.classId}</span>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </article>
  );
}

function PlatformView({
  activeSection,
  busyId,
  dashboard,
  lms,
  onOpenSchool,
  people,
  runAction,
  token
}: {
  activeSection: SectionId;
  busyId: string | null;
  dashboard: AreteDashboard;
  lms: LmsOverview | null;
  onOpenSchool: (schoolSlug: string) => Promise<void>;
  people: Person[];
  runAction: (id: string, action: () => Promise<void>) => Promise<void>;
  token: string | null;
}) {
  const [schoolForm, setSchoolForm] = useState({
    name: "Arete School",
    slug: "arete-school",
    adminEmail: "school.admin@arete.local",
    adminName: "School Admin",
    initialPassword: "Welcome@12345"
  });
  const [provisionedSchool, setProvisionedSchool] = useState<{ name: string; slug: string; adminEmail: string } | null>(null);

  return (
    <section className="contentGrid">
      {activeSection === "overview" || activeSection === "analytics" ? <article className="panel wide">
        <div className="panelHeader">
          <h2>Usage</h2>
          <ShieldCheck size={22} />
        </div>
        <div className="detectedGrid">
          <div><span>Schools</span><strong>{dashboard.platform.schools}</strong></div>
          <div><span>AI requests today</span><strong>{dashboard.platform.aiRequestsToday}</strong></div>
          <div><span>Estimated AI cost</span><strong>${dashboard.platform.estimatedAiCostUsd}</strong></div>
          <div><span>Failed jobs</span><strong>{dashboard.platform.failedJobs}</strong></div>
        </div>
      </article> : null}

      {activeSection === "overview" ? <article className="panel">
        <h2>Needs attention</h2>
        <div className="alertLine">
          <CircleAlert size={18} />
          <span>Review usage and active schools before changing plan settings.</span>
        </div>
        <div className="alertLine">
          <Users size={18} />
          <span>New schools open directly into their setup workspace.</span>
        </div>
      </article> : null}

      {activeSection === "overview" || activeSection === "schools" ? <article className="panel wide onboardingPanel">
        <div className="workflowHeader">
          <div>
            <span className="sectionEyebrow">School onboarding</span>
            <h2>Create a school workspace</h2>
          </div>
          <span className="status approved">Step 1 of 3</span>
        </div>
        <div className="onboardingLayout">
          <div className="formStack">
          <label>
            <span>School name</span>
            <input value={schoolForm.name} onChange={(event) => setSchoolForm((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label>
            <span>Slug</span>
            <input value={schoolForm.slug} onChange={(event) => setSchoolForm((current) => ({ ...current, slug: event.target.value }))} />
          </label>
          <label>
            <span>Admin name</span>
            <input value={schoolForm.adminName} onChange={(event) => setSchoolForm((current) => ({ ...current, adminName: event.target.value }))} />
          </label>
          <label>
            <span>Admin email</span>
            <input value={schoolForm.adminEmail} onChange={(event) => setSchoolForm((current) => ({ ...current, adminEmail: event.target.value }))} />
          </label>
            <label>
              <span>Temporary admin password</span>
              <input type="password" value={schoolForm.initialPassword} onChange={(event) => setSchoolForm((current) => ({ ...current, initialPassword: event.target.value }))} />
            </label>
            <button
              className="textButton fullWidth"
              onClick={() =>
                void runAction("create-school", async () => {
                  const result = await createSchool({ token: token ?? "", ...schoolForm });
                  setProvisionedSchool({ name: result.school.name, slug: result.school.slug, adminEmail: result.admin.email });
                })
              }
              type="button"
            >
              Create school workspace
            </button>
          </div>
          <aside className="onboardingChecklist">
            <strong>What happens next</strong>
            <span><Check size={16} /> School and first administrator are created</span>
            <span><Check size={16} /> Open the school to add classes and people</span>
            <span><Check size={16} /> Link parents and enroll students when ready</span>
          </aside>
        </div>
        {provisionedSchool ? (
          <div className="provisionedSchool">
            <div>
              <span className="sectionEyebrow">Ready</span>
              <strong>{provisionedSchool.name} is ready for setup</strong>
              <small>{provisionedSchool.adminEmail} is the first school administrator.</small>
            </div>
            <button className="textButton" disabled={busyId === "open-school"} onClick={() => void onOpenSchool(provisionedSchool.slug)} type="button">
              Open school setup
            </button>
          </div>
        ) : null}
      </article> : null}

      {activeSection === "people" ? <PeoplePanel lms={lms} people={people} runAction={runAction} token={token} /> : null}
    </section>
  );
}
