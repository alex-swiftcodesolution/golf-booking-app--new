import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function BookTeeTime() {
  return (
    <div className="flex min-h-screen flex-col items-center p-6">
      <h1 className="text-3xl font-bold mb-6">Book a Tee Time</h1>
      <div className="w-full max-w-md space-y-6">
        {/* Location */}
        <div>
          <Label>Choose Location</Label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select a location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="loc1">Location 1</SelectItem>
              <SelectItem value="loc2">Location 2</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date */}
        <div>
          <Label htmlFor="date">Choose Date</Label>
          <Input id="date" type="date" />
        </div>

        {/* Schedule (Mock) */}
        <div>
          <Label>Available Times</Label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            <Button variant="outline">9:00 AM</Button>
            <Button variant="outline">9:30 AM</Button>
            <Button variant="outline">10:00 AM</Button>
          </div>
        </div>

        {/* Duration */}
        <div>
          <Label>Duration</Label>
          <RadioGroup defaultValue="1hr" className="flex space-x-4 mt-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="1hr" id="1hr" />
              <Label htmlFor="1hr">1 hr</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="2hr" id="2hr" />
              <Label htmlFor="2hr">2 hr</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="3hr" id="3hr" />
              <Label htmlFor="3hr">3 hr</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="4hr" id="4hr" />
              <Label htmlFor="4hr">4 hr</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Guests */}
        <div>
          <Label>Bring a Guest</Label>
          <div className="flex space-x-2 mt-2">
            <Button variant="outline">1</Button>
            <Button variant="outline">2</Button>
            <Button variant="outline">3</Button>
          </div>
          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="guest1Name">Guest 1 Name</Label>
              <Input id="guest1Name" placeholder="Guest Name" />
              <Label htmlFor="guest1Cell">Guest 1 Cell</Label>
              <Input id="guest1Cell" placeholder="123-456-7890" />
            </div>
          </div>
        </div>

        {/* Itinerary */}
        <Button className="w-full">Confirm Booking</Button>
      </div>
    </div>
  );
}
