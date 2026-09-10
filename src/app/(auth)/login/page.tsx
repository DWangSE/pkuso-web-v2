"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState("");

  /** 成员端已迁移至微信小程序：网页端仅允许管理员登录 */
  const MEMBER_BLOCKED_MSG = "成员端已迁移至微信小程序，网页端不再提供成员登录，请使用微信小程序。";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg("");

    if (!email.trim() || !password) {
      setErrorMsg("请输入邮箱和密码。");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setSubmitting(false);
      setErrorMsg(error.message || "登录失败，请稍后重试。");
      return;
    }

    // 管理员校验：非管理员立即登出并提示走小程序
    const { data: isAdmin, error: rpcError } = await supabase.rpc("is_admin");
    if (rpcError || !isAdmin) {
      await supabase.auth.signOut();
      setSubmitting(false);
      setErrorMsg(MEMBER_BLOCKED_MSG);
      return;
    }

    setSubmitting(false);
    router.replace("/");
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
          <div className="mb-4 text-center">
            <h1 className="text-xl font-semibold text-text">管理端登录</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="block text-label font-medium text-text-muted">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrorMsg("");
                }}
                className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm text-text outline-none focus:border-text-subtle"
                placeholder="name@example.com"
                autoComplete="email"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-label font-medium text-text-muted">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg("");
                }}
                className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm text-text outline-none focus:border-text-subtle"
                placeholder="请输入密码"
                autoComplete="current-password"
              />
            </div>

            {errorMsg ? (
              <div className="rounded-xl bg-danger-bg px-3 py-2 text-center text-sm text-danger">
                {errorMsg}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="mt-1 flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-md hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? "登录中…" : "登录"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
