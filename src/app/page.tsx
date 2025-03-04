import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
      <h1 className="text-4xl font-bold mb-6">Welcome to Club Membership</h1>
      <Button asChild>
        <Link href="/login">Login</Link>
      </Button>
    </div>
  );
}
