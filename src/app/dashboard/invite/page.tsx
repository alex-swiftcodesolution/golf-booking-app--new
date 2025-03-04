import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Invite() {
  return (
    <div className="space-y-6">
      <div className="w-full max-w-md space-y-6 p-6">
        <h1 className="text-3xl font-bold text-center">Invite a New Member</h1>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="Jane Doe" />
          </div>
          <div>
            <Label htmlFor="cell">Cell</Label>
            <Input id="cell" placeholder="123-456-7890" />
          </div>
          <Button className="w-full">Send Invite</Button>
        </div>
      </div>
    </div>
  );
}
