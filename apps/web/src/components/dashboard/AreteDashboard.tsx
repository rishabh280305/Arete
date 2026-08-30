"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Bell,
  BookOpen,
  Check,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Download,
  Flame,
  GraduationCap,
  RefreshCcw,
  ShieldCheck,
  UploadCloud,
  Users
} from "lucide-react";
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
  uploadMaterialFile,
  validateMigration,
  startImport
} from "../../lib/api";

type View = "student" | "teacher" | "parent" | "admin" | "platform";
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

const accountPresets: Record<string, { label: string; role: string }> = {
  "student@arete.local": { label: "Student", role: "student" },
  "teacher@arete.local": { label: "Teacher", role: "teacher" },
  "parent@arete.local": { label: "Parent", role: "parent" },
  "admin@arete.local": { label: "School Admin", role: "school_admin" },
  "owner@arete.local": { label: "Owner", role: "platform_admin" }
};

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

const viewPermissions: Record<View, string[]> = {
  student: ["student"],
  teacher: ["teacher", "school_admin"],
  parent: ["parent"],
  admin: ["school_admin"],
  platform: ["platform_admin"]
};

const sectionNav: Record<View, Array<{ id: SectionId; label: string }>> = {
  student: [
    { id: "overview", label: "Overview" },
    { id: "work", label: "Assignments" },
    { id: "practice", label: "Practice" },
    { id: "attendance", label: "Attendance" },
    { id: "library", label: "Materials" }
  ],
  teacher: [
    { id: "overview", label: "Overview" },
    { id: "author", label: "Author" },
    { id: "review", label: "Review" },
    { id: "library", label: "Library" },
    { id: "attendance", label: "Attendance" },
    { id: "classes", label: "Classes" }
  ],
  parent: [
    { id: "overview", label: "Overview" },
    { id: "children", label: "Children" },
    { id: "work", label: "Work" },
    { id: "attendance", label: "Attendance" },
    { id: "library", label: "Materials" }
  ],
  admin: [
    { id: "overview", label: "Overview" },
    { id: "people", label: "People" },
    { id: "classes", label: "Classes" },
    { id: "attendance", label: "Attendance" },
    { id: "migration", label: "Migration" },
    { id: "analytics", label: "Analytics" }
  ],
  platform: [
    { id: "overview", label: "Overview" },
    { id: "schools", label: "Schools" },
    { id: "people", label: "People" },
    { id: "analytics", label: "Analytics" }
  ]
};

export function AreteDashboardShell() {
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
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

    const section = sectionNav[activeView].find((item) => item.id === activeSection)?.label;
    return {
      student: "My day",
      teacher: "Review queue",
      parent: "Family",
      admin: `${dashboard.school.name} operations`,
      platform: "Control center"
    }[activeView] + (section ? ` / ${section}` : "");
  }, [activeSection, activeView, dashboard]);

  const visibleNav = dashboard
    ? nav.filter((item) => dashboard.user.roles.some((role) => viewPermissions[item.id].includes(role)))
    : nav;

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
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark">A</div>
          <strong>Arete</strong>
        </div>

        <section className="accountBox">
          <div>
            <span>{dashboard?.school.name ?? selectedSchoolSlug}</span>
            <strong>{dashboard?.user.displayName ?? selectedAccount}</strong>
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

        <nav>
          {visibleNav.map((item) => (
            <button
              className={item.id === activeView ? "navItem active" : "navItem"}
              key={item.id}
              onClick={() => setActiveView(item.id)}
              type="button"
            >
              {item.label}
              <ChevronRight size={16} />
            </button>
          ))}
        </nav>

        {dashboard ? (
          <nav className="sectionNav">
            <span>Sections</span>
            {sectionNav[activeView].map((item) => (
              <button
                className={item.id === activeSection ? "navItem sub active" : "navItem sub"}
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                type="button"
              >
                {item.label}
                <ChevronRight size={15} />
              </button>
            ))}
          </nav>
        ) : null}
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>{pageTitle}</h1>
            {dashboard ? <span>{dashboard.user.displayName} · {dashboard.school.name}</span> : null}
          </div>
          <div className="topActions">
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
              <PlatformView activeSection={activeSection} dashboard={dashboard} lms={lms} people={people} runAction={runAction} token={token} />
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
          <h1>One workspace for every school role.</h1>
          <p>Pick a login, enter the workspace, and work inside that role without the sidebar trying to be five products at once.</p>
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
  const question = lms?.practice[0];
  const quiz = lms?.quizzes.find((item) => item.status === "published");
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});

  return (
    <section className="contentGrid">
      {activeSection === "overview" || activeSection === "work" ? <article className="panel wide">
        <div className="panelHeader">
          <h2>Today</h2>
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
        </div>
      </article> : null}

      {activeSection === "overview" || activeSection === "practice" || activeSection === "library" ? <article className="panel">
        <div className="scoreStack">
          <div><Flame size={22} /> {lms?.progress.streakDays ?? dashboard.student.streakDays} days</div>
          <div><ClipboardCheck size={22} /> {lms?.progress.xp ?? dashboard.student.xp} XP</div>
          <div><BarChart3 size={22} /> Level {lms?.progress.level ?? dashboard.student.level}</div>
        </div>
        <h2>Practice focus</h2>
        <div className="chips">
          {((lms?.progress.achievements.length ? lms.progress.achievements : dashboard.student.weakAreas)).map((area) => (
            <span key={area}>{area}</span>
          ))}
        </div>
        {question ? (
          <div className="practiceCard">
            <h2>Practice</h2>
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
            {practiceResult ? <p className="resultLine">{practiceResult}</p> : null}
            {lms ? <small>{lms.progress.attempts} attempts · {lms.progress.accuracy}% accuracy</small> : null}
          </div>
        ) : null}
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
        ) : null}
        {(lms?.materials ?? []).length ? (
          <div className={activeSection === "library" ? "practiceCard libraryFocus" : "practiceCard"}>
            <h2>Materials</h2>
            {(lms?.materials ?? []).slice(0, 4).map((material) => (
              <div className="activityItem" key={material.id}>
                <div>
                  <strong>{material.title}</strong>
                  <span>{material.filename ?? material.content}</span>
                </div>
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
        ) : null}
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

  return (
    <section className="contentGrid">
      {activeSection === "overview" || activeSection === "review" ? <article className="panel wide">
        <div className="panelHeader">
          <h2>AI drafts</h2>
          <BookOpen size={22} />
        </div>
        <div className="reviewList">
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

      {activeSection === "overview" || activeSection === "author" || activeSection === "classes" ? <article className="panel">
        <h2>Author</h2>
        <div className="formStack">
          <label>
            <span>Assignment class</span>
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
            <span>Assignment title</span>
            <input value={assignmentForm.title} onChange={(event) => setAssignmentForm((current) => ({ ...current, title: event.target.value }))} />
          </label>
          <label>
            <span>Instructions</span>
            <textarea value={assignmentForm.instructions} onChange={(event) => setAssignmentForm((current) => ({ ...current, instructions: event.target.value }))} />
          </label>
          <label>
            <span>Due</span>
            <input type="datetime-local" value={assignmentForm.dueAt} onChange={(event) => setAssignmentForm((current) => ({ ...current, dueAt: event.target.value }))} />
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
            Create assignment
          </button>

          <label>
            <span>AI topic</span>
            <input value={aiForm.topic} onChange={(event) => setAiForm((current) => ({ ...current, topic: event.target.value }))} />
          </label>
          <label>
            <span>Draft count</span>
            <input
              min={1}
              max={5}
              type="number"
              value={aiForm.questionCount}
              onChange={(event) => setAiForm((current) => ({ ...current, questionCount: Number(event.target.value) }))}
            />
          </label>
          <button
            className="textButton fullWidth secondary"
            onClick={() =>
              void runAction("generate-ai", () =>
                generateAiDrafts(token ?? "", { topic: aiForm.topic, questionCount: aiForm.questionCount })
              )
            }
            type="button"
          >
            Generate drafts
          </button>
        </div>

        <h2>Classes</h2>
        <div className="signalList">
          {(lms?.classes ?? []).map((item) => (
            <div key={item.id}>
              <span>{item.name} {item.section}</span>
              <strong>{item.subject}</strong>
              <small>{item.studentCount} students</small>
            </div>
          ))}
        </div>
      </article> : null}

      {activeSection === "author" ? <article className="panel">
        <h2>Materials</h2>
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
            <span>Title</span>
            <input value={materialForm.title} onChange={(event) => setMaterialForm((current) => ({ ...current, title: event.target.value }))} />
          </label>
          <label>
            <span>Kind</span>
            <select value={materialForm.kind} onChange={(event) => setMaterialForm((current) => ({ ...current, kind: event.target.value as "link" | "note" | "file" }))}>
              <option value="note">Note</option>
              <option value="link">Link</option>
              <option value="file">File</option>
            </select>
          </label>
          <label>
            <span>Content</span>
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
      </article> : null}

      {activeSection === "author" ? <article className="panel">
        <h2>Quiz</h2>
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
            <span>Options 1</span>
            <input value={quizForm.optionOne} onChange={(event) => setQuizForm((current) => ({ ...current, optionOne: event.target.value }))} />
          </label>
          <label>
            <span>Correct option 1</span>
            <input min={1} max={4} type="number" value={quizForm.correctOne + 1} onChange={(event) => setQuizForm((current) => ({ ...current, correctOne: Number(event.target.value) - 1 }))} />
          </label>
          <label>
            <span>Explanation 1</span>
            <input value={quizForm.explanationOne} onChange={(event) => setQuizForm((current) => ({ ...current, explanationOne: event.target.value }))} />
          </label>
          <label>
            <span>Question 2</span>
            <textarea value={quizForm.questionTwo} onChange={(event) => setQuizForm((current) => ({ ...current, questionTwo: event.target.value }))} />
          </label>
          <label>
            <span>Options 2</span>
            <input value={quizForm.optionTwo} onChange={(event) => setQuizForm((current) => ({ ...current, optionTwo: event.target.value }))} />
          </label>
          <label>
            <span>Correct option 2</span>
            <input min={1} max={4} type="number" value={quizForm.correctTwo + 1} onChange={(event) => setQuizForm((current) => ({ ...current, correctTwo: Number(event.target.value) - 1 }))} />
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
            Create and publish
          </button>
          <button
            className="textButton fullWidth secondary"
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
            Publish from bank
          </button>
        </div>
      </article> : null}

      {activeSection === "overview" || activeSection === "review" ? <article className="panel">
        <h2>Submissions</h2>
        <div className="signalList">
          {(lms?.submissions ?? []).map((submission) => (
            <div key={submission.id}>
              <span>{submission.studentName}</span>
              <strong>{submission.status === "graded" ? `${submission.score}%` : "Ready to grade"}</strong>
              <small>{submission.response}</small>
              {submission.status !== "graded" ? (
                <button
                  className="textButton fullWidth"
                  onClick={() =>
                    void runAction(`grade-${submission.id}`, () =>
                      gradeSubmission(token ?? "", {
                        submissionId: submission.id,
                        score: 92,
                        feedback: "Strong work. Check the explanation for a cleaner final step."
                      })
                    )
                  }
                  type="button"
                >
                  Grade
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </article> : null}

      {activeSection === "review" ? <GradebookPanel lms={lms} /> : null}

      {activeSection === "library" || activeSection === "review" ? <article className="panel wide">
        <h2>Materials</h2>
        <div className="mappingList">
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

      {activeSection === "overview" || activeSection === "classes" ? <article className="panel">
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
      {activeSection === "attendance" ? <AttendanceManager lms={lms} runAction={runAction} token={token} /> : null}
    </section>
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
      {activeSection === "overview" || activeSection === "migration" ? <article className="panel wide">
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

      {activeSection === "overview" || activeSection === "classes" ? <article className="panel">
        <h2>Controls</h2>
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

      {activeSection === "overview" || activeSection === "people" ? <PeoplePanel lms={lms} people={people} runAction={runAction} token={token} /> : null}
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

  return (
    <article className="panel">
      <h2>People</h2>
      <div className="formStack">
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
          Create person
        </button>
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
      </div>
      <div className="signalList">
        {people.map((person) => (
          <div key={person.id}>
            <span>{person.email}</span>
            <strong>{person.displayName}</strong>
            <small>{person.roles.join(", ")}</small>
          </div>
        ))}
      </div>
      {lms?.enrollments.length ? (
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
  dashboard,
  lms,
  people,
  runAction,
  token
}: {
  activeSection: SectionId;
  dashboard: AreteDashboard;
  lms: LmsOverview | null;
  people: Person[];
  runAction: (id: string, action: () => Promise<void>) => Promise<void>;
  token: string | null;
}) {
  const [schoolForm, setSchoolForm] = useState({
    name: "Arete School",
    slug: "arete-school",
    adminEmail: "school.admin@arete.local",
    adminName: "School Admin"
  });

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
          <span>3 failed jobs are waiting for retry review.</span>
        </div>
        <div className="alertLine">
          <Users size={18} />
          <span>2 schools are mid-onboarding.</span>
        </div>
      </article> : null}

      {activeSection === "overview" || activeSection === "schools" ? <article className="panel">
        <h2>Schools</h2>
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
        <button
          className="textButton fullWidth"
          onClick={() =>
            void runAction("create-school", () =>
              createSchool({
                name: schoolForm.name,
                slug: schoolForm.slug,
                adminEmail: schoolForm.adminEmail,
                adminName: schoolForm.adminName
              }).then(() => undefined)
            )
          }
          type="button"
        >
          Create school
        </button>
        </div>
      </article> : null}

      {activeSection === "people" ? <PeoplePanel lms={lms} people={people} runAction={runAction} token={token} /> : null}
    </section>
  );
}
