import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MyAccount() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="profile" className="w-full max-w-md">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile">Update Profile</TabsTrigger>
          <TabsTrigger value="payment">Update Payment</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="John Doe" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" placeholder="john@example.com" type="email" />
            </div>
            <div>
              <Label htmlFor="cell">Cell</Label>
              <Input id="cell" placeholder="123-456-7890" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" placeholder="New password" type="password" />
            </div>
            <div>
              <Label htmlFor="dob">Date of Birth</Label>
              <Input id="dob" type="date" />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input id="address" placeholder="123 Main St" />
            </div>
            <Button className="w-full">Save Profile</Button>
          </div>
        </TabsContent>
        <TabsContent value="payment">
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="cardName">Name on Card</Label>
              <Input id="cardName" placeholder="John Doe" />
            </div>
            <div>
              <Label htmlFor="cardNumber">Card Number</Label>
              <Input id="cardNumber" placeholder="1234 5678 9012 3456" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="exp">Expiration</Label>
                <Input id="exp" placeholder="MM/YY" />
              </div>
              <div>
                <Label htmlFor="cvv">CVV</Label>
                <Input id="cvv" placeholder="123" />
              </div>
            </div>
            <div>
              <Label htmlFor="billingAddress">Billing Address</Label>
              <Input id="billingAddress" placeholder="123 Main St" />
            </div>
            <Button className="w-full">Save Payment</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
