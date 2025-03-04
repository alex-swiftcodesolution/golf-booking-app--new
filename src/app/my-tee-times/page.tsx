import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MyTeeTimes() {
  const bookings = [
    { id: 1, time: "9:00 AM", date: "2023-10-20", location: "Location 1" },
  ]; // Mock data

  return (
    <div className="flex min-h-screen flex-col items-center p-6">
      <h1 className="text-3xl font-bold mb-6">My Tee Times</h1>
      <div className="w-full max-w-md space-y-4">
        {bookings.map((booking) => (
          <Card key={booking.id}>
            <CardHeader>
              <CardTitle>
                {booking.time} - {booking.date}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>{booking.location}</p>
              <div className="mt-2 space-x-2">
                <Button variant="outline">Edit</Button>
                <Button variant="destructive">Delete</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
