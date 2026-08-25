import { initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  getAuth,
  setPersistence,
  signInAnonymously,
  signInWithCustomToken,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  initializeFirestore,
  limit,
  orderBy,
  persistentLocalCache,
  persistentMultipleTabManager,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Firestore,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
  type FirebaseStorage,
} from "firebase/storage";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from "firebase/app-check";
import { getFunctions, httpsCallable } from "firebase/functions";

export type FirebaseServices = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
  appCheckEnabled: boolean;
};

export type TicketAttemptRecord = {
  attemptId: string;
  uid: string;
  studentId: string;
  unitId: "train-tickets";
  contentVersion: "tickets-v2";
  status: "in_progress" | "completed" | "pdf_pending";
  currentStep: number;
  passedSteps: number;
  score: number;
  errorCount: number;
  eventCount: number;
  travelDate: string | null;
  timeStart: string | null;
  timeEnd: string | null;
  origin: "ershui";
  destination: string | null;
  trainNumber: string | null;
  trainType: string | null;
  depart: string | null;
  arrive: string | null;
  durationMinutes: number | null;
  pdfPath: string | null;
  recordingPath: string | null;
  recordingStatus: "not_requested" | "unsupported" | "declined" | "recorded";
  practiceStartedAt: Timestamp | null;
  practiceDateTaipei: string | null;
  practiceDateStatus:
    | "server"
    | "server_backfill"
    | "unconfirmed";
  createdAtClient: string;
  completedAtClient: string | null;
  expiresAt: Timestamp;
};

export type TicketEventRecord = {
  seq: number;
  step: number;
  action: string;
  payload: Record<string, unknown>;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  clientElapsedMs: number;
  createdAtClient: string;
};

let servicesPromise: Promise<FirebaseServices> | null = null;

async function loadFirebaseConfig(): Promise<FirebaseOptions> {
  if (import.meta.env.VITE_FIREBASE_CONFIG) {
    return JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG) as FirebaseOptions;
  }

  const response = await fetch("/__/firebase/init.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(
      "尚未連接Firebase。請使用Firebase Hosting預覽，或設定VITE_FIREBASE_CONFIG。",
    );
  }
  try {
    return (await response.json()) as FirebaseOptions;
  } catch {
    throw new Error(
      "本機預覽尚未連接Firebase；請使用正式網站登入教師後台。",
    );
  }
}

export function getFirebaseServices(): Promise<FirebaseServices> {
  if (servicesPromise) return servicesPromise;
  servicesPromise = (async () => {
    const app = initializeApp(await loadFirebaseConfig());
    let appCheckEnabled = false;
    const appCheckSiteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY;
    if (appCheckSiteKey) {
      initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
      appCheckEnabled = true;
    }

    const auth = getAuth(app);
    let db: Firestore;
    try {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    } catch {
      db = initializeFirestore(app, {});
    }
    return {
      app,
      auth,
      db,
      storage: getStorage(app),
      appCheckEnabled,
    };
  })();
  return servicesPromise;
}

export async function ensureAnonymousUser(): Promise<{
  services: FirebaseServices;
  user: User;
}> {
  const services = await getFirebaseServices();
  if (services.auth.currentUser && !services.auth.currentUser.isAnonymous) {
    await signOut(services.auth);
  }
  await setPersistence(services.auth, browserLocalPersistence);
  await services.auth.authStateReady();

  if (!services.auth.currentUser?.isAnonymous) {
    await signInAnonymously(services.auth);
    await services.auth.authStateReady();
  }

  let activeUser = services.auth.currentUser;
  if (!activeUser?.isAnonymous) {
    throw new Error("匿名學生權杖同步失敗，請重新整理後再試。");
  }

  await activeUser.getIdToken(true);
  await new Promise((resolve) => window.setTimeout(resolve, 300));
  activeUser = services.auth.currentUser;
  if (!activeUser?.isAnonymous) {
    throw new Error("匿名學生權杖同步失敗，請重新整理後再試。");
  }
  return { services, user: activeUser };
}

export async function teacherSignIn(password: string) {
  const services = await getFirebaseServices();
  if (services.auth.currentUser && !services.auth.currentUser.isAnonymous) {
    await signOut(services.auth);
  }
  await setPersistence(services.auth, browserSessionPersistence);
  const anonymousUser =
    services.auth.currentUser ??
    (await signInAnonymously(services.auth)).user;
  if (!anonymousUser.isAnonymous) {
    throw new Error("無法建立安全的教師登入工作階段。");
  }
  const activateTeacherAccess = httpsCallable<
    { password: string },
    { customToken: string }
  >(
    getFunctions(services.app, "asia-east1"),
    "activateTeacherAccess",
  );
  const response = await activateTeacherAccess({ password });
  if (!response.data.customToken) {
    throw new Error("教師登入權杖建立失敗。");
  }
  await signOut(services.auth);
  const credential = await signInWithCustomToken(
    services.auth,
    response.data.customToken,
  );
  const token = await credential.user.getIdTokenResult(true);
  if (token.claims.teacher !== true) {
    await signOut(services.auth);
    throw new Error("教師權限驗證失敗。");
  }
  return { services, user: credential.user };
}

export async function teacherSignOut() {
  const services = await getFirebaseServices();
  await signOut(services.auth);
}

export async function createTicketAttempt(
  studentId: string,
  recordingStatus: TicketAttemptRecord["recordingStatus"],
) {
  const { services, user } = await ensureAnonymousUser();
  const createAttempt = httpsCallable<
    {
      studentId: string;
      recordingStatus: TicketAttemptRecord["recordingStatus"];
      createdAtClient: string;
    },
    {
      attemptId: string;
      uid: string;
      practiceDateTaipei: string;
      practiceStartedAtMillis: number;
      expiresAtMillis: number;
      recordingStatus: TicketAttemptRecord["recordingStatus"];
    }
  >(getFunctions(services.app, "asia-east1"), "createTicketAttemptV2");
  const createdAtClient = new Date().toISOString();
  const response = await createAttempt({
    studentId,
    recordingStatus,
    createdAtClient,
  });
  const attemptId = response.data.attemptId;
  const record: TicketAttemptRecord = {
    attemptId,
    uid: response.data.uid || user.uid,
    studentId,
    unitId: "train-tickets",
    contentVersion: "tickets-v2",
    status: "in_progress",
    currentStep: 1,
    passedSteps: 0,
    score: 0,
    errorCount: 0,
    eventCount: 0,
    travelDate: null,
    timeStart: null,
    timeEnd: null,
    origin: "ershui",
    destination: null,
    trainNumber: null,
    trainType: null,
    depart: null,
    arrive: null,
    durationMinutes: null,
    pdfPath: null,
    recordingPath: null,
    recordingStatus: response.data.recordingStatus,
    practiceStartedAt: Timestamp.fromMillis(
      response.data.practiceStartedAtMillis,
    ),
    practiceDateTaipei: response.data.practiceDateTaipei,
    practiceDateStatus: "server",
    createdAtClient,
    completedAtClient: null,
    expiresAt: Timestamp.fromMillis(response.data.expiresAtMillis),
  };
  return { services, user, attemptId, record };
}

export async function appendTicketEvent(
  attemptId: string,
  event: TicketEventRecord,
) {
  const services = await getFirebaseServices();
  const eventId = String(event.seq).padStart(5, "0");
  await setDoc(
    doc(services.db, "tickets-v2", attemptId, "events", eventId),
    {
      ...event,
      uid: services.auth.currentUser?.uid,
      createdAt: serverTimestamp(),
    },
  );
}

export async function updateTicketAttempt(
  attemptId: string,
  patch: Partial<TicketAttemptRecord>,
) {
  const services = await getFirebaseServices();
  await updateDoc(doc(services.db, "tickets-v2", attemptId), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export async function uploadAttemptPdf(
  uid: string,
  attemptId: string,
  pdf: Blob,
) {
  const services = await getFirebaseServices();
  const path = `tickets-v2/${uid}/${attemptId}/evidence.pdf`;
  const objectRef = ref(services.storage, path);
  await uploadBytes(objectRef, pdf, {
    contentType: "application/pdf",
    customMetadata: {
      attemptId,
      contentVersion: "tickets-v2",
    },
  });
  return path;
}

export async function uploadAttemptRecording(
  uid: string,
  attemptId: string,
  recording: Blob,
) {
  const services = await getFirebaseServices();
  const isMp4 = recording.type.toLowerCase().includes("mp4");
  const extension = isMp4 ? "mp4" : "webm";
  const path = `tickets-v2/${uid}/${attemptId}/screen-recording.${extension}`;
  await uploadBytes(ref(services.storage, path), recording, {
    contentType: recording.type || (isMp4 ? "video/mp4" : "video/webm"),
    customMetadata: { attemptId },
  });
  return path;
}

export async function listTicketAttempts(filters?: {
  studentId?: string;
  practiceDateTaipei?: string;
}) {
  const services = await getFirebaseServices();
  const constraints = [];
  if (filters?.practiceDateTaipei) {
    constraints.push(
      where("practiceDateTaipei", "==", filters.practiceDateTaipei),
    );
  } else if (filters?.studentId) {
    constraints.push(where("studentId", "==", filters.studentId));
  } else {
    constraints.push(orderBy("practiceStartedAt", "desc"));
  }
  constraints.push(limit(500));
  const snapshot = await getDocs(
    query(collection(services.db, "tickets-v2"), ...constraints),
  );
  return snapshot.docs
    .map((item) => item.data() as TicketAttemptRecord)
    .filter(
      (item) =>
        !filters?.studentId || item.studentId === filters.studentId,
    )
    .sort(
      (left, right) =>
        (right.practiceStartedAt?.toMillis?.() ?? 0) -
        (left.practiceStartedAt?.toMillis?.() ?? 0),
    );
}

export async function listTicketEvents(attemptId: string) {
  const services = await getFirebaseServices();
  const snapshot = await getDocs(
    query(
      collection(services.db, "tickets-v2", attemptId, "events"),
      orderBy("seq", "asc"),
    ),
  );
  return snapshot.docs.map((item) => item.data() as TicketEventRecord);
}

export async function getAttemptPdfUrl(path: string) {
  const services = await getFirebaseServices();
  return getDownloadURL(ref(services.storage, path));
}

export async function getAttemptRecordingUrl(path: string) {
  const services = await getFirebaseServices();
  return getDownloadURL(ref(services.storage, path));
}

export async function backfillPracticeDates() {
  const services = await getFirebaseServices();
  const backfill = httpsCallable<
    Record<string, never>,
    { scanned: number; updated: number; unconfirmed: number }
  >(getFunctions(services.app, "asia-east1"), "backfillPracticeDates");
  return (await backfill({})).data;
}

export async function deleteAttemptAsTeacher(record: TicketAttemptRecord) {
  const services = await getFirebaseServices();
  const events = await getDocs(
    collection(services.db, "tickets-v2", record.attemptId, "events"),
  );
  await Promise.all(events.docs.map((event) => deleteDoc(event.ref)));
  if (record.pdfPath) {
    await deleteObject(ref(services.storage, record.pdfPath)).catch(() => undefined);
  }
  if (record.recordingPath) {
    await deleteObject(ref(services.storage, record.recordingPath)).catch(
      () => undefined,
    );
  }
  await deleteDoc(doc(services.db, "tickets-v2", record.attemptId));
}

export async function addTeacherAudit(
  action: string,
  payload: Record<string, unknown>,
) {
  const services = await getFirebaseServices();
  await addDoc(collection(services.db, "teacher-audit-v2"), {
    action,
    payload,
    teacherUid: services.auth.currentUser?.uid,
    createdAtClient: new Date().toISOString(),
    createdAt: serverTimestamp(),
  });
}
