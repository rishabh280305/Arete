import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  type MobileActivity,
  type MobileDashboard,
  type MobileLmsOverview,
  type MobileMigrationSource,
  type MobileMigrationWizard,
  type MobilePerson,
  analyzeMobileMigration,
  approveMobileQuestion,
  commitMobileMigration,
  createMobileAssignment,
  createMobileClass,
  createMobileMaterial,
  createMobileMigrationWizard,
  createMobilePerson,
  createMobileQuiz,
  createMobileQuizFromBank,
  createMobileSchool,
  enrollMobileStudent,
  fetchMobileActivity,
  fetchMobileDashboard,
  fetchMobileLms,
  fetchMobileMigrationSources,
  fetchMobilePeople,
  generateMobileAiDrafts,
  gradeMobileSubmission,
  linkMobileParent,
  loginMobile,
  markMobileAttendance,
  markMobileNotificationRead,
  publishMobileQuiz,
  skipInvalidMobileRows,
  startMobileImport,
  submitMobileAssignment,
  submitMobilePractice,
  submitMobileQuiz
} from "./src/api";

const roles = ["Student", "Teacher", "Parent", "Admin", "Owner"] as const;
type RoleTab = (typeof roles)[number];

const roleAccounts: Record<RoleTab, { email: string; role: string }> = {
  Student: { email: "student@arete.local", role: "student" },
  Teacher: { email: "teacher@arete.local", role: "teacher" },
  Parent: { email: "parent@arete.local", role: "parent" },
  Admin: { email: "admin@arete.local", role: "school_admin" },
  Owner: { email: "owner@arete.local", role: "platform_admin" }
};

const sectionMap: Record<RoleTab, string[]> = {
  Student: ["Overview", "Assignments", "Practice", "Attendance", "Materials"],
  Teacher: ["Overview", "Author", "Review", "Library", "Attendance", "Classes"],
  Parent: ["Overview", "Children", "Work", "Attendance", "Materials"],
  Admin: ["Overview", "People", "Classes", "Attendance", "Migration", "Analytics"],
  Owner: ["Overview", "Schools", "People", "Analytics"]
};

export default function App() {
  const [activeTab, setActiveTab] = useState<RoleTab>("Student");
  const [section, setSection] = useState("Overview");
  const [schoolSlug, setSchoolSlug] = useState("northview");
  const [loginEmail, setLoginEmail] = useState(roleAccounts.Student.email);
  const [token, setToken] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<MobileDashboard | null>(null);
  const [lms, setLms] = useState<MobileLmsOverview | null>(null);
  const [activity, setActivity] = useState<MobileActivity | null>(null);
  const [migrationSources, setMigrationSources] = useState<MobileMigrationSource[]>([]);
  const [wizard, setWizard] = useState<MobileMigrationWizard | null>(null);
  const [people, setPeople] = useState<MobilePerson[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [message, setMessage] = useState("Sign in to continue");

  const account = roleAccounts[activeTab];
  const sections = sectionMap[activeTab];

  useEffect(() => {
    setSection("Overview");
    setLoginEmail(roleAccounts[activeTab].email);
  }, [activeTab]);

  async function signIn() {
    try {
      setMessage("Signing in");
      const result = await loginMobile(loginEmail, account.role, schoolSlug);
      setToken(result.accessToken);
      await refresh(result.accessToken);
      setMigrationSources(await fetchMobileMigrationSources());
      setMessage("Connected");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not connect");
    }
  }

  async function refresh(nextToken = token) {
    if (!nextToken) {
      return;
    }
    const [nextDashboard, nextLms, nextActivity] = await Promise.all([
      fetchMobileDashboard(nextToken),
      fetchMobileLms(nextToken),
      fetchMobileActivity(nextToken)
    ]);
    setDashboard(nextDashboard);
    setLms(nextLms);
    setActivity(nextActivity);
    setPeople(await fetchMobilePeople(nextToken));
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={styles.brandMark}>
            <Text style={styles.brandLetter}>A</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Arete</Text>
            <Text style={styles.muted}>{dashboard ? `${dashboard.user.displayName} / ${dashboard.school.name}` : message}</Text>
          </View>
        </View>

        <View style={styles.formStack}>
          <Text style={styles.label}>School slug</Text>
          <TextInput autoCapitalize="none" onChangeText={setSchoolSlug} style={styles.input} value={schoolSlug} />
          <Text style={styles.label}>Email</Text>
          <TextInput autoCapitalize="none" onChangeText={setLoginEmail} style={styles.input} value={loginEmail} />
        </View>

        <View style={styles.chipRow}>
          {roles.map((tab) => (
            <Pressable key={tab} onPress={() => setActiveTab(tab)} style={activeTab === tab ? [styles.chip, styles.activeChip] : styles.chip}>
              <Text style={styles.chipText}>{tab}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.chipRow}>
          {sections.map((item) => (
            <Pressable key={item} onPress={() => setSection(item)} style={section === item ? [styles.sectionChip, styles.activeSectionChip] : styles.sectionChip}>
              <Text style={styles.sectionText}>{item}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.action} onPress={() => void signIn()}>
          <Text style={styles.actionText}>Sign in</Text>
        </Pressable>
      </View>

      {dashboard ? (
        <>
          <MetricRow activeTab={activeTab} dashboard={dashboard} lms={lms} />
          <Notifications activity={activity} refresh={refresh} token={token} />

          {activeTab === "Student" ? (
            <StudentView
              dashboard={dashboard}
              lms={lms}
              quizAnswers={quizAnswers}
              refresh={refresh}
              section={section}
              setMessage={setMessage}
              setQuizAnswers={setQuizAnswers}
              token={token}
            />
          ) : null}
          {activeTab === "Teacher" ? (
            <TeacherView dashboard={dashboard} lms={lms} refresh={refresh} section={section} setMessage={setMessage} token={token} />
          ) : null}
          {activeTab === "Parent" ? <ParentView dashboard={dashboard} lms={lms} section={section} /> : null}
          {activeTab === "Admin" ? (
            <AdminView
              activity={activity}
              dashboard={dashboard}
              lms={lms}
              migrationSources={migrationSources}
              people={people}
              refresh={refresh}
              section={section}
              setWizard={setWizard}
              token={token}
              wizard={wizard}
            />
          ) : null}
          {activeTab === "Owner" ? (
            <OwnerView dashboard={dashboard} lms={lms} people={people} refresh={refresh} section={section} setMessage={setMessage} token={token} />
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

function MetricRow({
  activeTab,
  dashboard,
  lms
}: {
  activeTab: RoleTab;
  dashboard: MobileDashboard;
  lms: MobileLmsOverview | null;
}) {
  const metrics = useMemo(() => {
    if (activeTab === "Owner") {
      return [
        { icon: "business-outline" as const, label: "Schools", value: String(dashboard.platform.schools) },
        { icon: "flash-outline" as const, label: "AI requests", value: String(dashboard.platform.aiRequestsToday) }
      ];
    }
    if (activeTab === "Admin") {
      return [
        { icon: "people-outline" as const, label: "People", value: String(lms?.enrollments.length ?? 0) },
        { icon: "albums-outline" as const, label: "Classes", value: String(lms?.classes.length ?? 0) }
      ];
    }
    return [
      { icon: "flame-outline" as const, label: "Streak", value: `${lms?.progress.streakDays ?? dashboard.student.streakDays} days` },
      { icon: "checkmark-circle-outline" as const, label: "XP", value: String(lms?.progress.xp ?? dashboard.student.xp) }
    ];
  }, [activeTab, dashboard, lms]);

  return (
    <View style={styles.metricRow}>
      {metrics.map((metric) => (
        <Metric icon={metric.icon} key={metric.label} label={metric.label} value={metric.value} />
      ))}
    </View>
  );
}

function Notifications({
  activity,
  refresh,
  token
}: {
  activity: MobileActivity | null;
  refresh: (nextToken?: string | null) => Promise<void>;
  token: string | null;
}) {
  const notifications = activity?.notifications.slice(0, 3) ?? [];
  if (!notifications.length) {
    return null;
  }
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Notifications</Text>
      {notifications.map((notice) => (
        <View style={styles.rowCard} key={notice.id}>
          <Ionicons color="#3563ff" name={notice.read ? "notifications-outline" : "notifications"} size={18} />
          <View style={styles.flex}>
            <Text style={styles.taskTitle}>{notice.message}</Text>
            <Text style={styles.muted}>{new Date(notice.createdAt).toLocaleString()}</Text>
          </View>
          {!notice.read ? (
            <Pressable
              style={styles.smallAction}
              onPress={async () => {
                if (token) {
                  await markMobileNotificationRead(token, notice.id);
                  await refresh(token);
                }
              }}
            >
              <Text style={styles.smallActionText}>Read</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function StudentView({
  dashboard,
  lms,
  quizAnswers,
  refresh,
  section,
  setMessage,
  setQuizAnswers,
  token
}: {
  dashboard: MobileDashboard;
  lms: MobileLmsOverview | null;
  quizAnswers: Record<string, number>;
  refresh: (nextToken?: string | null) => Promise<void>;
  section: string;
  setMessage: (message: string) => void;
  setQuizAnswers: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  token: string | null;
}) {
  const showAssignments = section === "Overview" || section === "Assignments";
  const showPractice = section === "Overview" || section === "Practice";
  const quiz = lms?.quizzes.find((item) => item.status === "published");

  return (
    <>
      {showAssignments ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Assignments</Text>
          {dashboard.student.dueToday.map((task) => (
            <View style={styles.rowCard} key={task.id}>
              <View style={styles.flex}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <Text style={styles.muted}>{task.subject}</Text>
              </View>
              <Text style={styles.score}>{task.progress}%</Text>
            </View>
          ))}
          {(lms?.assignments ?? []).map((assignment) => {
            const submission = lms?.submissions.find((item) => item.assignmentId === assignment.id);
            return (
              <View style={styles.rowCard} key={assignment.id}>
                <View style={styles.flex}>
                  <Text style={styles.taskTitle}>{assignment.title}</Text>
                  <Text style={styles.muted}>{submission ? submission.status : "Not submitted"}</Text>
                </View>
                <Pressable
                  style={styles.smallAction}
                  onPress={async () => {
                    if (token) {
                      await submitMobileAssignment(token, {
                        assignmentId: assignment.id,
                        response: `Submitted from mobile at ${new Date().toLocaleString()}`
                      });
                      await refresh(token);
                    }
                  }}
                >
                  <Text style={styles.smallActionText}>Submit</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ) : null}

      {showPractice ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Practice</Text>
          {(lms?.progress.achievements ?? []).map((achievement) => (
            <View style={styles.rowCard} key={achievement}>
              <Ionicons color="#2f8f52" name="trophy-outline" size={18} />
              <Text style={styles.taskTitle}>{achievement}</Text>
            </View>
          ))}
          {(lms?.practice ?? []).slice(0, 1).map((question) => (
            <View style={styles.blockCard} key={question.id}>
              <Text style={styles.taskTitle}>{question.prompt}</Text>
              {question.options.map((option, index) => (
                <Pressable
                  key={option}
                  style={styles.option}
                  onPress={async () => {
                    if (token) {
                      const result = await submitMobilePractice(token, { questionId: question.id, selectedIndex: index });
                      setMessage(`${result.correct ? "Correct" : "Review"}: ${result.explanation}`);
                      await refresh(token);
                    }
                  }}
                >
                  <Text style={styles.optionText}>{option}</Text>
                </Pressable>
              ))}
            </View>
          ))}
          {quiz ? (
            <View style={styles.blockCard}>
              <Text style={styles.taskTitle}>{quiz.title}</Text>
              {quiz.questions.map((question) => (
                <View key={question.id} style={styles.formStack}>
                  <Text style={styles.muted}>{question.prompt}</Text>
                  {question.options.map((option, optionIndex) => (
                    <Pressable
                      key={option}
                      style={quizAnswers[question.id] === optionIndex ? [styles.option, styles.selectedOption] : styles.option}
                      onPress={() => setQuizAnswers((current) => ({ ...current, [question.id]: optionIndex }))}
                    >
                      <Text style={styles.optionText}>{option}</Text>
                    </Pressable>
                  ))}
                </View>
              ))}
              <Pressable
                style={styles.action}
                onPress={async () => {
                  if (token && quiz.questions.every((question) => quizAnswers[question.id] !== undefined)) {
                    const result = await submitMobileQuiz(token, {
                      quizId: quiz.id,
                      answers: quiz.questions.map((question) => quizAnswers[question.id] ?? 0)
                    });
                    setQuizAnswers({});
                    setMessage(`${result.score}% / ${result.correct}/${result.total}`);
                    await refresh(token);
                  }
                }}
              >
                <Text style={styles.actionText}>Submit quiz</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}

      {section === "Materials" ? <MaterialsPanel materials={lms?.materials ?? []} /> : null}
      {section === "Attendance" ? <AttendancePanel lms={lms} /> : null}
    </>
  );
}

function TeacherView({
  dashboard,
  lms,
  refresh,
  section,
  token
}: {
  dashboard: MobileDashboard;
  lms: MobileLmsOverview | null;
  refresh: (nextToken?: string | null) => Promise<void>;
  section: string;
  setMessage: (message: string) => void;
  token: string | null;
}) {
  const firstClassId = lms?.classes[0]?.id ?? "class-8a";
  const [author, setAuthor] = useState({
    topic: "Linear equations",
    title: "Mobile quick check",
    material: "Balance both sides and isolate the variable.",
    assignment: "Practice set",
    instructions: "Show your working."
  });

  if (section === "Author" || section === "Overview") {
    return (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Author</Text>
        <TextInput style={styles.input} value={author.topic} onChangeText={(topic) => setAuthor((current) => ({ ...current, topic }))} />
        <Pressable
          style={styles.action}
          onPress={async () => {
            if (token) {
              await generateMobileAiDrafts(token, { topic: author.topic, questionCount: 2 });
              await refresh(token);
            }
          }}
        >
          <Text style={styles.actionText}>Generate drafts</Text>
        </Pressable>
        <TextInput style={styles.input} value={author.assignment} onChangeText={(assignment) => setAuthor((current) => ({ ...current, assignment }))} />
        <TextInput style={styles.input} value={author.instructions} onChangeText={(instructions) => setAuthor((current) => ({ ...current, instructions }))} />
        <Pressable
          style={styles.action}
          onPress={async () => {
            if (token) {
              await createMobileAssignment(token, {
                classId: firstClassId,
                title: author.assignment,
                instructions: author.instructions,
                dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString()
              });
              await refresh(token);
            }
          }}
        >
          <Text style={styles.actionText}>Create assignment</Text>
        </Pressable>
        <TextInput style={styles.input} value={author.material} onChangeText={(material) => setAuthor((current) => ({ ...current, material }))} />
        <Pressable
          style={styles.action}
          onPress={async () => {
            if (token) {
              await createMobileMaterial(token, {
                classId: firstClassId,
                title: author.topic,
                kind: "note",
                content: author.material
              });
              await refresh(token);
            }
          }}
        >
          <Text style={styles.actionText}>Save material</Text>
        </Pressable>
        <TextInput style={styles.input} value={author.title} onChangeText={(title) => setAuthor((current) => ({ ...current, title }))} />
        <Pressable
          style={styles.action}
          onPress={async () => {
            if (token) {
              const quiz = await createMobileQuiz(token, {
                classId: firstClassId,
                title: author.title,
                questions: [
                  {
                    prompt: "Solve: x + 5 = 9",
                    options: ["2", "4", "5", "14"],
                    correctIndex: 1,
                    explanation: "Subtract 5 from both sides."
                  }
                ]
              });
              await publishMobileQuiz(token, quiz.id);
              await refresh(token);
            }
          }}
        >
          <Text style={styles.actionText}>Create quiz</Text>
        </Pressable>
      </View>
    );
  }

  if (section === "Review") {
    return (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Review</Text>
        {dashboard.teacher.drafts.map((draft) => (
          <View style={styles.rowCard} key={draft.id}>
            <View style={styles.flex}>
              <Text style={styles.taskTitle}>{draft.prompt}</Text>
              <Text style={styles.muted}>{draft.topic}</Text>
            </View>
            <Pressable
              style={styles.smallAction}
              onPress={async () => {
                if (token) {
                  await approveMobileQuestion(token, draft.id);
                  await refresh(token);
                }
              }}
            >
              <Text style={styles.smallActionText}>{draft.status === "approved" ? "Approved" : "Approve"}</Text>
            </Pressable>
          </View>
        ))}
        {(lms?.submissions ?? []).map((submission) => (
          <View style={styles.rowCard} key={submission.id}>
            <View style={styles.flex}>
              <Text style={styles.taskTitle}>{submission.studentName}</Text>
              <Text style={styles.muted}>{submission.status === "graded" ? `${submission.score}%` : submission.response}</Text>
            </View>
            {submission.status !== "graded" ? (
              <Pressable
                style={styles.smallAction}
                onPress={async () => {
                  if (token) {
                    await gradeMobileSubmission(token, {
                      submissionId: submission.id,
                      score: 92,
                      feedback: "Strong work. Review the final step."
                    });
                    await refresh(token);
                  }
                }}
              >
                <Text style={styles.smallActionText}>Grade</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>
    );
  }

  if (section === "Library") {
    return (
      <>
        <MaterialsPanel materials={lms?.materials ?? []} />
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Quizzes</Text>
          {(lms?.quizzes ?? []).map((quiz) => (
            <View style={styles.rowCard} key={quiz.id}>
              <View style={styles.flex}>
                <Text style={styles.taskTitle}>{quiz.title}</Text>
                <Text style={styles.muted}>{quiz.status} / {quiz.questions.length} questions</Text>
              </View>
            </View>
          ))}
          <Pressable
            style={styles.action}
            onPress={async () => {
              if (token) {
                const questionIds = (lms?.questionBank ?? []).filter((question) => question.approved).slice(0, 3).map((question) => question.id);
                const quiz = await createMobileQuizFromBank(token, {
                  classId: firstClassId,
                  title: `Bank quiz ${new Date().toLocaleTimeString()}`,
                  questionIds
                });
                await publishMobileQuiz(token, quiz.id);
                await refresh(token);
              }
            }}
          >
            <Text style={styles.actionText}>Publish from bank</Text>
          </Pressable>
        </View>
      </>
    );
  }

  if (section === "Attendance") {
    return <AttendanceManager lms={lms} refresh={refresh} token={token} />;
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Classes</Text>
      {(lms?.classes ?? []).map((item) => (
        <View style={styles.rowCard} key={item.id}>
          <View style={styles.flex}>
            <Text style={styles.taskTitle}>{item.name} {item.section}</Text>
            <Text style={styles.muted}>{item.subject} / {item.studentCount} students</Text>
          </View>
        </View>
      ))}
      {(lms?.leaderboard ?? []).map((row, index) => (
        <View style={styles.rowCard} key={row.studentUserId}>
          <Text style={styles.taskTitle}>{index + 1}. {row.studentName}</Text>
          <Text style={styles.muted}>{row.xp} XP / {row.average}%</Text>
        </View>
      ))}
    </View>
  );
}

function ParentView({ dashboard, lms, section }: { dashboard: MobileDashboard; lms: MobileLmsOverview | null; section: string }) {
  const showChildren = section === "Overview" || section === "Children";
  const showWork = section === "Overview" || section === "Work";
  return (
    <>
      {showChildren ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Children</Text>
          {dashboard.parent.children.map((child) => (
            <View style={styles.rowCard} key={child.name}>
              <View style={styles.flex}>
                <Text style={styles.taskTitle}>{child.name}</Text>
                <Text style={styles.muted}>{child.quizAverage} average / {child.assignmentsDue} due</Text>
                <Text style={styles.muted}>{child.focusAreas.join(", ")}</Text>
              </View>
              <Text style={styles.score}>{child.streakDays}d</Text>
            </View>
          ))}
        </View>
      ) : null}
      {showWork ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Work</Text>
          {(lms?.submissions ?? []).map((submission) => (
            <View style={styles.rowCard} key={submission.id}>
              <View style={styles.flex}>
                <Text style={styles.taskTitle}>{submission.status === "graded" ? `${submission.score}%` : "Submitted"}</Text>
                <Text style={styles.muted}>{submission.feedback ?? submission.response}</Text>
              </View>
            </View>
          ))}
          {(lms?.quizAttempts ?? []).map((attempt) => (
            <View style={styles.rowCard} key={attempt.id}>
              <Text style={styles.taskTitle}>{attempt.studentName}</Text>
              <Text style={styles.score}>{attempt.score}%</Text>
            </View>
          ))}
        </View>
      ) : null}
      {section === "Materials" ? <MaterialsPanel materials={lms?.materials ?? []} /> : null}
      {section === "Attendance" ? <AttendancePanel lms={lms} /> : null}
    </>
  );
}

function AdminView({
  activity,
  dashboard,
  lms,
  migrationSources,
  people,
  refresh,
  section,
  setWizard,
  token,
  wizard
}: {
  activity: MobileActivity | null;
  dashboard: MobileDashboard;
  lms: MobileLmsOverview | null;
  migrationSources: MobileMigrationSource[];
  people: MobilePerson[];
  refresh: (nextToken?: string | null) => Promise<void>;
  section: string;
  setWizard: (wizard: MobileMigrationWizard | null) => void;
  token: string | null;
  wizard: MobileMigrationWizard | null;
}) {
  const teachers = people.filter((person) => person.roles.includes("teacher"));
  const [classForm, setClassForm] = useState({
    name: "Grade 8",
    section: "A",
    subject: "Mathematics",
    teacherUserId: teachers[0]?.id ?? ""
  });

  if (section === "People" || section === "Overview") {
    return <PeoplePanel lms={lms} people={people} refresh={refresh} token={token} />;
  }

  if (section === "Classes") {
    return (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Classes</Text>
        <TextInput style={styles.input} value={classForm.name} onChangeText={(name) => setClassForm((current) => ({ ...current, name }))} />
        <TextInput style={styles.input} value={classForm.section} onChangeText={(nextSection) => setClassForm((current) => ({ ...current, section: nextSection }))} />
        <TextInput style={styles.input} value={classForm.subject} onChangeText={(subject) => setClassForm((current) => ({ ...current, subject }))} />
        <View style={styles.chipRow}>
          {teachers.map((teacher) => (
            <Pressable
              key={teacher.id}
              onPress={() => setClassForm((current) => ({ ...current, teacherUserId: teacher.id }))}
              style={classForm.teacherUserId === teacher.id ? [styles.sectionChip, styles.activeSectionChip] : styles.sectionChip}
            >
              <Text style={styles.sectionText}>{teacher.displayName}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          style={styles.action}
          onPress={async () => {
            if (token) {
              const input = { name: classForm.name, section: classForm.section, subject: classForm.subject };
              await createMobileClass(token, classForm.teacherUserId ? { ...input, teacherUserId: classForm.teacherUserId } : input);
              await refresh(token);
            }
          }}
        >
          <Text style={styles.actionText}>Create class</Text>
        </Pressable>
        {(lms?.classes ?? []).map((item) => (
          <View style={styles.rowCard} key={item.id}>
            <View style={styles.flex}>
              <Text style={styles.taskTitle}>{item.name} {item.section}</Text>
              <Text style={styles.muted}>{item.subject}</Text>
            </View>
            <Text style={styles.score}>{item.studentCount}</Text>
          </View>
        ))}
      </View>
    );
  }

  if (section === "Attendance") {
    return <AttendanceManager lms={lms} refresh={refresh} token={token} />;
  }

  if (section === "Migration") {
    return (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Migration</Text>
        {dashboard.admin.imports.map((job) => (
          <View style={styles.rowCard} key={job.id}>
            <View style={styles.flex}>
              <Text style={styles.taskTitle}>{job.source}</Text>
              <Text style={styles.muted}>{job.detected.students ?? 0} students / {job.detected.invalidRecords ?? 0} issues</Text>
            </View>
            <Pressable
              style={styles.smallAction}
              onPress={async () => {
                if (token) {
                  await startMobileImport(token, job.id);
                  await refresh(token);
                }
              }}
            >
              <Text style={styles.smallActionText}>Start</Text>
            </Pressable>
          </View>
        ))}
        <View style={styles.formStack}>
          {migrationSources.map((source) => (
            <Pressable
              key={source.id}
              style={styles.option}
              onPress={async () => {
                if (token) {
                  setWizard(await createMobileMigrationWizard(token, source.id));
                }
              }}
            >
              <Text style={styles.optionText}>{source.label}</Text>
            </Pressable>
          ))}
        </View>
        {wizard ? (
          <View style={styles.blockCard}>
            <Text style={styles.taskTitle}>{wizard.source.replace("_", " ")} / {wizard.step}</Text>
            <Text style={styles.muted}>{wizard.issues.length} validation issues</Text>
            {wizard.imported ? <Text style={styles.muted}>{wizard.imported.users} users imported</Text> : null}
            <View style={styles.buttonRow}>
              <Pressable style={styles.smallAction} onPress={async () => token ? setWizard(await analyzeMobileMigration(token, wizard.id)) : undefined}>
                <Text style={styles.smallActionText}>Analyze</Text>
              </Pressable>
              <Pressable style={styles.smallAction} onPress={async () => token ? setWizard(await skipInvalidMobileRows(token, wizard.id)) : undefined}>
                <Text style={styles.smallActionText}>Skip</Text>
              </Pressable>
              <Pressable
                style={styles.smallAction}
                onPress={async () => {
                  if (token) {
                    setWizard(await commitMobileMigration(token, wizard.id));
                    await refresh(token);
                  }
                }}
              >
                <Text style={styles.smallActionText}>Commit</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <>
      <GradebookPanel lms={lms} />
      <AuditPanel activity={activity} />
    </>
  );
}

function OwnerView({
  dashboard,
  lms,
  people,
  refresh,
  section,
  setMessage,
  token
}: {
  dashboard: MobileDashboard;
  lms: MobileLmsOverview | null;
  people: MobilePerson[];
  refresh: (nextToken?: string | null) => Promise<void>;
  section: string;
  setMessage: (message: string) => void;
  token: string | null;
}) {
  const [school, setSchool] = useState({
    name: "Arete School",
    slug: "arete-school",
    adminName: "School Admin",
    adminEmail: "school.admin@arete.local"
  });

  if (section === "People") {
    return <PeoplePanel lms={lms} people={people} refresh={refresh} token={token} />;
  }

  if (section === "Schools" || section === "Overview") {
    return (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Schools</Text>
        <TextInput style={styles.input} value={school.name} onChangeText={(name) => setSchool((current) => ({ ...current, name }))} />
        <TextInput autoCapitalize="none" style={styles.input} value={school.slug} onChangeText={(slug) => setSchool((current) => ({ ...current, slug }))} />
        <TextInput style={styles.input} value={school.adminName} onChangeText={(adminName) => setSchool((current) => ({ ...current, adminName }))} />
        <TextInput autoCapitalize="none" style={styles.input} value={school.adminEmail} onChangeText={(adminEmail) => setSchool((current) => ({ ...current, adminEmail }))} />
        <Pressable
          style={styles.action}
          onPress={async () => {
            await createMobileSchool(school);
            setMessage(`Created ${school.slug}`);
            await refresh(token);
          }}
        >
          <Text style={styles.actionText}>Create school</Text>
        </Pressable>
        <View style={styles.rowCard}>
          <Text style={styles.taskTitle}>Total schools</Text>
          <Text style={styles.score}>{dashboard.platform.schools}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Analytics</Text>
      <View style={styles.rowCard}>
        <Text style={styles.taskTitle}>AI cost</Text>
        <Text style={styles.score}>${dashboard.platform.estimatedAiCostUsd}</Text>
      </View>
      <View style={styles.rowCard}>
        <Text style={styles.taskTitle}>Failed jobs</Text>
        <Text style={styles.score}>{dashboard.platform.failedJobs}</Text>
      </View>
    </View>
  );
}

function PeoplePanel({
  lms,
  people,
  refresh,
  token
}: {
  lms: MobileLmsOverview | null;
  people: MobilePerson[];
  refresh: (nextToken?: string | null) => Promise<void>;
  token: string | null;
}) {
  const students = people.filter((person) => person.roles.includes("student"));
  const parents = people.filter((person) => person.roles.includes("parent"));
  const firstClass = lms?.classes[0];
  const [person, setPerson] = useState({ displayName: "New Student", email: "new.student@arete.local", role: "student" });
  const [link, setLink] = useState({ parentUserId: parents[0]?.id ?? "", studentUserId: students[0]?.id ?? "" });

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>People</Text>
      <TextInput style={styles.input} value={person.displayName} onChangeText={(displayName) => setPerson((current) => ({ ...current, displayName }))} />
      <TextInput autoCapitalize="none" style={styles.input} value={person.email} onChangeText={(email) => setPerson((current) => ({ ...current, email }))} />
      <View style={styles.chipRow}>
        {["student", "teacher", "parent", "school_admin"].map((role) => (
          <Pressable key={role} style={person.role === role ? [styles.sectionChip, styles.activeSectionChip] : styles.sectionChip} onPress={() => setPerson((current) => ({ ...current, role }))}>
            <Text style={styles.sectionText}>{role}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        style={styles.action}
        onPress={async () => {
          if (token) {
            await createMobilePerson(token, { email: person.email, displayName: person.displayName, roles: [person.role] });
            await refresh(token);
          }
        }}
      >
        <Text style={styles.actionText}>Create person</Text>
      </Pressable>
      <View style={styles.buttonRow}>
        {parents.map((parent) => (
          <Pressable key={parent.id} style={link.parentUserId === parent.id ? [styles.sectionChip, styles.activeSectionChip] : styles.sectionChip} onPress={() => setLink((current) => ({ ...current, parentUserId: parent.id }))}>
            <Text style={styles.sectionText}>{parent.displayName}</Text>
          </Pressable>
        ))}
        {students.map((student) => (
          <Pressable key={student.id} style={link.studentUserId === student.id ? [styles.sectionChip, styles.activeSectionChip] : styles.sectionChip} onPress={() => setLink((current) => ({ ...current, studentUserId: student.id }))}>
            <Text style={styles.sectionText}>{student.displayName}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        style={styles.actionSecondary}
        onPress={async () => {
          if (token && link.parentUserId && link.studentUserId) {
            await linkMobileParent(token, link);
            await refresh(token);
          }
        }}
      >
        <Text style={styles.smallActionText}>Link parent</Text>
      </Pressable>
      <Pressable
        style={styles.actionSecondary}
        onPress={async () => {
          if (token && firstClass && link.studentUserId) {
            await enrollMobileStudent(token, { classId: firstClass.id, studentUserId: link.studentUserId });
            await refresh(token);
          }
        }}
      >
        <Text style={styles.smallActionText}>Enroll student</Text>
      </Pressable>
      {people.map((personRecord) => (
        <View style={styles.rowCard} key={personRecord.id}>
          <View style={styles.flex}>
            <Text style={styles.taskTitle}>{personRecord.displayName}</Text>
            <Text style={styles.muted}>{personRecord.email}</Text>
          </View>
          <Text style={styles.badge}>{personRecord.roles.join(", ")}</Text>
        </View>
      ))}
    </View>
  );
}

function MaterialsPanel({ materials }: { materials: MobileLmsOverview["materials"] }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Materials</Text>
      {materials.map((material) => (
        <View style={styles.rowCard} key={material.id}>
          <View style={styles.flex}>
            <Text style={styles.taskTitle}>{material.title}</Text>
            <Text style={styles.muted}>{material.kind} / {material.content}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function GradebookPanel({ lms }: { lms: MobileLmsOverview | null }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Gradebook</Text>
      {(lms?.gradebook ?? []).map((row) => (
        <View style={styles.blockCard} key={row.studentUserId}>
          <Text style={styles.taskTitle}>{row.studentName}</Text>
          <Text style={styles.muted}>{row.classes.join(", ") || "No class"}</Text>
          <View style={styles.metricRow}>
            <Metric icon="reader-outline" label="Assignments" value={`${row.assignmentsSubmitted}/${row.assignmentsTotal}`} />
            <Metric icon="stats-chart-outline" label="Quiz avg" value={`${row.quizAverage}%`} />
          </View>
          <Text style={styles.muted}>Missing {row.missingAssignments} / Practice {row.practiceAccuracy}% / Level {row.level}</Text>
        </View>
      ))}
    </View>
  );
}

function AttendancePanel({ lms }: { lms: MobileLmsOverview | null }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Attendance</Text>
      <View style={styles.metricRow}>
        <Metric icon="checkmark-done-outline" label="Present" value={String(lms?.attendanceSummary.present ?? 0)} />
        <Metric icon="pulse-outline" label="Rate" value={`${lms?.attendanceSummary.presentRate ?? 0}%`} />
      </View>
      {(lms?.attendance ?? []).slice(0, 12).map((record) => (
        <View style={styles.rowCard} key={record.id}>
          <View style={styles.flex}>
            <Text style={styles.taskTitle}>{record.studentName}</Text>
            <Text style={styles.muted}>{record.date} / {record.status}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function AttendanceManager({
  lms,
  refresh,
  token
}: {
  lms: MobileLmsOverview | null;
  refresh: (nextToken?: string | null) => Promise<void>;
  token: string | null;
}) {
  const firstClassId = lms?.classes[0]?.id ?? "";
  const [classId, setClassId] = useState(firstClassId);
  const activeClassId = classId || firstClassId;
  const roster = (lms?.enrollments ?? []).filter((enrollment) => enrollment.classId === activeClassId);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Attendance</Text>
      <View style={styles.chipRow}>
        {(lms?.classes ?? []).map((item) => (
          <Pressable
            key={item.id}
            onPress={() => setClassId(item.id)}
            style={activeClassId === item.id ? [styles.sectionChip, styles.activeSectionChip] : styles.sectionChip}
          >
            <Text style={styles.sectionText}>{item.name} {item.section}</Text>
          </Pressable>
        ))}
      </View>
      {roster.map((student) => (
        <View style={styles.blockCard} key={student.studentUserId}>
          <Text style={styles.taskTitle}>{student.studentName}</Text>
          <View style={styles.buttonRow}>
            {(["present", "absent", "late", "excused"] as const).map((status) => (
              <Pressable
                key={status}
                style={status === "present" ? styles.smallAction : styles.actionSecondary}
                onPress={async () => {
                  if (token) {
                    await markMobileAttendance(token, {
                      classId: activeClassId,
                      date: today,
                      records: [{ studentUserId: student.studentUserId, status }]
                    });
                    await refresh(token);
                  }
                }}
              >
                <Text style={styles.smallActionText}>{status}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
      <View style={styles.metricRow}>
        <Metric icon="checkmark-done-outline" label="Present" value={String(lms?.attendanceSummary.present ?? 0)} />
        <Metric icon="pulse-outline" label="Rate" value={`${lms?.attendanceSummary.presentRate ?? 0}%`} />
      </View>
    </View>
  );
}

function AuditPanel({ activity }: { activity: MobileActivity | null }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Audit</Text>
      {(activity?.auditEvents ?? []).slice(0, 8).map((event) => (
        <View style={styles.rowCard} key={event.id}>
          <View style={styles.flex}>
            <Text style={styles.taskTitle}>{event.action}</Text>
            <Text style={styles.muted}>{event.targetType}{event.targetId ? ` / ${event.targetId}` : ""}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function Metric({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Ionicons color="#3563ff" name={icon} size={22} />
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#f7f8ff",
    flex: 1
  },
  content: {
    gap: 16,
    padding: 18,
    paddingTop: 46
  },
  headerCard: {
    backgroundColor: "#ffffff",
    borderColor: "#111111",
    borderRadius: 8,
    borderWidth: 3,
    gap: 14,
    padding: 16,
    shadowColor: "#111111",
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0
  },
  headerTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12
  },
  headerText: {
    flex: 1
  },
  brandMark: {
    alignItems: "center",
    backgroundColor: "#fff3b0",
    borderColor: "#111111",
    borderRadius: 8,
    borderWidth: 3,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  brandLetter: {
    color: "#111111",
    fontSize: 20,
    fontWeight: "900"
  },
  title: {
    color: "#111111",
    fontSize: 28,
    fontWeight: "900"
  },
  muted: {
    color: "#57606a",
    fontSize: 12,
    fontWeight: "700"
  },
  label: {
    color: "#57606a",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  formStack: {
    gap: 8
  },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "#111111",
    borderRadius: 8,
    borderWidth: 3,
    color: "#17202a",
    minHeight: 44,
    paddingHorizontal: 12
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  chip: {
    backgroundColor: "#ffffff",
    borderColor: "#111111",
    borderRadius: 8,
    borderWidth: 3,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: 12
  },
  activeChip: {
    backgroundColor: "#fff3b0"
  },
  chipText: {
    color: "#111111",
    fontWeight: "900"
  },
  sectionChip: {
    backgroundColor: "#ffffff",
    borderColor: "#111111",
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: 10
  },
  activeSectionChip: {
    backgroundColor: "#eef6ff"
  },
  sectionText: {
    color: "#111111",
    fontSize: 12,
    fontWeight: "900"
  },
  action: {
    alignItems: "center",
    backgroundColor: "#1fb7a6",
    borderColor: "#111111",
    borderRadius: 8,
    borderWidth: 3,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 14
  },
  actionSecondary: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#111111",
    borderRadius: 8,
    borderWidth: 3,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 14
  },
  actionText: {
    color: "#111111",
    fontWeight: "900"
  },
  smallAction: {
    alignItems: "center",
    backgroundColor: "#fff3b0",
    borderColor: "#111111",
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: 10
  },
  smallActionText: {
    color: "#111111",
    fontWeight: "900"
  },
  metricRow: {
    flexDirection: "row",
    gap: 12
  },
  metric: {
    backgroundColor: "#ffffff",
    borderColor: "#111111",
    borderRadius: 8,
    borderWidth: 3,
    flex: 1,
    gap: 6,
    minHeight: 108,
    padding: 14
  },
  metricValue: {
    color: "#111111",
    fontSize: 24,
    fontWeight: "900"
  },
  panel: {
    backgroundColor: "#ffffff",
    borderColor: "#111111",
    borderRadius: 8,
    borderWidth: 3,
    gap: 12,
    padding: 16
  },
  panelTitle: {
    color: "#111111",
    fontSize: 21,
    fontWeight: "900"
  },
  rowCard: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#111111",
    borderRadius: 8,
    borderWidth: 2,
    flexDirection: "row",
    gap: 10,
    padding: 12
  },
  blockCard: {
    backgroundColor: "#eef6ff",
    borderColor: "#111111",
    borderRadius: 8,
    borderWidth: 2,
    gap: 10,
    padding: 12
  },
  flex: {
    flex: 1,
    gap: 3
  },
  taskTitle: {
    color: "#111111",
    fontWeight: "900"
  },
  score: {
    color: "#2f8f52",
    fontWeight: "900"
  },
  badge: {
    color: "#111111",
    fontSize: 11,
    fontWeight: "900",
    maxWidth: 120,
    textAlign: "right"
  },
  option: {
    backgroundColor: "#ffffff",
    borderColor: "#111111",
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: 12
  },
  selectedOption: {
    backgroundColor: "#fff3b0"
  },
  optionText: {
    color: "#111111",
    fontWeight: "800"
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  }
});
