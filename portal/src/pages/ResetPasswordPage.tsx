import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@home/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [canReset, setCanReset] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setCanReset(true);
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) setCanReset(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    setSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setStatus("Password reset complete. You can now sign in.");
    setNewPassword("");
    await supabase.auth.signOut();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>set new password</CardTitle>
          <CardDescription>Open this page from the link in your email.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!canReset && (
            <p className="text-sm text-u-amber">
              Waiting for recovery session. Use the link from your email.
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">new password</Label>
              <Input
                id="new-password"
                type="password"
                minLength={8}
                required
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </div>

            {status && <p className="text-sm text-u-green">{status}</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={submitting || !canReset} className="w-full">
              {submitting ? "saving..." : "reset password"}
            </Button>
          </form>

          <Link
            to="/login"
            className="block text-center text-sm text-muted-foreground transition-opacity duration-[var(--d-drift)] hover:opacity-60"
          >
            back to login
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
