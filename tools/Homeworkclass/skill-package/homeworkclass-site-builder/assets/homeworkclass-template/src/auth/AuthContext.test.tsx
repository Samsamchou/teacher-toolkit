// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./AuthContext";

const authHarness = vi.hoisted(() => ({
  listener: undefined as ((user: unknown) => void) | undefined,
  sessionDuringTokenExchange: null as string | null,
  signOut: vi.fn(async () => undefined),
}));

vi.mock("firebase/auth", () => ({
  browserLocalPersistence: { kind: "local" },
  browserSessionPersistence: { kind: "session" },
  onAuthStateChanged: vi.fn((_auth, listener: (user: unknown) => void) => {
    authHarness.listener = listener;
    listener(null);
    return () => undefined;
  }),
  setPersistence: vi.fn(async () => undefined),
  signInWithCustomToken: vi.fn(async () => {
    authHarness.sessionDuringTokenExchange = sessionStorage.getItem(
      "homeworkclass.teacher.session.v1",
    );
    authHarness.listener?.({ uid: "teacher" });
    return { user: { uid: "teacher" } };
  }),
  signOut: authHarness.signOut,
}));

vi.mock("firebase/functions", () => ({
  httpsCallable: vi.fn(() => async () => ({
    data: { customToken: "test-custom-token" },
  })),
}));

vi.mock("../services/firebaseClient", () => ({
  getFirebaseServices: () => ({ auth: {}, functions: {} }),
  isFirebaseConfigured: true,
}));

function AuthProbe() {
  const { authenticated, loading, signIn } = useAuth();
  return (
    <>
      <output aria-label="狀態">
        {loading ? "載入中" : authenticated ? "已登入" : "未登入"}
      </output>
      <button type="button" onClick={() => void signIn("0".repeat(6), false)}>
        測試登入
      </button>
    </>
  );
}

describe("Firebase 教師工作階段", () => {
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    authHarness.listener = undefined;
    authHarness.sessionDuringTokenExchange = null;
    authHarness.signOut.mockClear();
    vi.unstubAllEnvs();
  });

  it("在 Firebase 通知登入前先保存工作階段，避免立即登出", async () => {
    vi.stubEnv("VITE_DATA_MODE", "firebase");
    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByLabelText("狀態")).toHaveTextContent("未登入"));
    fireEvent.click(screen.getByRole("button", { name: "測試登入" }));

    await waitFor(() => expect(screen.getByLabelText("狀態")).toHaveTextContent("已登入"));
    expect(authHarness.sessionDuringTokenExchange).not.toBeNull();
    expect(authHarness.signOut).not.toHaveBeenCalled();
  });
});
