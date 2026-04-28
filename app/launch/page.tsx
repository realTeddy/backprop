import { redirect } from "next/navigation";
import { PwaLaunchResume } from "@/components/pwa-launch-resume";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function LaunchPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center justify-center px-6">
      <PwaLaunchResume />
    </main>
  );
}
