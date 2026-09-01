import { redirect } from "next/navigation";
import { auth } from "@/auth";
import OnboardingWizard from "./OnboardingWizard";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  return <OnboardingWizard />;
}
