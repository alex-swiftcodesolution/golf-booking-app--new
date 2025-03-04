import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
  const accountStatus = "Good"; // Mock status (later from API)

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold mb-6">Member Dashboard</h1>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Account Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg">{accountStatus}</p>
          {accountStatus === "Good" ? (
            <div className="mt-4 space-y-2">
              <Button className="w-full">Open the Door</Button>
              <Button className="w-full" variant="outline">
                My Account
              </Button>
              <Button className="w-full" variant="outline">
                Book a Tee Time
              </Button>
              <Button className="w-full" variant="outline">
                My Tee Times
              </Button>
              <Button className="w-full" variant="outline">
                Invite New Member
              </Button>
            </div>
          ) : (
            <Button className="w-full mt-4">Update Payment</Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
