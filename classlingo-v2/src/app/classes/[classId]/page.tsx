import { redirect } from "next/navigation";

export default function ClassPage({ params }: { params: Promise<{ classId: string }> }) {
  // Redirect to weeks tab by default
  return redirect(`/classes/${params}/weeks`);
}
