import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function OpenDoor() {
  return (
    <div className="space-y-6">
      <div className="w-full max-w-md space-y-6 p-6">
        <h1 className="text-3xl font-bold text-center">Open the Door</h1>
        <div className="space-y-4">
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Choose a club" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="club1">Club 1</SelectItem>
              <SelectItem value="club2">Club 2</SelectItem>
              <SelectItem value="club3">Club 3</SelectItem>
            </SelectContent>
          </Select>
          <Button className="w-full">Open Door</Button>
        </div>
      </div>
    </div>
  );
}
