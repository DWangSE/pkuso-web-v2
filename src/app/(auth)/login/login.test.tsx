// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import LoginPage from "./page";
import { supabase } from "@/lib/supabase";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({}),
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "test-user-id" } }, error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
    })),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
  }),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("显示邮箱和密码输入框", () => {
    render(<LoginPage />);
    expect(screen.getByPlaceholderText("name@example.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("请输入密码")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "登录" })).toBeInTheDocument();
  });

  it("表单验证 - 邮箱为空", async () => {
    const { container } = render(<LoginPage />);
    fireEvent.change(screen.getByPlaceholderText("请输入密码"), {
      target: { value: "password123" },
    });
    const form = container.querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("请输入邮箱和密码。")).toBeInTheDocument();
    });
  });

  it("表单验证 - 密码为空", async () => {
    const { container } = render(<LoginPage />);
    fireEvent.change(screen.getByPlaceholderText("name@example.com"), {
      target: { value: "test@example.com" },
    });
    const form = container.querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("请输入邮箱和密码。")).toBeInTheDocument();
    });
  });

  it("登录成功调用 signInWithPassword", async () => {
    const { container } = render(<LoginPage />);
    fireEvent.change(screen.getByPlaceholderText("name@example.com"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("请输入密码"), {
      target: { value: "password123" },
    });
    const form = container.querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
    });
  });

  it("登录失败显示错误消息", async () => {
    (supabase.auth.signInWithPassword as Mock).mockResolvedValue({
      error: { message: "Invalid credentials" },
    });

    const { container } = render(<LoginPage />);
    fireEvent.change(screen.getByPlaceholderText("name@example.com"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("请输入密码"), {
      target: { value: "wrongpassword" },
    });
    const form = container.querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });
  });

  it("登录时禁用按钮", async () => {
    let resolveFn: () => void;
    (supabase.auth.signInWithPassword as Mock).mockImplementation(() => {
      return new Promise((resolve) => {
        resolveFn = () => resolve({ error: null });
      });
    });

    const { container } = render(<LoginPage />);
    fireEvent.change(screen.getByPlaceholderText("name@example.com"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("请输入密码"), {
      target: { value: "password123" },
    });
    const form = container.querySelector("form")!;
    fireEvent.submit(form);

    const buttons = screen.getAllByRole("button", { name: /登录/ });
    expect(buttons[0]).toBeDisabled();
    expect(buttons[0]).toHaveTextContent("登录中…");

    resolveFn!();
    await waitFor(() => {
      const updatedButtons = screen.getAllByRole("button", { name: /登录/ });
      expect(updatedButtons[0]).not.toBeDisabled();
    });
  });

  it("成员（非管理员）登录被拦截", async () => {
    (supabase.auth.signInWithPassword as Mock).mockResolvedValue({ error: null });
    (supabase.from as Mock).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { role: "member" }, error: null }),
    });

    const { container } = render(<LoginPage />);
    fireEvent.change(screen.getByPlaceholderText("name@example.com"), {
      target: { value: "member@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("请输入密码"), {
      target: { value: "password123" },
    });
    const form = container.querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("成员不允许进行web端登录")).toBeInTheDocument();
    });
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it("profile 查询出错时同样拦截并登出", async () => {
    (supabase.auth.signInWithPassword as Mock).mockResolvedValue({ error: null });
    (supabase.from as Mock).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } }),
    });

    const { container } = render(<LoginPage />);
    fireEvent.change(screen.getByPlaceholderText("name@example.com"), {
      target: { value: "member@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("请输入密码"), {
      target: { value: "password123" },
    });
    const form = container.querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("成员不允许进行web端登录")).toBeInTheDocument();
    });
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});
