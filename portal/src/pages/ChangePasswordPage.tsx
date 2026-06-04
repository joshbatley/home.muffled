import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase, useSession } from "@home/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ChangePasswordPage() {
  const { user, logout, refreshUser, setForcePasswordChanged } = useSession();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!user) return <Navigate to="/login" replace />;
  const userId = user.id;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
    if (authError) {
      setError(authError.message);
      setSubmitting(false);
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ force_password_change: false })
      .eq("id", userId);

    setSubmitting(false);
    if (profileError) {
      setError(profileError.message);
      return;
    }

    setForcePasswordChanged();
    await refreshUser();
    navigate("/me", { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>change password</CardTitle>
          <CardDescription>Password change is required before continuing.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "updating..." : "update password"}
            </Button>
          </form>

          <Button type="button" variant="ghost" className="w-full" onClick={() => void logout()}>
            sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
